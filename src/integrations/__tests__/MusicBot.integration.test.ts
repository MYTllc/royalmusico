import { MusicBot, MusicBotOptions } from "../../core/MusicBot";
import { PlayableTrack, PlayerStatus } from "../../player/AudioPlayer";
import { LoopMode } from "../../queue/QueueManager";

// This is a simplified integration test. 
// In a real scenario, you might need more complex setup, 
// potentially mocking external dependencies like yt-dlp if network calls are made.

const mockYtDlpTrack: PlayableTrack = {
    id: "yt_integration_test",
    title: "Integration Test Song YT",
    url: "https://www.youtube.com/watch?v=test",
    streamUrl: "http://stream.example.com/test_yt",
    source: "youtube",
    duration: 180,
};

const mockScTrack: PlayableTrack = {
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

const botOptions: MusicBotOptions = {
    commandPrefix: "!",
    ytDlpOptions: {
        // Assuming yt-dlp is mocked or not directly called in this simplified test
    },
    audioPlayerOptions: {
        createAudioResource: createMockAudioResource as any,
    },
    // No Spotify for this simple integration test to avoid external calls
};

describe("MusicBot Integration Tests", () => {
    let musicBot: MusicBot;

    beforeEach(() => {
        musicBot = new MusicBot(botOptions);
        // Mock the track resolution to avoid actual yt-dlp calls
        musicBot.resolveQueryToTrack = jest.fn().mockImplementation(async (queryOrUrl: string) => {
            if (queryOrUrl.includes("youtube.com") || queryOrUrl.includes("Test Song YT")) {
                return { ...mockYtDlpTrack, streamUrl: await musicBot.youtubeDLWrapper.getStreamUrl(mockYtDlpTrack.url) || mockYtDlpTrack.streamUrl };
            }
            if (queryOrUrl.includes("soundcloud.com") || queryOrUrl.includes("Test Song SC")) {
                return { ...mockScTrack, streamUrl: await musicBot.youtubeDLWrapper.getStreamUrl(mockScTrack.url) || mockScTrack.streamUrl };
            }
            return null;
        });
        // Mock getStreamUrl directly on the wrapper instance if it exists
        if (musicBot.youtubeDLWrapper) {
            musicBot.youtubeDLWrapper.getStreamUrl = jest.fn().mockImplementation(async (url: string) => {
                if (url.includes("youtube.com")) return mockYtDlpTrack.streamUrl;
                if (url.includes("soundcloud.com")) return mockScTrack.streamUrl;
                return null;
            });
        }
    });

    test("should play a song, add another, skip, and check queue", async () => {
        const trackStartListener = jest.fn();
        const trackAddedListener = jest.fn();
        const trackEndListener = jest.fn();
        musicBot.on("trackStart", trackStartListener);
        musicBot.on("trackAdded", trackAddedListener);
        musicBot.on("trackEnd", trackEndListener);

        // 1. Play the first song
        await musicBot.handleMessage("!play https://www.youtube.com/watch?v=test", {});
        
        // Wait for events to fire and state to update
        await new Promise(resolve => setTimeout(resolve, 100)); 

        expect(trackStartListener).toHaveBeenCalledWith(expect.objectContaining({ title: "Integration Test Song YT" }));
        expect(musicBot.audioPlayer.getStatus()).toBe(PlayerStatus.PLAYING);
        expect(musicBot.audioPlayer.getCurrentTrack()?.title).toBe("Integration Test Song YT");

        // 2. Add a second song to the queue
        await musicBot.handleMessage("!play https://soundcloud.com/test/song", {});
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(trackAddedListener).toHaveBeenCalledWith(expect.objectContaining({ title: "Integration Test Song SC" }), 1);
        expect(musicBot.queueManager.getSize()).toBe(1);
        expect(musicBot.queueManager.getQueue()[0].title).toBe("Integration Test Song SC");

        // 3. Skip the first song
        await musicBot.handleMessage("!skip", {});
        await new Promise(resolve => setTimeout(resolve, 100)); // Allow time for skip and next track to start

        expect(trackEndListener).toHaveBeenCalledWith(expect.objectContaining({ title: "Integration Test Song YT" }), "skipped");
        expect(trackStartListener).toHaveBeenCalledTimes(2); // Called again for the second song
        expect(trackStartListener).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Integration Test Song SC" }));
        expect(musicBot.audioPlayer.getStatus()).toBe(PlayerStatus.PLAYING);
        expect(musicBot.audioPlayer.getCurrentTrack()?.title).toBe("Integration Test Song SC");
        expect(musicBot.queueManager.getSize()).toBe(0);

        // 4. Check queue (should be empty now, with SC song playing)
        const queueResponse = await musicBot.handleMessage("!queue", {}) as string;
        expect(queueResponse).toContain("**Now Playing:**");
        expect(queueResponse).toContain("Integration Test Song SC");
        expect(queueResponse).not.toContain("**Up Next:**");
    });

    test("loop queue functionality", async () => {
        await musicBot.handleMessage("!play Test Song YT", {});
        await musicBot.handleMessage("!play Test Song SC", {});
        await new Promise(resolve => setTimeout(resolve, 100)); // Let first song start, second be added

        expect(musicBot.queueManager.getSize()).toBe(1);
        expect(musicBot.audioPlayer.getCurrentTrack()?.title).toBe("Integration Test Song YT");

        await musicBot.handleMessage("!loop queue", {});
        expect(musicBot.queueManager.getLoopMode()).toBe(LoopMode.QUEUE);

        // Skip first song
        await musicBot.handleMessage("!skip", {});
        await new Promise(resolve => setTimeout(resolve, 100)); 
        expect(musicBot.audioPlayer.getCurrentTrack()?.title).toBe("Integration Test Song SC");
        expect(musicBot.queueManager.getHistory().length).toBe(1); // YT song in history
        expect(musicBot.queueManager.getSize()).toBe(0);

        // Skip second song (should loop back to first song from history)
        await musicBot.handleMessage("!skip", {});
        await new Promise(resolve => setTimeout(resolve, 100)); 
        
        expect(musicBot.audioPlayer.getCurrentTrack()?.title).toBe("Integration Test Song YT");
        expect(musicBot.queueManager.getHistory().length).toBe(1); // SC song now in history
        expect(musicBot.queueManager.getSize()).toBe(1); // SC song should be back in queue
        expect(musicBot.queueManager.getQueue()[0].title).toBe("Integration Test Song SC");
    });

});

