import { MusicBot } from "../core/MusicBot"; // Adjust path as needed

/**
 * Represents the context in which a command is executed.
 * This will likely be passed from the main MusicBot instance.
 */
export interface CommandContext {
  musicBot: MusicBot;
  // guildId: string; // If the bot is multi-guild, this is essential
  // channelId: string; // Channel where the command was invoked
  // userId: string; // User who invoked the command
  // Any other relevant context, like a message object from a specific platform (Discord.js Message, etc.)
}

export interface CommandArgument {
  name: string;
  description: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "user" | "channel"; // Example types
}

export interface Command {
  name: string; // The primary name of the command (e.g., "play")
  aliases?: string[]; // Alternative names (e.g., ["p", "start"])
  description: string;
  usage?: string; // Example: "!play <song name or URL>"
  category?: string; // e.g., "music", "admin", "general"
  args?: CommandArgument[];
  // permissions?: string[]; // Permissions required to run the command
  // cooldown?: number; // Cooldown in seconds
  execute: (context: CommandContext, args: string[]) => Promise<void | string | object>; // Return type can be flexible
}

export class CommandManager {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map(); // Maps alias to primary command name

  constructor() {}

  public registerCommand(command: Command): void {
    if (this.commands.has(command.name)) {
      console.warn(`Command "${command.name}" is already registered. Overwriting.`);
    }
    this.commands.set(command.name.toLowerCase(), command);

    if (command.aliases) {
      command.aliases.forEach(alias => {
        if (this.aliases.has(alias)) {
          console.warn(`Alias "${alias}" for command "${command.name}" is already registered for another command. Overwriting.`);
        }
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      });
    }
    console.log(`Command registered: ${command.name}`);
  }

  public getCommand(name: string): Command | undefined {
    const commandName = name.toLowerCase();
    if (this.commands.has(commandName)) {
      return this.commands.get(commandName);
    }
    if (this.aliases.has(commandName)) {
      const primaryName = this.aliases.get(commandName)!;
      return this.commands.get(primaryName);
    }
    return undefined;
  }

  public getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Parses a raw message string and attempts to execute a command.
   * @param {CommandContext} context The context for command execution.
   * @param {string} rawMessage The raw message string (e.g., "!play some song").
   * @param {string} prefix The command prefix (e.g., "!").
   */
  public async handleMessage(context: CommandContext, rawMessage: string, prefix: string): Promise<void> {
    if (!rawMessage.startsWith(prefix)) {
      return; // Not a command
    }

    const args = rawMessage.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) {
      return; // No command name provided
    }

    const command = this.getCommand(commandName);

    if (command) {
      try {
        // Basic argument validation (can be expanded based on command.args definition)
        if (command.args) {
            let currentArgIndex = 0;
            for (const argDef of command.args) {
                if (argDef.required && !args[currentArgIndex]) {
                    // musicBot.sendMessage(context.channelId, `Missing required argument: ${argDef.name}. Usage: ${command.usage || command.name}`);
                    console.error(`Missing required argument: ${argDef.name} for command ${command.name}`);
                    context.musicBot.emit("commandError", command, new Error(`Missing required argument: ${argDef.name}`), context);
                    return;
                }
                // Further type checking can be added here
                currentArgIndex++;
            }
        }
        await command.execute(context, args);
        context.musicBot.emit("commandExecuted", command, context);
      } catch (error) {
        console.error(`Error executing command "${command.name}":`, error);
        // musicBot.sendMessage(context.channelId, `An error occurred while executing ${command.name}.`);
        context.musicBot.emit("commandError", command, error as Error, context);
      }
    } else {
      // musicBot.sendMessage(context.channelId, `Unknown command: ${commandName}`);
      context.musicBot.emit("unknownCommand", commandName, context);
      console.log(`Unknown command: ${commandName}`);
    }
  }
}

