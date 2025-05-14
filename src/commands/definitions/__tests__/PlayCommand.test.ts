import { PlayCommand } from "../../definitions/PlayCommand";
import { CommandContext } from "../../CommandManager";
import { MusicBot } from "../../../core/MusicBot";
import { YouTubeDLWrapper } from "../../../integrations/YouTubeDLWrapper";
import { SpotifyClient } from "../../../integrations/SpotifyClient";
import { AudioPlayer, PlayerStatus } from "../../../player/AudioPlayer";
import { QueueManager } from "../../../queue/QueueManager";
import { PlayableTrack } from "../../../player/AudioPlayer";

// Mocks
jest.mock("../../../integrations/YouTubeDLWrapper");
jest.mock("../../../integrations/SpotifyClient");
jest.mock("../../../player/AudioPlayer");
jest.mock("../../../queue/QueueManager");

const MockYouTubeDLWrapper = YouTubeDLWrapper as jest.MockedClass<typeof YouTubeDLWrapper>;
const MockSpotifyClient = SpotifyClient as jest.MockedClass<typeof SpotifyClient>;
const MockAudioPlayer = AudioPlayer as jest.MockedClass<typeof AudioPlayer>;
const MockQueueManager = QueueManager as jest.MockedClass<typeof QueueManager>;

