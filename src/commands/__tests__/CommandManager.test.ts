import { CommandManager, Command, CommandContext } from "../CommandManager";
import { MusicBot } from "../../core/MusicBot"; // Mock or use a simplified version

// Mock MusicBot for CommandContext
const mockMusicBot = {
  emit: jest.fn(),
  // Add other properties/methods of MusicBot that CommandManager or commands might use
  // For example, if commands access queueManager or audioPlayer directly from musicBot instance:
  // queueManager: mockQueueManager, 
  // audioPlayer: mockAudioPlayer,
} as unknown as MusicBot;

const mockContext: CommandContext = {
  musicBot: mockMusicBot,
  // guildId: "testGuild",
  // channelId: "testChannel",
  // userId: "testUser",
};

const mockCommand: Command = {
  name: "testcmd",
  aliases: ["tc"],
  description: "A test command",
  execute: jest.fn().mockResolvedValue("Test command executed"),
};

const mockCommandWithArgs: Command = {
  name: "argcmd",
  description: "A test command with args",
  args: [
    { name: "arg1", description: "First argument", required: true, type: "string" },
    { name: "arg2", description: "Second argument", required: false, type: "number" },
  ],
  execute: jest.fn().mockImplementation(async (ctx, args) => `Executed with ${args.join(", ")}`),
};

describe("CommandManager", () => {
  let commandManager: CommandManager;

  beforeEach(() => {
    commandManager = new CommandManager();
    // Reset mocks for each test
    jest.clearAllMocks(); 
    // Re-register commands if they are not re-created with each CommandManager instance
    commandManager.registerCommand(mockCommand);
    commandManager.registerCommand(mockCommandWithArgs);
  });

  test("should register a command", () => {
    const cmd = commandManager.getCommand("testcmd");
    expect(cmd).toBeDefined();
    expect(cmd?.name).toBe("testcmd");
  });

  test("should register command aliases", () => {
    const cmdFromAlias = commandManager.getCommand("tc");
    expect(cmdFromAlias).toBeDefined();
    expect(cmdFromAlias?.name).toBe("testcmd");
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

  test("should handle a message and execute a command", async () => {
    await commandManager.handleMessage(mockContext, "!testcmd", "!");
    expect(mockCommand.execute).toHaveBeenCalledWith(mockContext, []);
    expect(mockMusicBot.emit).toHaveBeenCalledWith("commandExecuted", mockCommand, mockContext);
  });

  test("should handle a message with arguments and execute a command", async () => {
    await commandManager.handleMessage(mockContext, "!argcmd hello 123", "!");
    expect(mockCommandWithArgs.execute).toHaveBeenCalledWith(mockContext, ["hello", "123"]);
    expect(mockMusicBot.emit).toHaveBeenCalledWith("commandExecuted", mockCommandWithArgs, mockContext);
  });

  test("should not execute if prefix does not match", async () => {
    await commandManager.handleMessage(mockContext, "?testcmd", "!");
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  test("should emit unknownCommand for a non-existent command", async () => {
    await commandManager.handleMessage(mockContext, "!unknown", "!");
    expect(mockCommand.execute).not.toHaveBeenCalled();
    expect(mockMusicBot.emit).toHaveBeenCalledWith("unknownCommand", "unknown", mockContext);
  });

  test("should emit commandError if command execution fails", async () => {
    const error = new Error("Execution failed");
    (mockCommand.execute as jest.Mock).mockRejectedValueOnce(error);
    await commandManager.handleMessage(mockContext, "!testcmd", "!");
    expect(mockMusicBot.emit).toHaveBeenCalledWith("commandError", mockCommand, error, mockContext);
  });
  
  test("should emit commandError if required arguments are missing", async () => {
    await commandManager.handleMessage(mockContext, "!argcmd", "!"); // Missing required arg1
    expect(mockCommandWithArgs.execute).not.toHaveBeenCalled();
    expect(mockMusicBot.emit).toHaveBeenCalledWith(
      "commandError", 
      mockCommandWithArgs, 
      expect.any(Error), // Check for an Error object
      mockContext
    );
    // Optionally check the error message if it's specific
    const emittedError = (mockMusicBot.emit as jest.Mock).mock.calls.find(call => call[0] === "commandError")[2];
    expect(emittedError.message).toContain("Missing required argument: arg1");
  });

  test("should handle commands with optional arguments correctly", async () => {
    await commandManager.handleMessage(mockContext, "!argcmd onlyfirstarg", "!");
    expect(mockCommandWithArgs.execute).toHaveBeenCalledWith(mockContext, ["onlyfirstarg"]);
    expect(mockMusicBot.emit).toHaveBeenCalledWith("commandExecuted", mockCommandWithArgs, mockContext);
  });

});

