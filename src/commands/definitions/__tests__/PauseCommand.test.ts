import { PauseCommand } from "../../definitions/PauseCommand";
import { CommandContext } from "../../CommandManager";
import { MusicBot } from "../../../core/MusicBot";
import { AudioPlayer, PlayerStatus, PlayableTrack } from "../../../player/AudioPlayer";

// Mocks
jest.mock("../../../player/AudioPlayer");
const MockAudioPlayer = AudioPlayer as jest.MockedClass<typeof AudioPlayer>;

describe("PauseCommand", () => {
  let pauseCommand: PauseCommand;
  let mockMusicBot: MusicBot;
  let mockContext: CommandContext;
  let mockAudioPlayer: jest.Mocked<AudioPlayer>;

  const playingTrack: PlayableTrack = {
    id: "track1", title: "Playing Now", url: "http://example.com/play", source: "youtube", duration: 180
  };

  beforeEach(() => {
    MockAudioPlayer.mockClear();
    mockAudioPlayer = new MockAudioPlayer() as jest.Mocked<AudioPlayer>;

    mockMusicBot = {
      audioPlayer: mockAudioPlayer,
      emit: jest.fn(),
    } as unknown as MusicBot;

    mockContext = { musicBot: mockMusicBot };
    pauseCommand = new PauseCommand();
  });

  test("should pause the player if it is playing and return confirmation", async () => {
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PLAYING);
    mockAudioPlayer.getCurrentTrack.mockReturnValue(playingTrack);
    mockAudioPlayer.pause.mockImplementation(() => {
      mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PAUSED);
    });

    const result = await pauseCommand.execute(mockContext, []);
    expect(mockAudioPlayer.pause).toHaveBeenCalled();
    expect(result).toBe(`Paused: **${playingTrack.title}**.`);
    expect(mockMusicBot.emit).toHaveBeenCalledWith("paused", playingTrack, mockContext);
  });

  test("should resume the player if it is paused and return confirmation", async () => {
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PAUSED);
    mockAudioPlayer.getCurrentTrack.mockReturnValue(playingTrack);
    mockAudioPlayer.resume.mockImplementation(() => {
      mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PLAYING);
    });

    const result = await pauseCommand.execute(mockContext, []); // PauseCommand also handles resume
    expect(mockAudioPlayer.resume).toHaveBeenCalled();
    expect(result).toBe(`Resumed: **${playingTrack.title}**.`);
    expect(mockMusicBot.emit).toHaveBeenCalledWith("resumed", playingTrack, mockContext);
  });

  test("should return a message if nothing is playing", async () => {
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.IDLE);
    mockAudioPlayer.getCurrentTrack.mockReturnValue(null);

    const result = await pauseCommand.execute(mockContext, []);
    expect(mockAudioPlayer.pause).not.toHaveBeenCalled();
    expect(mockAudioPlayer.resume).not.toHaveBeenCalled();
    expect(result).toBe("Nothing is currently playing.");
  });

  test("should return a generic pause message if track info is unavailable but playing", async () => {
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PLAYING);
    mockAudioPlayer.getCurrentTrack.mockReturnValue(null); // Track info unavailable
    mockAudioPlayer.pause.mockImplementation(() => {
      mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PAUSED);
    });

    const result = await pauseCommand.execute(mockContext, []);
    expect(mockAudioPlayer.pause).toHaveBeenCalled();
    expect(result).toBe("Playback paused.");
  });

  test("should return a generic resume message if track info is unavailable but paused", async () => {
    mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PAUSED);
    mockAudioPlayer.getCurrentTrack.mockReturnValue(null); // Track info unavailable
    mockAudioPlayer.resume.mockImplementation(() => {
      mockAudioPlayer.getStatus.mockReturnValue(PlayerStatus.PLAYING);
    });

    const result = await pauseCommand.execute(mockContext, []);
    expect(mockAudioPlayer.resume).toHaveBeenCalled();
    expect(result).toBe("Playback resumed.");
  });

});

