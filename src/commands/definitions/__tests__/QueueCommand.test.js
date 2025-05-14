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
const QueueCommand_1 = require("../../definitions/QueueCommand");
const AudioPlayer_1 = require("../../../player/AudioPlayer");
const QueueManager_1 = require("../../../queue/QueueManager");
// Mocks
jest.mock("../../../player/AudioPlayer");
jest.mock("../../../queue/QueueManager");
const MockAudioPlayer = AudioPlayer_1.AudioPlayer;
const MockQueueManager = QueueManager_1.QueueManager;
const track1 = { id: "t1", title: "Track One", artist: "Artist A", url: "http://example.com/t1", source: "youtube", duration: 180 };
const track2 = { id: "t2", title: "Track Two - A Very Long Title That Should Be Truncated For Display Purposes", artist: "Artist B - Also A Very Long Name That Might Need Truncation", url: "http://example.com/t2", source: "soundcloud", duration: 240 };
const track3 = { id: "t3", title: "Track Three", url: "http://example.com/t3", source: "youtube", duration: 123 };
describe("QueueCommand", () => {
    let queueCommand;
    let mockMusicBot;
    let mockContext;
    let mockAudioPlayer;
    let mockQueueManager;
    beforeEach(() => {
        MockAudioPlayer.mockClear();
        MockQueueManager.mockClear();
        mockAudioPlayer = new MockAudioPlayer();
        mockQueueManager = new MockQueueManager();
        // Default mock implementations
        mockAudioPlayer.getCurrentTrack.mockReturnValue(null);
        mockQueueManager.getQueue.mockReturnValue([]);
        mockMusicBot = {
            audioPlayer: mockAudioPlayer,
            queueManager: mockQueueManager,
            // other MusicBot properties if needed
        };
        mockContext = { musicBot: mockMusicBot };
        queueCommand = new QueueCommand_1.QueueCommand();
    });
    test("should return a message if queue is empty and nothing is playing", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield queueCommand.execute(mockContext, []);
        expect(result).toBe("The queue is currently empty and nothing is playing.");
    }));
    test("should display now playing track if a track is playing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getCurrentTrack.mockReturnValue(track1);
        const result = yield queueCommand.execute(mockContext, []);
        expect(result).toContain("**Now Playing:**");
        expect(result).toContain(`[${track1.title}](${track1.url}) by ${track1.artist} - 3:00`);
    }));
    test("should display queue if tracks are in queue", () => __awaiter(void 0, void 0, void 0, function* () {
        mockQueueManager.getQueue.mockReturnValue([track2, track3]);
        const result = yield queueCommand.execute(mockContext, []);
        expect(result).toContain("**Up Next:**");
        expect(result).toContain(`1. [Track Two - A Very Long Title That Should Be Truncated Fo...](${track2.url}) by Artist B - Also A Very Long Name That M... - 4:00`);
        expect(result).toContain(`2. [${track3.title}](${track3.url}) by Unknown Artist - 2:03`);
    }));
    test("should display now playing and queue", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getCurrentTrack.mockReturnValue(track1);
        mockQueueManager.getQueue.mockReturnValue([track2]);
        const result = yield queueCommand.execute(mockContext, []);
        expect(result).toContain("**Now Playing:**");
        expect(result).toContain(`[${track1.title}](${track1.url})`);
        expect(result).toContain("**Up Next:**");
        expect(result).toContain(`[Track Two - A Very Long Title That Should Be Truncated Fo...](${track2.url})`);
    }));
    test("should indicate if there are more tracks than displayed (max 10)", () => __awaiter(void 0, void 0, void 0, function* () {
        const manyTracks = Array(12).fill(null).map((_, i) => (Object.assign(Object.assign({}, track1), { id: `t${i}`, title: `Track ${i + 1}` })));
        mockQueueManager.getQueue.mockReturnValue(manyTracks);
        const result = yield queueCommand.execute(mockContext, []);
        expect(result).toContain("...and 2 more track(s).");
        // Check that only 10 tracks are listed
        const trackLines = result.split("\n").filter(line => line.match(/^\d+\.\s/));
        expect(trackLines.length).toBe(10);
    }));
    test("should format duration correctly (H:MM:SS, M:SS, S)", () => {
        // Access private method for testing (not ideal, but useful for utility functions)
        // @ts-ignore
        const formatDuration = queueCommand.formatDuration;
        expect(formatDuration(5)).toBe("0:05");
        expect(formatDuration(65)).toBe("1:05");
        expect(formatDuration(3665)).toBe("1:01:05");
        expect(formatDuration(3600)).toBe("1:00:00");
    });
    test("should truncate long titles and artist names", () => __awaiter(void 0, void 0, void 0, function* () {
        mockAudioPlayer.getCurrentTrack.mockReturnValue(track2); // track2 has long title/artist
        const result = yield queueCommand.execute(mockContext, []);
        expect(result).toContain("[Track Two - A Very Long Title That Should Be Truncated Fo...]");
        expect(result).toContain("by Artist B - Also A Very Long Name That M...");
    }));
});
