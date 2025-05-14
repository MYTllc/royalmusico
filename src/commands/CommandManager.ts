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
    // console.log(`Command registered: ${command.name}`); // Reduced console noise for library use
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
   * @param {any} rawMessage The raw message content. Should be a string (e.g., "!play some song").
   * @param {string} prefix The command prefix (e.g., "!").
   */
  public async handleMessage(context: CommandContext, rawMessage: any, prefix: string): Promise<void> {
    let messageContent: string;

    if (typeof rawMessage === 'string') {
      messageContent = rawMessage;
    } else if (rawMessage && typeof rawMessage.content === 'string') {
      // Attempt to extract content if it's an object with a 'content' property (e.g., Discord.js Message)
      messageContent = rawMessage.content;
      context.musicBot.emit("debug", "Received message object, extracted content for command processing.", rawMessage, context);
    } else {
      console.error("CommandManager Error: rawMessage is not a string and does not have a .content property. Received:", rawMessage);
      context.musicBot.emit("commandError", null, new Error(`Invalid message format received by CommandManager. Expected string or object with 'content' property.`), context);
      return;
    }

    if (!messageContent.startsWith(prefix)) {
      return; // Not a command
    }

    const args = messageContent.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) {
      return; // No command name provided
    }

    const command = this.getCommand(commandName);

    if (command) {
      try {
        if (command.args) {
            let currentArgIndex = 0;
            for (const argDef of command.args) {
                if (argDef.required && !args[currentArgIndex]) {
                    console.error(`Missing required argument: ${argDef.name} for command ${command.name}`);
                    context.musicBot.emit("commandError", command, new Error(`Missing required argument: ${argDef.name}. Usage: ${command.usage || command.name}`), context);
                    return;
                }
                currentArgIndex++;
            }
        }
        await command.execute(context, args);
        context.musicBot.emit("commandExecuted", command, context);
      } catch (error) {
        console.error(`Error executing command "${command.name}":`, error);
        context.musicBot.emit("commandError", command, error as Error, context);
      }
    } else {
      context.musicBot.emit("unknownCommand", commandName, context);
      console.log(`Unknown command: ${commandName}`);
    }
  }
}

