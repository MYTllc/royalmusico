import { VolumeCommand } from "../../definitions/VolumeCommand";
import { CommandContext } from "../../CommandManager";
import { MusicBot } from "../../../core/MusicBot";
import { AudioPlayer } from "../../../player/AudioPlayer";

// Mocks
jest.mock("../../../player/AudioPlayer");
const MockAudioPlayer = AudioPlayer as jest.MockedClass<typeof AudioPlayer>;

describe("VolumeCommand", () => {
  let volumeCommand: VolumeCommand;
  let mockMusicBot: MusicBot;
  let mockContext: CommandContext;
  let mockAudioPlayer: jest.Mocked<AudioPlayer>;

  beforeEach(() => {
    MockAudioPlayer.mockClear();
    mockAudioPlayer = new MockAudioPlayer() as jest.Mocked<AudioPlayer>;

    // Default mock implementations
    mockAudioPlayer.getVolume.mockReturnValue(50); // Default volume
    mockAudioPlayer.setVolume.mockImplementation((vol) => {
      mockAudioPlayer.getVolume.mockReturnValue(vol);
      return vol;
    });

    mockMusicBot = {
      audioPlayer: mockAudioPlayer,
      emit: jest.fn(),
      // other MusicBot properties if needed
    } as unknown as MusicBot;

    mockContext = { musicBot: mockMusicBot };
    volumeCommand = new VolumeCommand();
  });

  test("should return current volume if no argument is provided", async () => {
    const result = await volumeCommand.execute(mockContext, []);
    expect(result).toBe("Current volume is **50%**. Use `!volume <0-100>` to set a new volume.");
  });

  test("should set volume and return confirmation message", async () => {
    const result = await volumeCommand.execute(mockContext, ["75"]);
    expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(75);
    expect(result).toBe("Volume set to **75%**.");
    expect(mockMusicBot.emit).toHaveBeenCalledWith("volumeChanged", 75, mockContext);
  });

  test("should set volume to 0", async () => {
    const result = await volumeCommand.execute(mockContext, ["0"]);
    expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(0);
    expect(result).toBe("Volume set to **0%**.");
  });

  test("should set volume to 100", async () => {
    const result = await volumeCommand.execute(mockContext, ["100"]);
    expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(100);
    expect(result).toBe("Volume set to **100%**.");
  });

  test("should return error for non-numeric volume", async () => {
    const result = await volumeCommand.execute(mockContext, ["abc"]);
    expect(mockAudioPlayer.setVolume).not.toHaveBeenCalled();
    expect(result).toBe("Invalid volume. Please provide a number between 0 and 100.");
  });

  test("should return error for volume less than 0", async () => {
    const result = await volumeCommand.execute(mockContext, ["-10"]);
    expect(mockAudioPlayer.setVolume).not.toHaveBeenCalled();
    expect(result).toBe("Invalid volume. Please provide a number between 0 and 100.");
  });

  test("should return error for volume greater than 100", async () => {
    const result = await volumeCommand.execute(mockContext, ["150"]);
    expect(mockAudioPlayer.setVolume).not.toHaveBeenCalled();
    expect(result).toBe("Invalid volume. Please provide a number between 0 and 100.");
  });

  test("should handle floating point numbers by flooring them", async () => {
    let result = await volumeCommand.execute(mockContext, ["65.7"]);
    expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(65);
    expect(result).toBe("Volume set to **65%**.");

    result = await volumeCommand.execute(mockContext, ["0.9"]);
    expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(0);
    expect(result).toBe("Volume set to **0%**.");
  });
});

