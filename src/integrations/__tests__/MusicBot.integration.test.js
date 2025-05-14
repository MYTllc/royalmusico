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
const MusicBot_1 = require("../../core/MusicBot");
const AudioPlayer_1 = require("../../player/AudioPlayer");
const QueueManager_1 = require("../../queue/QueueManager");
// This is a simplified integration test. 
// In a real scenario, you might need more complex setup, 
// potentially mocking external dependencies like yt-dlp if network calls are made.
const mockYtDlpTrack = {
    id: "yt_integration_test",
    title: "Integration Test Song YT",
    url: "https://www.youtube.com/watch?v=test",
    streamUrl: "http://stream.example.com/test_yt",
    source: "youtube",
    duration: 180,
};
const mockScTrack = {
    id: "sc_integration_test",
    title: "Integration Test Song SC",
    url: "https://soundcloud.com/test/song",
    streamUrl: "http://stream.example.com/test_sc",
    source: "soundcloud",
    duration: 200,
};
const createMockAudioResource = () => {
    const resource = new (require("events").EventEmitter)();
    resource.play = jest.fn();
    resource.pause = jest.fn();
    resource.resume = jest.fn();
    resource.stop = jest.fn(() => setTimeout(() => resource.emit("finish"), 10)); // Simulate stop finishing
    resource.setVolume = jest.fn();
    // Simulate playback finishing after a short delay
    setTimeout(() => resource.emit("finish"), 50);
    return resource;
};
const botOptions = {
    commandPrefix: "!",
    ytDlpOptions: {
    // Assuming yt-dlp is mocked or not directly called in this simplified test
    },
    audioPlayerOptions: {
        createAudioResource: createMockAudioResource,
    },
    // No Spotify for this simple integration test to avoid external calls
};
describe("MusicBot Integration Tests", () => {
    let musicBot;
    beforeEach(() => {
        musicBot = new MusicBot_1.MusicBot(botOptions);
        // Mock the track resolution to avoid actual yt-dlp calls
        musicBot.resolveQueryToTrack = jest.fn().mockImplementation((queryOrUrl) => __awaiter(void 0, void 0, void 0, function* () {
            if (queryOrUrl.includes("youtube.com") || queryOrUrl.includes("Test Song YT")) {
                return Object.assign(Object.assign({}, mockYtDlpTrack), { streamUrl: (yield musicBot.youtubeDLWrapper.getStreamUrl(mockYtDlpTrack.url)) || mockYtDlpTrack.streamUrl });
            }
            if (queryOrUrl.includes("soundcloud.com") || queryOrUrl.includes("Test Song SC")) {
                return Object.assign(Object.assign({}, mockScTrack), { streamUrl: (yield musicBot.youtubeDLWrapper.getStreamUrl(mockScTrack.url)) || mockScTrack.streamUrl });
            }
            return null;
        }));
        // Mock getStreamUrl directly on the wrapper instance if it exists
        if (musicBot.youtubeDLWrapper) {
            musicBot.youtubeDLWrapper.getStreamUrl = jest.fn().mockImplementation((url) => __awaiter(void 0, void 0, void 0, function* () {
                if (url.includes("youtube.com"))
                    return mockYtDlpTrack.streamUrl;
                if (url.includes("soundcloud.com"))
                    return mockScTrack.streamUrl;
                return null;
            }));
        }
    });
    test("should play a song, add another, skip, and check queue", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const trackStartListener = jest.fn();
        const trackAddedListener = jest.fn();
        const trackEndListener = jest.fn();
        musicBot.on("trackStart", trackStartListener);
        musicBot.on("trackAdded", trackAddedListener);
        musicBot.on("trackEnd", trackEndListener);
        // 1. Play the first song
        yield musicBot.handleMessage("!play https://www.youtube.com/watch?v=test", {});
        // Wait for events to fire and state to update
        yield new Promise(resolve => setTimeout(resolve, 100));
        expect(trackStartListener).toHaveBeenCalledWith(expect.objectContaining({ title: "Integration Test Song YT" }));
        expect(musicBot.audioPlayer.getStatus()).toBe(AudioPlayer_1.PlayerStatus.PLAYING);
        expect((_a = musicBot.audioPlayer.getCurrentTrack()) === null || _a === void 0 ? void 0 : _a.title).toBe("Integration Test Song YT");
        // 2. Add a second song to the queue
        yield musicBot.handleMessage("!play https://soundcloud.com/test/song", {});
        yield new Promise(resolve => setTimeout(resolve, 50));
        expect(trackAddedListener).toHaveBeenCalledWith(expect.objectContaining({ title: "Integration Test Song SC" }), 1);
        expect(musicBot.queueManager.getSize()).toBe(1);
        expect(musicBot.queueManager.getQueue()[0].title).toBe("Integration Test Song SC");
        // 3. Skip the first song
        yield musicBot.handleMessage("!skip", {});
        yield new Promise(resolve => setTimeout(resolve, 100)); // Allow time for skip and next track to start
        expect(trackEndListener).toHaveBeenCalledWith(expect.objectContaining({ title: "Integration Test Song YT" }), "skipped");
        expect(trackStartListener).toHaveBeenCalledTimes(2); // Called again for the second song
        expect(trackStartListener).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Integration Test Song SC" }));
        expect(musicBot.audioPlayer.getStatus()).toBe(AudioPlayer_1.PlayerStatus.PLAYING);
        expect((_b = musicBot.audioPlayer.getCurrentTrack()) === null || _b === void 0 ? void 0 : _b.title).toBe("Integration Test Song SC");
        expect(musicBot.queueManager.getSize()).toBe(0);
        // 4. Check queue (should be empty now, with SC song playing)
        const queueResponse = yield musicBot.handleMessage("!queue", {});
        expect(queueResponse).toContain("**Now Playing:**");
        expect(queueResponse).toContain("Integration Test Song SC");
        expect(queueResponse).not.toContain("**Up Next:**");
    }));
    test("loop queue functionality", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        yield musicBot.handleMessage("!play Test Song YT", {});
        yield musicBot.handleMessage("!play Test Song SC", {});
        yield new Promise(resolve => setTimeout(resolve, 100)); // Let first song start, second be added
        expect(musicBot.queueManager.getSize()).toBe(1);
        expect((_a = musicBot.audioPlayer.getCurrentTrack()) === null || _a === void 0 ? void 0 : _a.title).toBe("Integration Test Song YT");
        yield musicBot.handleMessage("!loop queue", {});
        expect(musicBot.queueManager.getLoopMode()).toBe(QueueManager_1.LoopMode.QUEUE);
        // Skip first song
        yield musicBot.handleMessage("!skip", {});
        yield new Promise(resolve => setTimeout(resolve, 100));
        expect((_b = musicBot.audioPlayer.getCurrentTrack()) === null || _b === void 0 ? void 0 : _b.title).toBe("Integration Test Song SC");
        expect(musicBot.queueManager.getHistory().length).toBe(1); // YT song in history
        expect(musicBot.queueManager.getSize()).toBe(0);
        // Skip second song (should loop back to first song from history)
        yield musicBot.handleMessage("!skip", {});
        yield new Promise(resolve => setTimeout(resolve, 100));
        expect((_c = musicBot.audioPlayer.getCurrentTrack()) === null || _c === void 0 ? void 0 : _c.title).toBe("Integration Test Song YT");
        expect(musicBot.queueManager.getHistory().length).toBe(1); // SC song now in history
        expect(musicBot.queueManager.getSize()).toBe(1); // SC song should be back in queue
        expect(musicBot.queueManager.getQueue()[0].title).toBe("Integration Test Song SC");
    }));
});
