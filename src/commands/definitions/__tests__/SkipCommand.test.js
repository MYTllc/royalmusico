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
const SkipCommand_1 = require("../../definitions/SkipCommand");
const AudioPlayer_1 = require("../../../player/AudioPlayer");
const QueueManager_1 = require("../../../queue/QueueManager");
// Mocks
jest.mock("../../../player/AudioPlayer");
jest.mock("../../../queue/QueueManager");
const MockAudioPlayer = AudioPlayer_1.AudioPlayer;
const MockQueueManager = QueueManager_1.QueueManager;
describe("SkipCommand", () => {
    let skipCommand;
    let mockMusicBot;
    let mockContext;
    let mockAudioPlayer;
    let mockQueueManager;
    const currentTrack = {
        id: "track123", title: "Current Song", url: "http://example.com/current", source: "youtube", duration: 180
    };
    beforeEach(() => {
        MockAudioPlayer.mockClear();
        MockQueueManager.mockClear();
        mockAudioPlayer = new MockAudioPlayer();
        mockQueueManager = new MockQueueManager();
        // Default mock implementations
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PLAYING);
        mockAudioPlayer.getCurrentTrack.mockReturnValue(currentTrack);
        mockAudioPlayer.stop.mockImplementation(() => {
            // Simulate player stopping and becoming idle or ended
            mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.STOPPED);
            mockAudioPlayer.getCurrentTrack.mockReturnValue(null);
        });
        mockQueueManager.getSize.mockReturnValue(1); // Assume there's something in queue or history to play next
        mockMusicBot = {
            audioPlayer: mockAudioPlayer,
            queueManager: mockQueueManager,
            emit: jest.fn(),
            // other MusicBot properties if needed by the command
        };
        mockContext = { musicBot: mockMusicBot };
        skipCommand = new SkipCommand_1.SkipCommand();
    });
    test("should stop the current song and return a skip message", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield skipCommand.execute(mockContext, []);
        expect(mockAudioPlayer.stop).toHaveBeenCalled();
        expect(result).toBe(`Skipped: **${currentTrack.title}**.`);
        // MusicBot's core logic (event handler for trackEnd/stop) should handle playing the next track.
        // The command itself is only responsible for stopping the current one.
    }));
    test("should return a message if nothing is playing and queue is empty", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.IDLE);
        mockAudioPlayer.getCurrentTrack.mockReturnValue(null);
        mockQueueManager.getSize.mockReturnValue(0);
        const result = yield skipCommand.execute(mockContext, []);
        expect(mockAudioPlayer.stop).not.toHaveBeenCalled();
        expect(result).toBe("Nothing is playing and the queue is empty.");
    }));
    test("should return a generic skip message if current track info is unavailable when skipping", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getCurrentTrack.mockReturnValue(null); // Simulate track info not being available
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PLAYING); // Still, something is technically playing
        const result = yield skipCommand.execute(mockContext, []);
        expect(mockAudioPlayer.stop).toHaveBeenCalled();
        expect(result).toBe("Skipped to the next track.");
    }));
    test("should correctly skip even if queue becomes empty after skip", () => __awaiter(void 0, void 0, void 0, function* () {
        // This test ensures the command focuses on stopping the current track.
        // The bot's main loop handles what happens if the queue is empty next.
        mockQueueManager.getSize.mockReturnValue(0); // Simulate queue will be empty after this skip
        const result = yield skipCommand.execute(mockContext, []);
        expect(mockAudioPlayer.stop).toHaveBeenCalled();
        expect(result).toBe(`Skipped: **${currentTrack.title}**.`);
    }));
});
