import { ShuffleCommand } from "../../definitions/ShuffleCommand";
import { CommandContext } from "../../CommandManager";
import { MusicBot } from "../../../core/MusicBot";
import { QueueManager } from "../../../queue/QueueManager";

// Mocks
jest.mock("../../../queue/QueueManager");
const MockQueueManager = QueueManager as jest.MockedClass<typeof QueueManager>;

describe("ShuffleCommand", () => {
  let shuffleCommand: ShuffleCommand;
  let mockMusicBot: MusicBot;
  let mockContext: CommandContext;
  let mockQueueManager: jest.Mocked<QueueManager>;

  beforeEach(() => {
    MockQueueManager.mockClear();
    mockQueueManager = new MockQueueManager() as jest.Mocked<QueueManager>;

    mockMusicBot = {
      queueManager: mockQueueManager,
      emit: jest.fn(),
    } as unknown as MusicBot;

    mockContext = { musicBot: mockMusicBot };
    shuffleCommand = new ShuffleCommand();
  });

  test("should shuffle the queue and return confirmation if queue is not empty", async () => {
    mockQueueManager.getSize.mockReturnValue(5); // Simulate a non-empty queue
    const result = await shuffleCommand.execute(mockContext, []);
    expect(mockQueueManager.shuffle).toHaveBeenCalled();
    expect(result).toBe("Queue shuffled! 🔀");
    expect(mockMusicBot.emit).toHaveBeenCalledWith("shuffled", mockContext);
  });

  test("should return a message if the queue is empty", async () => {
    mockQueueManager.getSize.mockReturnValue(0); // Simulate an empty queue
    const result = await shuffleCommand.execute(mockContext, []);
    expect(mockQueueManager.shuffle).not.toHaveBeenCalled();
    expect(result).toBe("The queue is currently empty, nothing to shuffle.");
    expect(mockMusicBot.emit).not.toHaveBeenCalledWith("shuffled", mockContext);
  });
});

