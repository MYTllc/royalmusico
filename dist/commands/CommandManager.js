"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandManager = void 0;
class CommandManager {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map(); // Maps alias to primary command name
    }
    registerCommand(command) {
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
    getCommand(name) {
        const commandName = name.toLowerCase();
        if (this.commands.has(commandName)) {
            return this.commands.get(commandName);
        }
        if (this.aliases.has(commandName)) {
            const primaryName = this.aliases.get(commandName);
            return this.commands.get(primaryName);
        }
        return undefined;
    }
    getAllCommands() {
        return Array.from(this.commands.values());
    }
    /**
     * Parses a raw message string and attempts to execute a command.
     * @param {CommandContext} context The context for command execution.
     * @param {any} rawMessage The raw message content. Should be a string (e.g., "!play some song").
     * @param {string} prefix The command prefix (e.g., "!").
     */
    handleMessage(context, rawMessage, prefix) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let messageContent;
            if (typeof rawMessage === 'string') {
                messageContent = rawMessage;
            }
            else if (rawMessage && typeof rawMessage.content === 'string') {
                // Attempt to extract content if it's an object with a 'content' property (e.g., Discord.js Message)
                messageContent = rawMessage.content;
                context.musicBot.emit("debug", "Received message object, extracted content for command processing.", rawMessage, context);
            }
            else {
                console.error("CommandManager Error: rawMessage is not a string and does not have a .content property. Received:", rawMessage);
                context.musicBot.emit("commandError", null, new Error(`Invalid message format received by CommandManager. Expected string or object with 'content' property.`), context);
                return;
            }
            if (!messageContent.startsWith(prefix)) {
                return; // Not a command
            }
            const args = messageContent.slice(prefix.length).trim().split(/\s+/);
            const commandName = (_a = args.shift()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
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
                    yield command.execute(context, args);
                    context.musicBot.emit("commandExecuted", command, context);
                }
                catch (error) {
                    console.error(`Error executing command "${command.name}":`, error);
                    context.musicBot.emit("commandError", command, error, context);
                }
            }
            else {
                context.musicBot.emit("unknownCommand", commandName, context);
                console.log(`Unknown command: ${commandName}`);
            }
        });
    }
}
exports.CommandManager = CommandManager;
