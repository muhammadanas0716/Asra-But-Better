import {
	EventTypeEnum,
	type TExtendedClient,
	type TImportFileOptions,
} from "Typings";
import type { ClientEvents, ClientOptions, RestEvents } from "discord.js";
import { Client } from "discord.js";
import { glob } from "glob";
import { relative as relativePath, resolve as resolvePath } from "node:path";
import { ClientEvent, RestEvent } from "@Structures";

export default class ExtendedClient extends Client implements TExtendedClient {
	private readonly eventHandlers: Map<string, ClientEvent | RestEvent> = new Map();

	public constructor(options: ClientOptions) {
			super(options);
	}

	public async initialize(): Promise<void> {
			try {
					await Promise.all([
							this.__loadEvents(EventTypeEnum.CLIENT_EVENT),
							this.__loadEvents(EventTypeEnum.REST_EVENT)
					]);

					const token = Bun.env["ENVIRONMENT"] === "production"
							? Bun.env["PRODUCTION_TOKEN"]
							: Bun.env["DEVELOPMENT_TOKEN"];

					if (!token) {
							throw new Error(`Missing ${Bun.env["ENVIRONMENT"]} token in environment variables`);
					}

					await this.login(token);
			} catch (error) {
					console.error('Failed to initialize client:', error);
					throw error;
			}
	}

	private async __importFile<T>(options: TImportFileOptions): Promise<T> {
			try {
					const file = options.filePath.endsWith(".json")
							? await import(options.filePath, { assert: { type: "json" } })
							: await import(options.filePath);

					return options.default ? file.default : file;
			} catch (error) {
					console.error(`Failed to import file ${options.filePath}:`, error);
					throw error;
			}
	}

	private async __loadEvents(option: EventTypeEnum): Promise<void> {
			const basePath = `${__dirname}/../Events`;
			const eventPath = option === EventTypeEnum.CLIENT_EVENT
					? resolvePath(`${basePath}/ClientEvents`)
					: resolvePath(`${basePath}/RestEvents`);

			try {
					const eventFiles = await glob(`${eventPath}/*.ts`);
					
					await Promise.all(eventFiles.map(async (eventFile) => {
							const filePath = relativePath(
									__dirname,
									resolvePath(eventFile)
							).replaceAll("\\", "/");

							const Event = await this.__importFile<new () => ClientEvent | RestEvent>({
									filePath,
									default: true,
							});

							const event = new Event();
							
							if (!event.EventName) {
									console.warn(`Event file ${filePath} has no event name`);
									return;
							}

							// Store the event handler for potential cleanup later
							this.eventHandlers.set(event.eventName, event);

							if (event instanceof RestEvent) {
									this.rest.on(event.eventName as keyof RestEvents, event.onTrigger.bind(event));
							} else if (event instanceof ClientEvent) {
									this.on(event.eventName as keyof ClientEvents, event.onTrigger.bind(event));
							}

							await event.onLoad();
					}));
			} catch (error) {
					console.error(`Failed to load ${option} events:`, error);
					throw error;
			}
	}

	public getEventHandler(eventName: string): ClientEvent | RestEvent | undefined {
			return this.eventHandlers.get(eventName);
	}

	public async reloadEvent(eventName: string): Promise<boolean> {
			const handler = this.getEventHandler(eventName);
			if (!handler) return false;

			try {
					// Remove old event listener
					if (handler instanceof RestEvent) {
							this.rest.off(handler.eventName as keyof RestEvents, handler.onTrigger);
					} else if (handler instanceof ClientEvent) {
							this.off(handler.eventName as keyof ClientEvents, handler.onTrigger);
					}

					// Reload the event file
					const Event = await this.__importFile<new () => ClientEvent | RestEvent>({
							filePath: handler.constructor.name,
							default: true,
					});

					const newEvent = new Event();
					this.eventHandlers.set(eventName, newEvent);

					// Add new event listener
					if (newEvent instanceof RestEvent) {
							this.rest.on(newEvent.eventName as keyof RestEvents, newEvent.onTrigger.bind(newEvent));
					} else if (newEvent instanceof ClientEvent) {
							this.on(newEvent.eventName as keyof ClientEvents, newEvent.onTrigger.bind(newEvent));
					}

					await newEvent.onLoad();
					return true;
			} catch (error) {
					console.error(`Failed to reload event ${eventName}:`, error);
					return false;
			}
	}

	public async destroy(): Promise<void> {
			// Clean up all event handlers
			for (const [eventName, handler] of this.eventHandlers) {
					if (handler instanceof RestEvent) {
							this.rest.off(handler.eventName as keyof RestEvents, handler.onTrigger);
					} else if (handler instanceof ClientEvent) {
							this.off(handler.eventName as keyof ClientEvents, handler.onTrigger);
					}
			}
			this.eventHandlers.clear();
			
			await super.destroy();
	}
}
