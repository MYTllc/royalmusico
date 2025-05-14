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
const PlayCommand_1 = require("../../definitions/PlayCommand");
const YouTubeDLWrapper_1 = require("../../../integrations/YouTubeDLWrapper");
const SpotifyClient_1 = require("../../../integrations/SpotifyClient");
const AudioPlayer_1 = require("../../../player/AudioPlayer");
const QueueManager_1 = require("../../../queue/QueueManager");
// Mocks
jest.mock("../../../integrations/YouTubeDLWrapper");
jest.mock("../../../integrations/SpotifyClient");
jest.mock("../../../player/AudioPlayer");
jest.mock("../../../queue/QueueManager");
const MockYouTubeDLWrapper = YouTubeDLWrapper_1.YouTubeDLWrapper;
const MockSpotifyClient = SpotifyClient_1.SpotifyClient;
const MockAudioPlayer = AudioPlayer_1.AudioPlayer;
const MockQueueManager = QueueManager_1.QueueManager;
describe("PlayCommand", () => {
    let playCommand;
    let mockMusicBot;
    let mockContext;
    let mockYtdlWrapper;
    let mockSpotifyClient;
    let mockAudioPlayer;
    let mockQueueManager;
    const youtubeTrack = {
        id: "yt123", title: "YouTube Song", url: "https://youtube.com/watch?v=yt123", source: "youtube", duration: 180, streamUrl: "http://stream.yt/yt123"
    };
    const soundcloudTrack = {
        id: "sc456", title: "SoundCloud Song", url: "https://soundcloud.com/user/sc456", source: "soundcloud", duration: 200, streamUrl: "http://stream.sc/sc456"
    };
    const spotifyTrackInfo = {
        id: "sp789", title: "Spotify Song", artist: "Spotify Artist", url: "https://open.spotify.com/track/sp789", source: "spotify", duration: 220
    };
    beforeEach(() => {
        // Reset all mocks
        MockYouTubeDLWrapper.mockClear();
        MockSpotifyClient.mockClear();
        MockAudioPlayer.mockClear();
        MockQueueManager.mockClear();
        mockYtdlWrapper = new MockYouTubeDLWrapper();
        mockSpotifyClient = new MockSpotifyClient({ clientId: "", clientSecret: "" });
        mockAudioPlayer = new MockAudioPlayer();
        mockQueueManager = new MockQueueManager();
        // Mock default implementations
        mockYtdlWrapper.getTrackInfo.mockResolvedValue(null);
        mockYtdlWrapper.searchSoundCloud.mockResolvedValue(null);
        mockYtdlWrapper.getStreamUrl.mockImplementation((url) => __awaiter(void 0, void 0, void 0, function* () { return `http://stream.from/${url.split("/").pop()}`; }));
        mockSpotifyClient.searchTracks.mockResolvedValue(null);
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.IDLE);
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
            resolveQueryToTrack: jest.fn().mockImplementation((query) => __awaiter(void 0, void 0, void 0, function* () {
                if (query.includes("youtube.com"))
                    return youtubeTrack;
                if (query.includes("soundcloud.com"))
                    return soundcloudTrack;
                if (query === "Spotify Song Spotify Artist")
                    return spotifyTrackInfo; // Simulate Spotify search result
                if (query === "YouTube Song")
                    return youtubeTrack;
                if (query === "SoundCloud Song")
                    return soundcloudTrack;
                return null;
            })),
            // Add other necessary MusicBot properties/methods if PlayCommand uses them
        };
        mockContext = { musicBot: mockMusicBot };
        playCommand = new PlayCommand_1.PlayCommand();
    });
    test("should return message if no query is provided", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield playCommand.execute(mockContext, []);
        expect(result).toBe("Please provide a song URL or search query.");
        expect(mockMusicBot.emit).not.toHaveBeenCalled();
    }));
    test("should play a YouTube URL directly if player is idle", () => __awaiter(void 0, void 0, void 0, function* () {
        mockYtdlWrapper.getTrackInfo.mockResolvedValueOnce(youtubeTrack);
        mockQueueManager.getNext.mockReturnValueOnce(youtubeTrack); // Simulate track being added and becoming next
        yield playCommand.execute(mockContext, ["https://youtube.com/watch?v=yt123"]);
        expect(mockYtdlWrapper.getTrackInfo).toHaveBeenCalledWith("https://youtube.com/watch?v=yt123");
        expect(mockQueueManager.add).toHaveBeenCalledWith(youtubeTrack);
        expect(mockAudioPlayer.play).toHaveBeenCalledWith(youtubeTrack);
        expect(mockMusicBot.emit).toHaveBeenCalledWith("debug", expect.stringContaining("Fetching track info for URL"));
    }));
    test("should add a YouTube URL to queue if player is busy", () => __awaiter(void 0, void 0, void 0, function* () {
        mockYtdlWrapper.getTrackInfo.mockResolvedValueOnce(youtubeTrack);
        mockAudioPlayer.getStatus.mockReturnValue(AudioPlayer_1.PlayerStatus.PLAYING);
        const result = yield playCommand.execute(mockContext, ["https://youtube.com/watch?v=yt123"]);
        expect(mockYtdlWrapper.getTrackInfo).toHaveBeenCalledWith("https://youtube.com/watch?v=yt123");
        expect(mockQueueManager.add).toHaveBeenCalledWith(youtubeTrack);
        expect(mockAudioPlayer.play).not.toHaveBeenCalled();
        expect(result).toBe(`Added to queue: **${youtubeTrack.title}**`);
    }));
    test("should search YouTube and play if player is idle", () => __awaiter(void 0, void 0, void 0, function* () {
        mockYtdlWrapper.getTrackInfo.mockImplementation((query) => __awaiter(void 0, void 0, void 0, function* () {
            if (query === "ytsearch1:YouTube Search Query")
                return youtubeTrack;
            return null;
        }));
        mockQueueManager.getNext.mockReturnValueOnce(youtubeTrack);
        yield playCommand.execute(mockContext, ["YouTube Search Query"]);
        expect(mockYtdlWrapper.getTrackInfo).toHaveBeenCalledWith("ytsearch1:YouTube Search Query");
        expect(mockQueueManager.add).toHaveBeenCalledWith(youtubeTrack);
        expect(mockAudioPlayer.play).toHaveBeenCalledWith(youtubeTrack);
    }));
    test("should fallback to SoundCloud search if YouTube search fails", () => __awaiter(void 0, void 0, void 0, function* () {
        mockYtdlWrapper.getTrackInfo.mockResolvedValueOnce(null); // YouTube search fails
        mockYtdlWrapper.searchSoundCloud.mockResolvedValueOnce([soundcloudTrack]);
        mockQueueManager.getNext.mockReturnValueOnce(soundcloudTrack);
        yield playCommand.execute(mockContext, ["Some Search Query"]);
        expect(mockYtdlWrapper.getTrackInfo).toHaveBeenCalledWith("ytsearch1:Some Search Query");
        expect(mockYtdlWrapper.searchSoundCloud).toHaveBeenCalledWith("Some Search Query", 1);
        expect(mockQueueManager.add).toHaveBeenCalledWith(soundcloudTrack);
        expect(mockAudioPlayer.play).toHaveBeenCalledWith(soundcloudTrack);
    }));
    test("should return error message if track is not found after all fallbacks", () => __awaiter(void 0, void 0, void 0, function* () {
        mockYtdlWrapper.getTrackInfo.mockResolvedValue(null);
        mockYtdlWrapper.searchSoundCloud.mockResolvedValue(null);
        const result = yield playCommand.execute(mockContext, ["NonExistent Track Query"]);
        expect(result).toBe("Could not find a track for \"NonExistent Track Query\". Try a different query or URL.");
        expect(mockMusicBot.emit).toHaveBeenCalledWith("error", expect.any(Error), null);
    }));
    test("should return error if stream URL cannot be fetched", () => __awaiter(void 0, void 0, void 0, function* () {
        const trackWithoutStreamUrlInitially = Object.assign(Object.assign({}, youtubeTrack), { streamUrl: undefined });
        mockYtdlWrapper.getTrackInfo.mockResolvedValueOnce(trackWithoutStreamUrlInitially);
        mockYtdlWrapper.getStreamUrl.mockResolvedValueOnce(null); // Simulate stream URL fetch failure
        const result = yield playCommand.execute(mockContext, ["https://youtube.com/watch?v=yt123"]);
        expect(mockYtdlWrapper.getStreamUrl).toHaveBeenCalledWith(youtubeTrack.url);
        expect(result).toBe(`Failed to get a playable stream for \"${youtubeTrack.title}\".`);
        expect(mockMusicBot.emit).toHaveBeenCalledWith("trackError", expect.any(Error), trackWithoutStreamUrlInitially);
    }));
});
