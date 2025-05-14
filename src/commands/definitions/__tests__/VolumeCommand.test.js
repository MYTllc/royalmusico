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
const VolumeCommand_1 = require("../../definitions/VolumeCommand");
const AudioPlayer_1 = require("../../../player/AudioPlayer");
// Mocks
jest.mock("../../../player/AudioPlayer");
const MockAudioPlayer = AudioPlayer_1.AudioPlayer;
describe("VolumeCommand", () => {
    let volumeCommand;
    let mockMusicBot;
    let mockContext;
    let mockAudioPlayer;
    beforeEach(() => {
        MockAudioPlayer.mockClear();
        mockAudioPlayer = new MockAudioPlayer();
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
        };
        mockContext = { musicBot: mockMusicBot };
        volumeCommand = new VolumeCommand_1.VolumeCommand();
    });
    test("should return current volume if no argument is provided", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield volumeCommand.execute(mockContext, []);
        expect(result).toBe("Current volume is **50%**. Use `!volume <0-100>` to set a new volume.");
    }));
    test("should set volume and return confirmation message", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield volumeCommand.execute(mockContext, ["75"]);
        expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(75);
        expect(result).toBe("Volume set to **75%**.");
        expect(mockMusicBot.emit).toHaveBeenCalledWith("volumeChanged", 75, mockContext);
    }));
    test("should set volume to 0", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield volumeCommand.execute(mockContext, ["0"]);
        expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(0);
        expect(result).toBe("Volume set to **0%**.");
    }));
    test("should set volume to 100", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield volumeCommand.execute(mockContext, ["100"]);
        expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(100);
        expect(result).toBe("Volume set to **100%**.");
    }));
    test("should return error for non-numeric volume", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield volumeCommand.execute(mockContext, ["abc"]);
        expect(mockAudioPlayer.setVolume).not.toHaveBeenCalled();
        expect(result).toBe("Invalid volume. Please provide a number between 0 and 100.");
    }));
    test("should return error for volume less than 0", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield volumeCommand.execute(mockContext, ["-10"]);
        expect(mockAudioPlayer.setVolume).not.toHaveBeenCalled();
        expect(result).toBe("Invalid volume. Please provide a number between 0 and 100.");
    }));
    test("should return error for volume greater than 100", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield volumeCommand.execute(mockContext, ["150"]);
        expect(mockAudioPlayer.setVolume).not.toHaveBeenCalled();
        expect(result).toBe("Invalid volume. Please provide a number between 0 and 100.");
    }));
    test("should handle floating point numbers by flooring them", () => __awaiter(void 0, void 0, void 0, function* () {
        let result = yield volumeCommand.execute(mockContext, ["65.7"]);
        expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(65);
        expect(result).toBe("Volume set to **65%**.");
        result = yield volumeCommand.execute(mockContext, ["0.9"]);
        expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(0);
        expect(result).toBe("Volume set to **0%**.");
    }));
});
