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
const CommandManager_1 = require("../CommandManager");
// Mock MusicBot for CommandContext
const mockMusicBot = {
    emit: jest.fn(),
    // Add other properties/methods of MusicBot that CommandManager or commands might use
    // For example, if commands access queueManager or audioPlayer directly from musicBot instance:
    // queueManager: mockQueueManager, 
    // audioPlayer: mockAudioPlayer,
};
const mockContext = {
    musicBot: mockMusicBot,
    // guildId: "testGuild",
    // channelId: "testChannel",
    // userId: "testUser",
};
const mockCommand = {
    name: "testcmd",
    aliases: ["tc"],
    description: "A test command",
    execute: jest.fn().mockResolvedValue("Test command executed"),
};
const mockCommandWithArgs = {
    name: "argcmd",
    description: "A test command with args",
    args: [
        { name: "arg1", description: "First argument", required: true, type: "string" },
        { name: "arg2", description: "Second argument", required: false, type: "number" },
    ],
    execute: jest.fn().mockImplementation((ctx, args) => __awaiter(void 0, void 0, void 0, function* () { return `Executed with ${args.join(", ")}`; })),
};
describe("CommandManager", () => {
    let commandManager;
    beforeEach(() => {
        commandManager = new CommandManager_1.CommandManager();
        // Reset mocks for each test
        jest.clearAllMocks();
        // Re-register commands if they are not re-created with each CommandManager instance
        commandManager.registerCommand(mockCommand);
        commandManager.registerCommand(mockCommandWithArgs);
    });
    test("should register a command", () => {
        const cmd = commandManager.getCommand("testcmd");
        expect(cmd).toBeDefined();
        expect(cmd === null || cmd === void 0 ? void 0 : cmd.name).toBe("testcmd");
    });
    test("should register command aliases", () => {
        const cmdFromAlias = commandManager.getCommand("tc");
        expect(cmdFromAlias).toBeDefined();
        expect(cmdFromAlias === null || cmdFromAlias === void 0 ? void 0 : cmdFromAlias.name).toBe("testcmd");
    });
    test("should return undefined for an unknown command", () => {
        const cmd = commandManager.getCommand("unknowncmd");
        expect(cmd).toBeUndefined();
    });
    test("should get all registered commands", () => {
        const allCommands = commandManager.getAllCommands();
        expect(allCommands.length).toBe(2); // mockCommand and mockCommandWithArgs
        expect(allCommands).toContain(mockCommand);
        expect(allCommands).toContain(mockCommandWithArgs);
    });
    test("should handle a message and execute a command", () => __awaiter(void 0, void 0, void 0, function* () {
        yield commandManager.handleMessage(mockContext, "!testcmd", "!");
        expect(mockCommand.execute).toHaveBeenCalledWith(mockContext, []);
        expect(mockMusicBot.emit).toHaveBeenCalledWith("commandExecuted", mockCommand, mockContext);
    }));
    test("should handle a message with arguments and execute a command", () => __awaiter(void 0, void 0, void 0, function* () {
        yield commandManager.handleMessage(mockContext, "!argcmd hello 123", "!");
        expect(mockCommandWithArgs.execute).toHaveBeenCalledWith(mockContext, ["hello", "123"]);
        expect(mockMusicBot.emit).toHaveBeenCalledWith("commandExecuted", mockCommandWithArgs, mockContext);
    }));
    test("should not execute if prefix does not match", () => __awaiter(void 0, void 0, void 0, function* () {
        yield commandManager.handleMessage(mockContext, "?testcmd", "!");
        expect(mockCommand.execute).not.toHaveBeenCalled();
    }));
    test("should emit unknownCommand for a non-existent command", () => __awaiter(void 0, void 0, void 0, function* () {
        yield commandManager.handleMessage(mockContext, "!unknown", "!");
        expect(mockCommand.execute).not.toHaveBeenCalled();
        expect(mockMusicBot.emit).toHaveBeenCalledWith("unknownCommand", "unknown", mockContext);
    }));
    test("should emit commandError if command execution fails", () => __awaiter(void 0, void 0, void 0, function* () {
        const error = new Error("Execution failed");
        mockCommand.execute.mockRejectedValueOnce(error);
        yield commandManager.handleMessage(mockContext, "!testcmd", "!");
        expect(mockMusicBot.emit).toHaveBeenCalledWith("commandError", mockCommand, error, mockContext);
    }));
    test("should emit commandError if required arguments are missing", () => __awaiter(void 0, void 0, void 0, function* () {
        yield commandManager.handleMessage(mockContext, "!argcmd", "!"); // Missing required arg1
        expect(mockCommandWithArgs.execute).not.toHaveBeenCalled();
        expect(mockMusicBot.emit).toHaveBeenCalledWith("commandError", mockCommandWithArgs, expect.any(Error), // Check for an Error object
        mockContext);
        // Optionally check the error message if it's specific
        const emittedError = mockMusicBot.emit.mock.calls.find(call => call[0] === "commandError")[2];
        expect(emittedError.message).toContain("Missing required argument: arg1");
    }));
    test("should handle commands with optional arguments correctly", () => __awaiter(void 0, void 0, void 0, function* () {
        yield commandManager.handleMessage(mockContext, "!argcmd onlyfirstarg", "!");
        expect(mockCommandWithArgs.execute).toHaveBeenCalledWith(mockContext, ["onlyfirstarg"]);
        expect(mockMusicBot.emit).toHaveBeenCalledWith("commandExecuted", mockCommandWithArgs, mockContext);
    }));
});
