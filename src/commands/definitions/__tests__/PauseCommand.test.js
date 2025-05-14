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
const PauseCommand_1 = require("../../definitions/PauseCommand");
const AudioPlayer_1 = require("../../../player/AudioPlayer");
// Mocks
jest.mock("../../../player/AudioPlayer");
const MockAudioPlayer = AudioPlayer_1.AudioPlayer;
describe("PauseCommand", () => {
    let pauseCommand;
    let mockMusicBot;
    let mockContext;
    let mockAudioPlayer;
    const playingTrack = {
        id: "track1", title: "Playing Now", url: "http://example.com/play", source: "youtube", duration: 180
    };
    beforeEach(() => {
        MockAudioPlayer.mockClear();
        mockAudioPlayer = new MockAudioPlayer();
        mockMusicBot = {
            audioPlayer: mockAudioPlayer,
            emit: jest.fn(),
        };
        mockContext = { musicBot: mockMusicBot };
        pauseCommand = new PauseCommand_1.PauseCommand();
    });
    test("should pause the player if it is playing and return confirmation", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PLAYING);
        mockAudioPlayer.getCurrentTrack.mockReturnValue(playingTrack);
        mockAudioPlayer.pause.mockImplementation(() => {
            mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PAUSED);
        });
        const result = yield pauseCommand.execute(mockContext, []);
        expect(mockAudioPlayer.pause).toHaveBeenCalled();
        expect(result).toBe(`Paused: **${playingTrack.title}**.`);
        expect(mockMusicBot.emit).toHaveBeenCalledWith("paused", playingTrack, mockContext);
    }));
    test("should resume the player if it is paused and return confirmation", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PAUSED);
        mockAudioPlayer.getCurrentTrack.mockReturnValue(playingTrack);
        mockAudioPlayer.resume.mockImplementation(() => {
            mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PLAYING);
        });
        const result = yield pauseCommand.execute(mockContext, []); // PauseCommand also handles resume
        expect(mockAudioPlayer.resume).toHaveBeenCalled();
        expect(result).toBe(`Resumed: **${playingTrack.title}**.`);
        expect(mockMusicBot.emit).toHaveBeenCalledWith("resumed", playingTrack, mockContext);
    }));
    test("should return a message if nothing is playing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.IDLE);
        mockAudioPlayer.getCurrentTrack.mockReturnValue(null);
        const result = yield pauseCommand.execute(mockContext, []);
        expect(mockAudioPlayer.pause).not.toHaveBeenCalled();
        expect(mockAudioPlayer.resume).not.toHaveBeenCalled();
        expect(result).toBe("Nothing is currently playing.");
    }));
    test("should return a generic pause message if track info is unavailable but playing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PLAYING);
        mockAudioPlayer.getCurrentTrack.mockReturnValue(null); // Track info unavailable
        mockAudioPlayer.pause.mockImplementation(() => {
            mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PAUSED);
        });
        const result = yield pauseCommand.execute(mockContext, []);
        expect(mockAudioPlayer.pause).toHaveBeenCalled();
        expect(result).toBe("Playback paused.");
    }));
    test("should return a generic resume message if track info is unavailable but paused", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PAUSED);
        mockAudioPlayer.getCurrentTrack.mockReturnValue(null); // Track info unavailable
        mockAudioPlayer.resume.mockImplementation(() => {
            mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PLAYING);
        });
        const result = yield pauseCommand.execute(mockContext, []);
        expect(mockAudioPlayer.resume).toHaveBeenCalled();
        expect(result).toBe("Playback resumed.");
    }));
});
