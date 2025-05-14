import { RemoveCommand } from "../../definitions/RemoveCommand";
import { CommandContext } from "../../CommandManager";
import { MusicBot } from "../../../core/MusicBot";
import { QueueManager } from "../../../queue/QueueManager";
import { PlayableTrack } from "../../../player/AudioPlayer";

// Mocks
jest.mock("../../../queue/QueueManager");
const MockQueueManager = QueueManager as jest.MockedClass<typeof QueueManager>;

const track1: PlayableTrack = { id: "t1", title: "Track One", url: "http://example.com/t1", source: "youtube", duration: 180 };
const track2: PlayableTrack = { id: "t2", title: "Track Two", url: "http://example.com/t2", source: "soundcloud", duration: 240 };

describe("RemoveCommand", () => {
  let removeCommand: RemoveCommand;
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
    removeCommand = new RemoveCommand();
  });

  test("should return usage if no track number is provided", async () => {
    const result = await removeCommand.execute(mockContext, []);
    expect(result).toBe("Please provide the track number to remove. Usage: `!remove <track number>`");
  });

  test("should return error if track number is not a number", async () => {
    const result = await removeCommand.execute(mockContext, ["abc"]);
    expect(result).toBe("Invalid track number. Please provide a valid number from the queue.");
  });

  test("should return error if track number is less than 1", async () => {
    const result = await removeCommand.execute(mockContext, ["0"]);
    expect(result).toBe("Invalid track number. Please provide a valid number from the queue.");
  });

  test("should remove a track and return confirmation", async () => {
    mockQueueManager.remove.mockReturnValue(track1); // Simulate successful removal
    mockQueueManager.getSize.mockReturnValue(1); // Queue size after removal

    const result = await removeCommand.execute(mockContext, ["2"]); // User inputs 1-based index
    
    expect(mockQueueManager.remove).toHaveBeenCalledWith(2); // Manager uses 1-based index internally as per its design
    expect(result).toBe(`Removed: **${track1.title}** from the queue.`);
    expect(mockMusicBot.emit).toHaveBeenCalledWith("trackRemoved", track1, 1, mockContext);
  });

  test("should return a message if the track to remove is not found", async () => {
    mockQueueManager.remove.mockReturnValue(null); // Simulate track not found
    const result = await removeCommand.execute(mockContext, ["99"]);
    expect(mockQueueManager.remove).toHaveBeenCalledWith(99);
    expect(result).toBe("Could not find a track at that position.");
    expect(mockMusicBot.emit).not.toHaveBeenCalledWith("trackRemoved", expect.anything(), expect.anything(), mockContext);
  });

  test("should return a message if the queue is empty", async () => {
    mockQueueManager.getSize.mockReturnValue(0);
    const result = await removeCommand.execute(mockContext, ["1"]);
    // The check for empty queue might be inside the command or rely on remove returning null
    // If remove is called, it should return null for an empty queue for a valid index like 1.
    // Depending on QueueManager.remove behavior for empty queue:
    // Option 1: remove returns null if queue is empty
    mockQueueManager.remove.mockReturnValue(null);
    expect(result).toBe("Could not find a track at that position."); // Or a more specific "Queue is empty."
    // Option 2: The command checks queue size first (better)
    // This test assumes the command relies on QueueManager.remove's return value.
  });
});

