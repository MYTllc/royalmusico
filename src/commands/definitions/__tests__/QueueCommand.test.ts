import { QueueCommand } from "../../definitions/QueueCommand";
import { CommandContext } from "../../CommandManager";
import { MusicBot } from "../../../core/MusicBot";
import { AudioPlayer, PlayerStatus, PlayableTrack } from "../../../player/AudioPlayer";
import { QueueManager } from "../../../queue/QueueManager";

// Mocks
jest.mock("../../../player/AudioPlayer");
jest.mock("../../../queue/QueueManager");

const MockAudioPlayer = AudioPlayer as jest.MockedClass<typeof AudioPlayer>;
const MockQueueManager = QueueManager as jest.MockedClass<typeof QueueManager>;

const track1: PlayableTrack = { id: "t1", title: "Track One", artist: "Artist A", url: "http://example.com/t1", source: "youtube", duration: 180 };
const track2: PlayableTrack = { id: "t2", title: "Track Two - A Very Long Title That Should Be Truncated For Display Purposes", artist: "Artist B - Also A Very Long Name That Might Need Truncation", url: "http://example.com/t2", source: "soundcloud", duration: 240 };
const track3: PlayableTrack = { id: "t3", title: "Track Three", url: "http://example.com/t3", source: "youtube", duration: 123 };

describe("QueueCommand", () => {
  let queueCommand: QueueCommand;
  let mockMusicBot: MusicBot;
  let mockContext: CommandContext;
  let mockAudioPlayer: jest.Mocked<AudioPlayer>;
  let mockQueueManager: jest.Mocked<QueueManager>;

  beforeEach(() => {
    MockAudioPlayer.mockClear();
    MockQueueManager.mockClear();

    mockAudioPlayer = new MockAudioPlayer() as jest.Mocked<AudioPlayer>;
    mockQueueManager = new MockQueueManager() as jest.Mocked<QueueManager>;

    // Default mock implementations
    mockAudioPlayer.getCurrentTrack.mockReturnValue(null);
    mockQueueManager.getQueue.mockReturnValue([]);

    mockMusicBot = {
      audioPlayer: mockAudioPlayer,
      queueManager: mockQueueManager,
      // other MusicBot properties if needed
    } as unknown as MusicBot;

    mockContext = { musicBot: mockMusicBot };
    queueCommand = new QueueCommand();
  });

  test("should return a message if queue is empty and nothing is playing", async () => {
    const result = await queueCommand.execute(mockContext, []);
    expect(result).toBe("The queue is currently empty and nothing is playing.");
  });

  test("should display now playing track if a track is playing", async () => {
    mockAudioPlayer.getCurrentTrack.mockReturnValue(track1);
    const result = await queueCommand.execute(mockContext, []) as string;
    expect(result).toContain("**Now Playing:**");
    expect(result).toContain(`[${track1.title}](${track1.url}) by ${track1.artist} - 3:00`);
  });

  test("should display queue if tracks are in queue", async () => {
    mockQueueManager.getQueue.mockReturnValue([track2, track3]);
    const result = await queueCommand.execute(mockContext, []) as string;
    expect(result).toContain("**Up Next:**");
    expect(result).toContain(`1. [Track Two - A Very Long Title That Should Be Truncated Fo...](${track2.url}) by Artist B - Also A Very Long Name That M... - 4:00`);
    expect(result).toContain(`2. [${track3.title}](${track3.url}) by Unknown Artist - 2:03`);
  });

  test("should display now playing and queue", async () => {
    mockAudioPlayer.getCurrentTrack.mockReturnValue(track1);
    mockQueueManager.getQueue.mockReturnValue([track2]);
    const result = await queueCommand.execute(mockContext, []) as string;
    expect(result).toContain("**Now Playing:**");
    expect(result).toContain(`[${track1.title}](${track1.url})`);
    expect(result).toContain("**Up Next:**");
    expect(result).toContain(`[Track Two - A Very Long Title That Should Be Truncated Fo...](${track2.url})`);
  });

  test("should indicate if there are more tracks than displayed (max 10)", async () => {
    const manyTracks = Array(12).fill(null).map((_, i) => ({ ...track1, id: `t${i}`, title: `Track ${i + 1}` }));
    mockQueueManager.getQueue.mockReturnValue(manyTracks);
    const result = await queueCommand.execute(mockContext, []) as string;
    expect(result).toContain("...and 2 more track(s).");
    // Check that only 10 tracks are listed
    const trackLines = result.split("\n").filter(line => line.match(/^\d+\.\s/));
    expect(trackLines.length).toBe(10);
  });

  test("should format duration correctly (H:MM:SS, M:SS, S)", () => {
    // Access private method for testing (not ideal, but useful for utility functions)
    // @ts-ignore
    const formatDuration = queueCommand.formatDuration;
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3665)).toBe("1:01:05");
    expect(formatDuration(3600)).toBe("1:00:00");
  });

  test("should truncate long titles and artist names", async () => {
    mockAudioPlayer.getCurrentTrack.mockReturnValue(track2); // track2 has long title/artist
    const result = await queueCommand.execute(mockContext, []) as string;
    expect(result).toContain("[Track Two - A Very Long Title That Should Be Truncated Fo...]");
    expect(result).toContain("by Artist B - Also A Very Long Name That M...");
  });

});

