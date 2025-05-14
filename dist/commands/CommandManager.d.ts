import { MusicBot } from "../core/MusicBot";
/**
 * Represents the context in which a command is executed.
 * This will likely be passed from the main MusicBot instance.
 */
export interface CommandContext {
    musicBot: MusicBot;
}
export interface CommandArgument {
    name: string;
    description: string;
    required: boolean;
    type: "string" | "number" | "boolean" | "user" | "channel";
}
export interface Command {
    name: string;
    aliases?: string[];
    description: string;
    usage?: string;
    category?: string;
    args?: CommandArgument[];
    execute: (context: CommandContext, args: string[]) => Promise<void | string | object>;
}
export declare class CommandManager {
    private commands;
    private aliases;
    constructor();
    registerCommand(command: Command): void;
    getCommand(name: string): Command | undefined;
    getAllCommands(): Command[];
    /**
     * Parses a raw message string and attempts to execute a command.
     * @param {CommandContext} context The context for command execution.
     * @param {any} rawMessage The raw message content. Should be a string (e.g., "!play some song").
     * @param {string} prefix The command prefix (e.g., "!").
     */
    handleMessage(context: CommandContext, rawMessage: any, prefix: string): Promise<void>;
}
