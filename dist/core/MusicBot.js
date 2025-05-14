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
const SpotifyClient_1 = require("../integrations/SpotifyClient");
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
        this.audioPlayer.on("trackStart", (track, context) => this.emit("trackStart", track, context));
        this.audioPlayer.on("trackEnd", (track, reason, context) => this.emit("trackEnd", track, reason, context));
        this.audioPlayer.on("error", (error, track, context) => this.emit("trackError", error, track, context));
        this.audioPlayer.on("pause", (track, context) => this.emit("paused", track, context));
        this.audioPlayer.on("resume", (track, context) => this.emit("resumed", track, context));
        this.audioPlayer.on("stop", (track, context) => this.emit("stopped", track, context));
        this.audioPlayer.on("volumeChange", (volume, context) => this.emit("volumeChanged", volume, context));
        this.audioPlayer.on("queueEndCheck", () => this.handleQueueEndCheck());
        this.queueManager.on("trackAdded", (track, size, context) => this.emit("trackAdded", track, size, context));
        this.queueManager.on("trackRemoved", (track, size, context) => this.emit("trackRemoved", track, size, context));
        this.queueManager.on("queueEnd", (context) => this.emit("queueEnd", context));
        this.queueManager.on("queueLooped", (context) => this.emit("queueLooped", context));
        this.queueManager.on("loopModeChanged", (mode, context) => this.emit("loopModeChanged", mode, context));
        this.queueManager.on("queueShuffled", (context) => this.emit("shuffled", context));
        this.queueManager.on("queueCleared", (context) => this.emit("queueCleared", context));
        this.queueManager.on("error", (error, context) => this.emit("trackError", error, this.queueManager.nowPlaying, context));
    }
    setupInternalHandlers() {
        this.on("trackEnd", (_track, reason, context) => __awaiter(this, void 0, void 0, function* () {
            this.emit("debug", `Track ended. Reason: ${reason}. Checking for next track.`, { context });
            this.playNextTrack(context);
        }));
    }
    playNextTrack(previousTrackContext) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.PLAYING && this.queueManager.getLoopMode() !== QueueManager_1.LoopMode.TRACK) {
                this.emit("debug", "Player is already playing and not in track loop. playNextTrack aborted.", { context: previousTrackContext });
                return;
            }
            const nextTrack = this.queueManager.getNext();
            if (nextTrack) {
                try {
                    // Ensure metadata from the original command context is preserved or set if track is from programmatic play
                    const trackContext = nextTrack.metadata || previousTrackContext;
                    if (!nextTrack.metadata && trackContext) {
                        nextTrack.metadata = trackContext;
                    }
                    if (!nextTrack.streamUrl) {
                        this.emit("debug", `Fetching stream URL for next track: ${nextTrack.title}`, { context: trackContext });
                        if (nextTrack.source === "spotify") {
                            const query = `${nextTrack.artist} ${nextTrack.title}`;
                            this.emit("debug", `Spotify track detected, searching for streamable source for \"${query}\"`, { context: trackContext });
                            const ytTrack = yield this.youtubeDLWrapper.getTrackInfo(`ytsearch1:${query}`);
                            if (ytTrack && ytTrack.url) {
                                const streamUrlResult = yield this.youtubeDLWrapper.getStreamUrl(ytTrack.url);
                                nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
                                this.emit("debug", `Found YouTube stream for Spotify track: ${nextTrack.streamUrl}`, { context: trackContext });
                            }
                            else {
                                const scResults = yield this.youtubeDLWrapper.searchSoundCloud(query, 1);
                                if (scResults && scResults.length > 0 && scResults[0].url) {
                                    const streamUrlResult = yield this.youtubeDLWrapper.getStreamUrl(scResults[0].url);
                                    nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
                                    this.emit("debug", `Found SoundCloud stream for Spotify track: ${nextTrack.streamUrl}`, { context: trackContext });
                                }
                                else {
                                    this.emit("trackError", new Error(`Could not find streamable source for Spotify track: ${nextTrack.title}`), nextTrack, trackContext);
                                    this.playNextTrack(trackContext);
                                    return;
                                }
                            }
                        }
                        else {
                            const streamUrlResult = yield this.youtubeDLWrapper.getStreamUrl(nextTrack.url);
                            nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
                        }
                        if (!nextTrack.streamUrl) {
                            this.emit("trackError", new Error(`Failed to get stream URL for ${nextTrack.title}`), nextTrack, trackContext);
                            this.playNextTrack(trackContext);
                            return;
                        }
                    }
                    yield this.audioPlayer.play(nextTrack); // nextTrack should have its metadata correctly set
                }
                catch (error) {
                    this.emit("trackError", error, nextTrack, (nextTrack === null || nextTrack === void 0 ? void 0 : nextTrack.metadata) || previousTrackContext);
                    this.playNextTrack((nextTrack === null || nextTrack === void 0 ? void 0 : nextTrack.metadata) || previousTrackContext);
                }
            }
            else {
                this.emit("debug", "Queue is empty and no loop active. Playback stopped.", { context: previousTrackContext });
                // Ensure queueEnd event also carries a context if available
                this.emit("queueEnd", previousTrackContext);
            }
        });
    }
    handleQueueEndCheck() {
        var _a, _b;
        this.emit("debug", "AudioPlayer signaled queueEndCheck. Checking for next track.");
        if (this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.ENDED || this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.IDLE) {
            // Try to get context from the track that just ended, if any
            const lastTrackContext = ((_a = this.audioPlayer.getCurrentTrack()) === null || _a === void 0 ? void 0 : _a.metadata) || ((_b = this.queueManager.nowPlaying) === null || _b === void 0 ? void 0 : _b.metadata);
            this.playNextTrack(lastTrackContext);
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
    resolveQueryToTrack(query, commandContext) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emit("debug", `Resolving query: ${query}`, { context: commandContext });
            let trackInfo = null;
            const isUrl = query.startsWith("http://") || query.startsWith("https://");
            if (isUrl) {
                trackInfo = (yield this.youtubeDLWrapper.getTrackInfo(query));
                if (trackInfo && trackInfo.source === "youtube" && this.preferSoundCloudWithYouTubeLinks && trackInfo.title) {
                    this.emit("debug", `YouTube link detected with preferSoundCloud. Searching SoundCloud for: ${trackInfo.title}`, { context: commandContext });
                    const scQuery = trackInfo.artist ? `${trackInfo.artist} ${trackInfo.title}` : trackInfo.title;
                    const scResults = yield this.youtubeDLWrapper.searchSoundCloud(scQuery, 1);
                    if (scResults && scResults.length > 0) {
                        this.emit("debug", `Found SoundCloud alternative for YouTube link: ${scResults[0].title}`, { context: commandContext });
                        trackInfo = scResults[0];
                    }
                }
            }
            else {
                for (const source of this.fallbackSearchOrder) {
                    this.emit("debug", `Searching on ${source} for: ${query}`, { context: commandContext });
                    if (source === "spotify" && this.spotifyClient) {
                        const spotifyResults = yield this.spotifyClient.searchTracks(query, 1);
                        if (spotifyResults && spotifyResults.length > 0) {
                            trackInfo = spotifyResults[0];
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
            if (trackInfo && commandContext) {
                trackInfo.metadata = commandContext; // Ensure metadata is set if context is available
            }
            return trackInfo;
        });
    }
    play(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, priority = false, commandContext) {
            this.emit("debug", `Programmatic play request for query: ${query}`, { context: commandContext });
            const trackInfo = yield this.resolveQueryToTrack(query, commandContext);
            if (!trackInfo || !trackInfo.url) {
                this.emit("trackError", new Error(`Could not find a track for query: ${query}`), null, commandContext);
                return null;
            }
            // Ensure metadata is set from the command context if available
            if (commandContext && !trackInfo.metadata) {
                trackInfo.metadata = commandContext;
            }
            if (!trackInfo.streamUrl && trackInfo.source !== "spotify") {
                const streamUrlResult = yield this.youtubeDLWrapper.getStreamUrl(trackInfo.url);
                trackInfo.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
            }
            if (trackInfo.source !== "spotify" && !trackInfo.streamUrl) {
                this.emit("trackError", new Error(`Failed to get stream URL for ${trackInfo.title}`), trackInfo, commandContext);
                return null;
            }
            this.queueManager.add(trackInfo, priority); // trackInfo should have metadata
            if (this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.IDLE || this.audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.ENDED) {
                this.playNextTrack(commandContext || trackInfo.metadata); // Pass context for the next play
            }
            return trackInfo;
        });
    }
    skip(context) {
        if (this.audioPlayer.getStatus() !== AudioPlayer_1.PlayerStatus.IDLE) {
            const skippedTrack = this.audioPlayer.getCurrentTrack();
            this.audioPlayer.stop();
            this.emit("trackEnd", skippedTrack, "skipped", context || (skippedTrack === null || skippedTrack === void 0 ? void 0 : skippedTrack.metadata));
        }
        else {
            this.emit("debug", "Skip called but player is idle.", { context });
        }
    }
    pause(context) {
        this.audioPlayer.pause(); // AudioPlayer will emit paused event with metadata
    }
    resume(context) {
        this.audioPlayer.resume(); // AudioPlayer will emit resumed event with metadata
    }
    stop(context) {
        this.queueManager.clear(context);
        this.audioPlayer.stop(); // AudioPlayer will emit stopped event with metadata
    }
    setVolume(volume, context) {
        this.audioPlayer.setVolume(volume); // AudioPlayer will emit volumeChanged event with metadata
    }
    setLoop(mode, context) {
        this.queueManager.setLoopMode(mode, context);
    }
    shuffleQueue(context) {
        this.queueManager.shuffle(context);
    }
    removeFromQueue(position, context) {
        // QueueManager.remove already emits trackRemoved with metadata
        // If we need to emit another event from MusicBot, we'd need the context here.
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
