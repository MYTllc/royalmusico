import { SkipCommand } from "../../definitions/SkipCommand";
import { CommandContext } from "../../CommandManager";
import { MusicBot } from "../../../core/MusicBot";
import { AudioPlayer, PlayerStatus, PlayableTrack } from "../../../player/AudioPlayer";
import { QueueManager } from "../../../queue/QueueManager";

// Mocks
jest.mock("../../../player/AudioPlayer");
jest.mock("../../../queue/QueueManager");

const MockAudioPlayer = AudioPlayer as jest.MockedClass<typeof AudioPlayer>;
const MockQueueManager = QueueManager as jest.MockedClass<typeof QueueManager>;

describe("SkipCommand", () => {
  let skipCommand: SkipCommand;
  let mockMusicBot: MusicBot;
  let mockContext: CommandContext;
  let mockAudioPlayer: jest.Mocked<AudioPlayer>;
  let mockQueueManager: jest.Mocked<QueueManager>;

  const currentTrack: PlayableTrack = {
    id: "track123", title: "Current Song", url: "http://example.com/current", source: "youtube", duration: 180
  };

  beforeEach(() => {
    MockAudioPlayer.mockClear();
    MockQueueManager.mockClear();

    mockAudioPlayer = new MockAudioPlayer() as jest.Mocked<AudioPlayer>;
    mockQueueManager = new MockQueueManager() as jest.Mocked<QueueManager>;

    // Default mock implementations
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PLAYING);
    mockAudioPlayer.getCurrentTrack.mockReturnValue(currentTrack);
    mockAudioPlayer.stop.mockImplementation(() => {
        // Simulate player stopping and becoming idle or ended
        mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.STOPPED);
        mockAudioPlayer.getCurrentTrack.mockReturnValue(null);
    });

    mockQueueManager.getSize.mockReturnValue(1); // Assume there's something in queue or history to play next

    mockMusicBot = {
      audioPlayer: mockAudioPlayer,
      queueManager: mockQueueManager,
      emit: jest.fn(),
      // other MusicBot properties if needed by the command
    } as unknown as MusicBot;

    mockContext = { musicBot: mockMusicBot };
    skipCommand = new SkipCommand();
  });

  test("should stop the current song and return a skip message", async () => {
    const result = await skipCommand.execute(mockContext, []);

    expect(mockAudioPlayer.stop).toHaveBeenCalled();
    expect(result).toBe(`Skipped: **${currentTrack.title}**.`);
    // MusicBot's core logic (event handler for trackEnd/stop) should handle playing the next track.
    // The command itself is only responsible for stopping the current one.
  });

  test("should return a message if nothing is playing and queue is empty", async () => {
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.IDLE);
    mockAudioPlayer.getCurrentTrack.mockReturnValue(null);
    mockQueueManager.getSize.mockReturnValue(0);

    const result = await skipCommand.execute(mockContext, []);

    expect(mockAudioPlayer.stop).not.toHaveBeenCalled();
    expect(result).toBe("Nothing is playing and the queue is empty.");
  });

  test("should return a generic skip message if current track info is unavailable when skipping", async () => {
    mockAudioPlayer.getCurrentTrack.mockReturnValue(null); // Simulate track info not being available
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PLAYING); // Still, something is technically playing
    
    const result = await skipCommand.execute(mockContext, []);
    
    expect(mockAudioPlayer.stop).toHaveBeenCalled();
    expect(result).toBe("Skipped to the next track.");
  });

  test("should correctly skip even if queue becomes empty after skip", async () => {
    // This test ensures the command focuses on stopping the current track.
    // The bot's main loop handles what happens if the queue is empty next.
    mockQueueManager.getSize.mockReturnValue(0); // Simulate queue will be empty after this skip
    
    const result = await skipCommand.execute(mockContext, []);
    
    expect(mockAudioPlayer.stop).toHaveBeenCalled();
    expect(result).toBe(`Skipped: **${currentTrack.title}**.`);
  });

});

