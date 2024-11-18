import {
  LogLevelEnum,
  type TApplicationCache,
  type TCustomEmbedBuilder,
  type TLoggerOptions,
  type TPrepareLogMessageOptions,
  type TLogLevel
} from "Typings";
import { Collection, ForumChannel, ThreadChannel } from "discord.js";
import chalk from "chalk";
import config from "@Config";
import { CustomEmbedBuilder } from "@Structures";

// Constants
const LOG_LEVEL_FORMATTING = {
  [LogLevelEnum.SUCCESS]: {
    emoji: "✅",
    label: "Success",
    color: "greenBright",
    embedColor: (config: any) => config.misc.embedColors.green
  },
  [LogLevelEnum.WARN]: {
    emoji: "⚠️",
    label: "Warning",
    color: "yellowBright",
    embedColor: (config: any) => config.misc.embedColors.yellow
  },
  [LogLevelEnum.INFO]: {
    emoji: "ℹ️",
    label: "Info",
    color: "blueBright",
    embedColor: (config: any) => config.misc.embedColors.blue
  },
  [LogLevelEnum.DEBUG]: {
    emoji: "🐛",
    label: "Debug",
    color: "magentaBright",
    embedColor: (config: any) => config.misc.embedColors.purple
  },
  [LogLevelEnum.ERROR]: {
    emoji: "❌",
    label: "Error",
    color: "redBright",
    embedColor: (config: any) => config.misc.embedColors.red
  }
} as const;

// Application Cache
export const applicationCache: TApplicationCache = {
  logPaths: {
    current: `./Logs/${Date.now()}`,
    latest: "./Logs/latest",
  },
  Channels: {
    ThreadChannels: new Collection<string, ThreadChannel>(),
    ForumChannels: new Collection<string, ForumChannel>(),
  },
  isNewSession: true,
};

// Utility function to format date
const formatDate = (colorize: boolean): string => {
  const timeString = new Date().toLocaleTimeString();
  return colorize ? chalk.grey(timeString) : timeString;
};

// Prepare log message with improved type safety and formatting
export const prepareLogMessage = ({
  message,
  level,
  colorize
}: TPrepareLogMessageOptions): string => {
  const date = formatDate(colorize);
  const formatting = LOG_LEVEL_FORMATTING[level];
  
  if (!formatting) {
    throw new Error(`Invalid log level: ${level}`);
  }

  const { emoji, label, color } = formatting;
  const levelText = `${emoji} ${label}`;
  const formattedLevel = colorize
    ? (chalk[color] as any)(chalk.underline(levelText))
    : levelText;

  return `[${date}] ${formattedLevel} >> ${message}`;
};

// Generate embed for logging with improved type safety
export const generateLogEmbed = ({
  message,
  level
}: TLoggerOptions): TCustomEmbedBuilder => {
  const formatting = LOG_LEVEL_FORMATTING[level];
  
  if (!formatting) {
    throw new Error(`Invalid log level: ${level}`);
  }

  const embed = new CustomEmbedBuilder({
    timestamp: "NoTimestamp",
    color: formatting.embedColor(config),
    description: `\`\`\`\n${message}\`\`\``,
  });

  return embed;
};

// Logger class for better encapsulation
export class Logger {
  private static instance: Logger;
  
  private constructor() {}
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public async log(options: TLoggerOptions): Promise<void> {
    const consoleMessage = prepareLogMessage({
      ...options,
      colorize: true
    });
    
    console.log(consoleMessage);
    
    // Additional logging logic can be added here
    // e.g., writing to file, sending to Discord, etc.
  }

  public async logToFile(message: string, filePath: string): Promise<void> {
    // Implement file logging logic
  }

  public async logToDiscord(options: TLoggerOptions): Promise<void> {
    const embed = generateLogEmbed(options);
    // Implement Discord logging logic
  }
}

export { Asra } from "./";
