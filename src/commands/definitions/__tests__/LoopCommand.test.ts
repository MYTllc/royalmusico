import { LoopCommand } from "../../definitions/LoopCommand";
import { CommandContext } from "../../CommandManager";
import { MusicBot } from "../../../core/MusicBot";
import { QueueManager, LoopMode } from "../../../queue/QueueManager";

// Mocks
jest.mock("../../../queue/QueueManager");
const MockQueueManager = QueueManager as jest.MockedClass<typeof QueueManager>;

describe("LoopCommand", () => {
  let loopCommand: LoopCommand;
  let mockMusicBot: MusicBot;
  let mockContext: CommandContext;
  let mockQueueManager: jest.Mocked<QueueManager>;

  beforeEach(() => {
    MockQueueManager.mockClear();
    mockQueueManager = new MockQueueManager() as jest.Mocked<QueueManager>;

    mockMusicBot = {
      queueManager: mockQueueManager,
      emit: jest.fn(),
      // other MusicBot properties if needed
    } as unknown as MusicBot;

    mockContext = { musicBot: mockMusicBot };
    loopCommand = new LoopCommand();
  });

  test("should return usage if no argument is provided", async () => {
    mockQueueManager.getLoopMode.mockReturnValue(LoopMode.NONE);
    const result = await loopCommand.execute(mockContext, []);
    expect(result).toBe("Current loop mode: **None**. Usage: `!loop <none|track|queue>`");
  });

  test("should set loop mode to NONE", async () => {
    const result = await loopCommand.execute(mockContext, ["none"]);
    expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(LoopMode.NONE);
    expect(result).toBe("Loop mode set to **None**.");
    expect(mockMusicBot.emit).toHaveBeenCalledWith("loopModeChanged", LoopMode.NONE, mockContext);
  });

  test("should set loop mode to TRACK", async () => {
    const result = await loopCommand.execute(mockContext, ["track"]);
    expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(LoopMode.TRACK);
    expect(result).toBe("Loop mode set to **Track**.");
    expect(mockMusicBot.emit).toHaveBeenCalledWith("loopModeChanged", LoopMode.TRACK, mockContext);
  });

  test("should set loop mode to QUEUE", async () => {
    const result = await loopCommand.execute(mockContext, ["queue"]);
    expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(LoopMode.QUEUE);
    expect(result).toBe("Loop mode set to **Queue**.");
    expect(mockMusicBot.emit).toHaveBeenCalledWith("loopModeChanged", LoopMode.QUEUE, mockContext);
  });

  test("should be case-insensitive for arguments", async () => {
    await loopCommand.execute(mockContext, ["TRACK"]);
    expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(LoopMode.TRACK);
    await loopCommand.execute(mockContext, ["QuEuE"]);
    expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(LoopMode.QUEUE);
  });

  test("should return an error for invalid loop mode", async () => {
    const result = await loopCommand.execute(mockContext, ["invalid"]);
    expect(mockQueueManager.setLoopMode).not.toHaveBeenCalled();
    expect(result).toBe("Invalid loop mode. Available modes: `none`, `track`, `queue`.");
    expect(mockMusicBot.emit).not.toHaveBeenCalledWith("loopModeChanged", expect.anything(), mockContext);
  });

  test("should display current loop mode if argument is 'current' or similar", async () => {
    mockQueueManager.getLoopMode.mockReturnValue(LoopMode.TRACK);
    let result = await loopCommand.execute(mockContext, ["current"]);
    expect(result).toBe("Current loop mode: **Track**. Usage: `!loop <none|track|queue>`");
    result = await loopCommand.execute(mockContext, ["status"]);
    expect(result).toBe("Current loop mode: **Track**. Usage: `!loop <none|track|queue>`");
  });
});

