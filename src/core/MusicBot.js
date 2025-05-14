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
exports.PlayerStatus = exports.LoopMode = exports.MusicBot = void 0;
const events_1 = require("events");
const YouTubeDLWrapper_1 = require("../integrations/YouTubeDLWrapper");
const SpotifyClient_1 = require("../integrations/SpotifyClient"); // Import SpotifyClient
const AudioPlayer_1 = require("../player/AudioPlayer");
Object.defineProperty(exports, "PlayerStatus", { enumerable: true, get: function () { return AudioPlayer_1.PlayerStatus; } });
const QueueManager_1 = require("../queue/QueueManager");
Object.defineProperty(exports, "LoopMode", { enumerable: true, get: function () { return QueueManager_1.LoopMode; } });
const CommandManager_1 = require("../commands/CommandManager");
class MusicBot extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.youtubeDLWrapper = new YouTubeDLWrapper_1.YouTubeDLWrapper(options === null || options === void 0 ? void 0 : options.ytDlpOptions);
        if (options === null || options === void 0 ? void 0 : options.spotify) {
            this.spotifyClient = new SpotifyClient_1.SpotifyClient(options.spotify);
        }
        this.audioPlayer = new AudioPlayer_1.AudioPlayer(options === null || options === void 0 ? void 0 : options.audioPlayerOptions);
        this.queueManager = new QueueManager_1.QueueManager(options === null || options === void 0 ? void 0 : options.queueOptions);
        this.commandManager = new CommandManager_1.CommandManager();
        this.commandPrefix = (options === null || options === void 0 ? void 0 : options.commandPrefix) || "!";
        this.preferSoundCloudWithYouTubeLinks = (options === null || options === void 0 ? void 0 : options.preferSoundCloudWithYouTubeLinks) || false;
        this.fallbackSearchOrder = (options === null || options === void 0 ? void 0 : options.fallbackSearchOrder) || ["spotify", "youtube", "soundcloud"];
        this.setupEventForwarding();
        this.setupInternalHandlers();
    }
    setupEventForwarding() {
        this.audioPlayer.on("trackStart", (track) => this.emit("trackStart", track));
        this.audioPlayer.on("trackEnd", (track) => this.emit("trackEnd", track, "finished"));
        this.audioPlayer.on("error", (error, track) => this.emit("trackError", error, track));
        this.audioPlayer.on("pause", (track) => this.emit("paused", track));
        this.audioPlayer.on("resume", (track) => this.emit("resumed", track));
        this.audioPlayer.on("stop", (track) => this.emit("stopped", track));
        this.audioPlayer.on("volumeChange", (volume) => this.emit("volumeChanged", volume));
        this.audioPlayer.on("queueEndCheck", () => this.handleQueueEndCheck());
        this.queueManager.on("trackAdded", (track, size) => this.emit("trackAdded", track, size));
        this.queueManager.on("trackRemoved", (track, size) => this.emit("trackRemoved", track, size));
        this.queueManager.on("queueEnd", () => this.emit("queueEnd"));
        this.queueManager.on("queueLooped", () => this.emit("queueLooped"));
        this.queueManager.on("loopModeChanged", (mode) => this.emit("loopModeChanged", mode));
        this.queueManager.on("queueShuffled", () => this.emit("shuffled"));
        this.queueManager.on("queueCleared", () => this.emit("queueCleared"));
        this.queueManager.on("error", (error) => this.emit("trackError", error, this.queueManager.nowPlaying));
    }
    setupInternalHandlers() {
        this.on("trackEnd", (_track, reason) => __awaiter(this, void 0, void 0, function* () {
            this.emit("debug", `Track ended. Reason: ${reason}. Checking for next track.`);
            this.playNextTrack();
        }));
    }
    playNextTrack() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.PLAYING && this.queueManager.getLoopMode() !== QueueManager_1.LoopMode.TRACK) {
                this.emit("debug", "Player is already playing and not in track loop. playNextTrack aborted.");
                return;
            }
            const nextTrack = this.queueManager.getNext();
            if (nextTrack) {
                try {
                    if (!nextTrack.streamUrl) {
                        this.emit("debug", `Fetching stream URL for next track: ${nextTrack.title}`);
                        // If it's a Spotify track without a direct streamUrl, we need to find it on YouTube/SoundCloud
                        if (nextTrack.source === "spotify") {
                            const query = `${nextTrack.artist} ${nextTrack.title}`;
                            this.emit("debug", `Spotify track detected, searching for streamable source for "${query}"`);
                            const ytTrack = yield this.youtubeDLWrapper.getTrackInfo(`ytsearch1:${query}`);
                            if (ytTrack && ytTrack.url) {
                                nextTrack.streamUrl = yield this.youtubeDLWrapper.getStreamUrl(ytTrack.url);
                                this.emit("debug", `Found YouTube stream for Spotify track: ${nextTrack.streamUrl}`);
                            }
                            else {
                                const scResults = yield this.youtubeDLWrapper.searchSoundCloud(query, 1);
                                if (scResults && scResults.length > 0 && scResults[0].url) {
                                    nextTrack.streamUrl = yield this.youtubeDLWrapper.getStreamUrl(scResults[0].url);
                                    this.emit("debug", `Found SoundCloud stream for Spotify track: ${nextTrack.streamUrl}`);
                                }
                                else {
                                    this.emit("trackError", new Error(`Could not find streamable source for Spotify track: ${nextTrack.title}`), nextTrack);
                                    this.playNextTrack(); // Try next in queue
                                    return;
                                }
                            }
                        }
                        else {
                            nextTrack.streamUrl = yield this.youtubeDLWrapper.getStreamUrl(nextTrack.url);
                        }
                        if (!nextTrack.streamUrl) {
                            this.emit("trackError", new Error(`Failed to get stream URL for ${nextTrack.title}`), nextTrack);
                            this.playNextTrack();
                            return;
                        }
                    }
                    yield this.audioPlayer.play(nextTrack);
                }
                catch (error) {
                    this.emit("trackError", error, nextTrack);
                    this.playNextTrack();
                }
            }
            else {
                this.emit("debug", "Queue is empty and no loop active. Playback stopped.");
            }
        });
    }
    handleQueueEndCheck() {
        this.emit("debug", "AudioPlayer signaled queueEndCheck. Checking for next track.");
        if (this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.ENDED || this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.IDLE) {
            this.playNextTrack();
        }
    }
    registerCommand(commands) {
        const cmds = Array.isArray(commands) ? commands : [commands];
        cmds.forEach(cmd => this.commandManager.registerCommand(cmd));
    }
    handleMessage(messageContent_1) {
        return __awaiter(this, arguments, void 0, function* (messageContent, platformContext = {}) {
            const context = Object.assign({ musicBot: this }, platformContext);
            yield this.commandManager.handleMessage(context, messageContent, this.commandPrefix);
        });
    }
    resolveQueryToTrack(query) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emit("debug", `Resolving query: ${query}`);
            let trackInfo = null;
            const isUrl = query.startsWith("http://") || query.startsWith("https://");
            if (isUrl) {
                trackInfo = (yield this.youtubeDLWrapper.getTrackInfo(query));
                if (trackInfo && trackInfo.source === "youtube" && this.preferSoundCloudWithYouTubeLinks && trackInfo.title) {
                    this.emit("debug", `YouTube link detected with preferSoundCloud. Searching SoundCloud for: ${trackInfo.title}`);
                    const scQuery = trackInfo.artist ? `${trackInfo.artist} ${trackInfo.title}` : trackInfo.title;
                    const scResults = yield this.youtubeDLWrapper.searchSoundCloud(scQuery, 1);
                    if (scResults && scResults.length > 0) {
                        this.emit("debug", `Found SoundCloud alternative for YouTube link: ${scResults[0].title}`);
                        trackInfo = scResults[0]; // Prefer SoundCloud result
                    }
                }
            }
            else {
                // Implement fallback search order
                for (const source of this.fallbackSearchOrder) {
                    this.emit("debug", `Searching on ${source} for: ${query}`);
                    if (source === "spotify" && this.spotifyClient) {
                        const spotifyResults = yield this.spotifyClient.searchTracks(query, 1);
                        if (spotifyResults && spotifyResults.length > 0) {
                            trackInfo = spotifyResults[0]; // Assuming SpotifyTrack is compatible with PlayableTrack
                            break;
                        }
                    }
                    else if (source === "youtube") {
                        const ytResult = yield this.youtubeDLWrapper.getTrackInfo(`ytsearch1:${query}`);
                        if (ytResult) {
                            trackInfo = ytResult;
                            break;
                        }
                    }
                    else if (source === "soundcloud") {
                        const scResults = yield this.youtubeDLWrapper.searchSoundCloud(query, 1);
                        if (scResults && scResults.length > 0) {
                            trackInfo = scResults[0];
                            break;
                        }
                    }
                }
            }
            return trackInfo;
        });
    }
    play(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, priority = false) {
            this.emit("debug", `Programmatic play request for query: ${query}`);
            const trackInfo = yield this.resolveQueryToTrack(query);
            if (!trackInfo || !trackInfo.url) {
                this.emit("trackError", new Error(`Could not find a track for query: ${query}`), null);
                return null;
            }
            // Stream URL fetching is now handled in playNextTrack or before adding to queue if playing immediately
            // For simplicity, let's ensure streamUrl is fetched if we are to play it immediately.
            if (!trackInfo.streamUrl && trackInfo.source !== "spotify") { // Spotify tracks handled in playNextTrack
                trackInfo.streamUrl = yield this.youtubeDLWrapper.getStreamUrl(trackInfo.url);
            }
            if (trackInfo.source !== "spotify" && !trackInfo.streamUrl) {
                this.emit("trackError", new Error(`Failed to get stream URL for ${trackInfo.title}`), trackInfo);
                return null;
            }
            this.queueManager.add(trackInfo, priority);
            if (this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.IDLE || this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.ENDED) {
                this.playNextTrack();
            }
            return trackInfo;
        });
    }
    skip() {
        if (this.audioPlayer.getStatus() !== AudioPlayer_1.PlayerStatus.IDLE) {
            const skippedTrack = this.audioPlayer.getCurrentTrack();
            this.audioPlayer.stop();
            this.emit("trackEnd", skippedTrack, "skipped");
        }
        else {
            this.emit("debug", "Skip called but player is idle.");
        }
    }
    pause() {
        this.audioPlayer.pause();
    }
    resume() {
        this.audioPlayer.resume();
    }
    stop() {
        this.queueManager.clear();
        this.audioPlayer.stop();
    }
    setVolume(volume) {
        this.audioPlayer.setVolume(volume);
    }
    setLoop(mode) {
        this.queueManager.setLoopMode(mode);
    }
    shuffleQueue() {
        this.queueManager.shuffle();
    }
    removeFromQueue(position) {
        return this.queueManager.remove(position);
    }
    getQueue() {
        return this.queueManager.getQueue();
    }
    getCurrentTrack() {
        return this.audioPlayer.getCurrentTrack();
    }
}
exports.MusicBot = MusicBot;