describe("PlayCommand", () => {
  let playCommand: PlayCommand;
  let mockMusicBot: MusicBot;
  let mockContext: CommandContext;
  let mockYtdlWrapper: jest.Mocked<YouTubeDLWrapper>;
  let mockSpotifyClient: jest.Mocked<SpotifyClient>;
  let mockAudioPlayer: jest.Mocked<AudioPlayer>;
  let mockQueueManager: jest.Mocked<QueueManager>;

  const youtubeTrack: PlayableTrack = {
    id: "yt123", title: "YouTube Song", url: "https://youtube.com/watch?v=yt123", source: "youtube", duration: 180, streamUrl: "http://stream.yt/yt123"
  };
  const soundcloudTrack: PlayableTrack = {
    id: "sc456", title: "SoundCloud Song", url: "https://soundcloud.com/user/sc456", source: "soundcloud", duration: 200, streamUrl: "http://stream.sc/sc456"
  };
  const spotifyTrackInfo: PlayableTrack = { // This is what SpotifyClient might return, then we find stream for it
    id: "sp789", title: "Spotify Song", artist: "Spotify Artist", url: "https://open.spotify.com/track/sp789", source: "spotify", duration: 220
  };

  beforeEach(() => {
    // Reset all mocks
    MockYouTubeDLWrapper.mockClear();
    MockSpotifyClient.mockClear();
    MockAudioPlayer.mockClear();
    MockQueueManager.mockClear();

    mockYtdlWrapper = new MockYouTubeDLWrapper() as jest.Mocked<YouTubeDLWrapper>;
    mockSpotifyClient = new MockSpotifyClient({ clientId: "", clientSecret: "" }) as jest.Mocked<SpotifyClient>;
    mockAudioPlayer = new MockAudioPlayer() as jest.Mocked<AudioPlayer>;
    mockQueueManager = new MockQueueManager() as jest.Mocked<QueueManager>;

    // Mock default implementations
    mockYtdlWrapper.getTrackInfo.mockResolvedValue(null);
    mockYtdlWrapper.searchSoundCloud.mockResolvedValue(null);
    mockYtdlWrapper.getStreamUrl.mockImplementation(async (url) => `http://stream.from/${url.split("/").pop()}`);
    
    mockSpotifyClient.searchTracks.mockResolvedValue(null);

    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.IDLE);
    mockAudioPlayer.play.mockResolvedValue();
    
    mockQueueManager.add.mockReturnValue(1);
    mockQueueManager.getNext.mockReturnValue(null); // Default to empty queue initially
    mockQueueManager.getSize.mockReturnValue(0);

    mockMusicBot = {
      youtubeDLWrapper: mockYtdlWrapper,
      spotifyClient: mockSpotifyClient,
      audioPlayer: mockAudioPlayer,
      queueManager: mockQueueManager,
      emit: jest.fn(),
      resolveQueryToTrack: jest.fn().mockImplementation(async (query) => {
        if (query.includes("youtube.com")) return youtubeTrack;
        if (query.includes("soundcloud.com")) return soundcloudTrack;
        if (query === "Spotify Song Spotify Artist") return spotifyTrackInfo; // Simulate Spotify search result
        if (query === "YouTube Song") return youtubeTrack;
        if (query === "SoundCloud Song") return soundcloudTrack;
        return null;
      }),
      // Add other necessary MusicBot properties/methods if PlayCommand uses them
    } as unknown as MusicBot;

    mockContext = { musicBot: mockMusicBot };
    playCommand = new PlayCommand();
  });

  test("should return message if no query is provided", async () => {
    const result = await playCommand.execute(mockContext, []);
    expect(result).toBe("Please provide a song URL or search query.");
    expect(mockMusicBot.emit).not.toHaveBeenCalled();
  });

  test("should play a YouTube URL directly if player is idle", async () => {
    mockYtdlWrapper.getTrackInfo.mockResolvedValueOnce(youtubeTrack);
    mockQueueManager.getNext.mockReturnValueOnce(youtubeTrack); // Simulate track being added and becoming next

    await playCommand.execute(mockContext, ["https://youtube.com/watch?v=yt123"]);

    expect(mockYtdlWrapper.getTrackInfo).toHaveBeenCalledWith("https://youtube.com/watch?v=yt123");
    expect(mockQueueManager.add).toHaveBeenCalledWith(youtubeTrack);
    expect(mockAudioPlayer.play).toHaveBeenCalledWith(youtubeTrack);
    expect(mockMusicBot.emit).toHaveBeenCalledWith("debug", expect.stringContaining("Fetching track info for URL"));
  });

  test("should add a YouTube URL to queue if player is busy", async () => {
    mockYtdlWrapper.getTrackInfo.mockResolvedValueOnce(youtubeTrack);
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PLAYING);

    const result = await playCommand.execute(mockContext, ["https://youtube.com/watch?v=yt123"]);

    expect(mockYtdlWrapper.getTrackInfo).toHaveBeenCalledWith("https://youtube.com/watch?v=yt123");
    expect(mockQueueManager.add).toHaveBeenCalledWith(youtubeTrack);
    expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    expect(result).toBe(`Added to queue: **${youtubeTrack.title}**`);
  });

  test("should search YouTube and play if player is idle", async () => {
    mockYtdlWrapper.getTrackInfo.mockImplementation(async (query) => {
        if (query === "ytsearch1:YouTube Search Query") return youtubeTrack;
        return null;
    });
    mockQueueManager.getNext.mockReturnValueOnce(youtubeTrack);

    await playCommand.execute(mockContext, ["YouTube Search Query"]);

    expect(mockYtdlWrapper.getTrackInfo).toHaveBeenCalledWith("ytsearch1:YouTube Search Query");
    expect(mockQueueManager.add).toHaveBeenCalledWith(youtubeTrack);
    expect(mockAudioPlayer.play).toHaveBeenCalledWith(youtubeTrack);
  });

  test("should fallback to SoundCloud search if YouTube search fails", async () => {
    mockYtdlWrapper.getTrackInfo.mockResolvedValueOnce(null); // YouTube search fails
    mockYtdlWrapper.searchSoundCloud.mockResolvedValueOnce([soundcloudTrack]);
    mockQueueManager.getNext.mockReturnValueOnce(soundcloudTrack);

    await playCommand.execute(mockContext, ["Some Search Query"]);

    expect(mockYtdlWrapper.getTrackInfo).toHaveBeenCalledWith("ytsearch1:Some Search Query");
    expect(mockYtdlWrapper.searchSoundCloud).toHaveBeenCalledWith("Some Search Query", 1);
    expect(mockQueueManager.add).toHaveBeenCalledWith(soundcloudTrack);
    expect(mockAudioPlayer.play).toHaveBeenCalledWith(soundcloudTrack);
  });

  test("should return error message if track is not found after all fallbacks", async () => {
    mockYtdlWrapper.getTrackInfo.mockResolvedValue(null);
    mockYtdlWrapper.searchSoundCloud.mockResolvedValue(null);

    const result = await playCommand.execute(mockContext, ["NonExistent Track Query"]);

    expect(result).toBe("Could not find a track for \"NonExistent Track Query\". Try a different query or URL.");
    expect(mockMusicBot.emit).toHaveBeenCalledWith("error", expect.any(Error), null);
  });

  test("should return error if stream URL cannot be fetched", async () => {
    const trackWithoutStreamUrlInitially = { ...youtubeTrack, streamUrl: undefined };
    mockYtdlWrapper.getTrackInfo.mockResolvedValueOnce(trackWithoutStreamUrlInitially);
    mockYtdlWrapper.getStreamUrl.mockResolvedValueOnce(null); // Simulate stream URL fetch failure

    const result = await playCommand.execute(mockContext, ["https://youtube.com/watch?v=yt123"]);

    expect(mockYtdlWrapper.getStreamUrl).toHaveBeenCalledWith(youtubeTrack.url);
    expect(result).toBe(`Failed to get a playable stream for \"${youtubeTrack.title}\".`);
    expect(mockMusicBot.emit).toHaveBeenCalledWith("trackError", expect.any(Error), trackWithoutStreamUrlInitially);
  });

});

