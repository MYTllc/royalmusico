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
        console.log(`Command registered: ${command.name}`);
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
     * @param {string} rawMessage The raw message string (e.g., "!play some song").
     * @param {string} prefix The command prefix (e.g., "!").
     */
    handleMessage(context, rawMessage, prefix) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!rawMessage.startsWith(prefix)) {
                return; // Not a command
            }
            const args = rawMessage.slice(prefix.length).trim().split(/\s+/);
            const commandName = (_a = args.shift()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
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
                    yield command.execute(context, args);
                    context.musicBot.emit("commandExecuted", command, context);
                }
                catch (error) {
                    console.error(`Error executing command "${command.name}":`, error);
                    // musicBot.sendMessage(context.channelId, `An error occurred while executing ${command.name}.`);
                    context.musicBot.emit("commandError", command, error, context);
                }
            }
            else {
                // musicBot.sendMessage(context.channelId, `Unknown command: ${commandName}`);
                context.musicBot.emit("unknownCommand", commandName, context);
                console.log(`Unknown command: ${commandName}`);
            }
        });
    }
}
exports.CommandManager = CommandManager;
