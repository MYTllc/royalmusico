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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicBot = void 0;
const events_1 = require("events");
const YouTubeDLWrapper_1 = require("../integrations/YouTubeDLWrapper");
const SpotifyClient_1 = require("../integrations/SpotifyClient");
const AudioPlayer_1 = require("../player/AudioPlayer");
const QueueManager_1 = require("../queue/QueueManager");
const CommandManager_1 = require("../commands/CommandManager");
const node_fetch_1 = __importDefault(require("node-fetch"));
class MusicBot extends events_1.EventEmitter {
    constructor(options) {
        var _a;
        super();
        this.reconnectAttempts = new Map();
        this.youtubeDLWrapper = new YouTubeDLWrapper_1.YouTubeDLWrapper(options === null || options === void 0 ? void 0 : options.ytDlpOptions);
        if (options === null || options === void 0 ? void 0 : options.spotify) {
            this.spotifyClient = new SpotifyClient_1.SpotifyClient(options.spotify);
        }
        this.audioPlayer = new AudioPlayer_1.AudioPlayer(options === null || options === void 0 ? void 0 : options.audioPlayerOptions, this);
        // TODO: Address QueueManager guild-specificity. For now, using a placeholder.
        this.queueManager = new QueueManager_1.QueueManager("global_placeholder_guild_id", options === null || options === void 0 ? void 0 : options.queueOptions);
        this.commandManager = new CommandManager_1.CommandManager();
        this.commandPrefix = (options === null || options === void 0 ? void 0 : options.commandPrefix) || "!";
        this.preferSoundCloudWithYouTubeLinks = (options === null || options === void 0 ? void 0 : options.preferSoundCloudWithYouTubeLinks) || false;
        this.fallbackSearchOrder = (options === null || options === void 0 ? void 0 : options.fallbackSearchOrder) || ["spotify", "youtube", "soundcloud"];
        this.webhookConfig = options === null || options === void 0 ? void 0 : options.webhookConfig;
        this.keepAliveConfig = options === null || options === void 0 ? void 0 : options.keepAliveConfig;
        this.setupEventForwarding();
        this.setupInternalHandlers();
        if ((_a = this.keepAliveConfig) === null || _a === void 0 ? void 0 : _a.enabled) {
            this.initKeepAlive(this.keepAliveConfig.guildId, this.keepAliveConfig.channelId);
        }
    }
    getGuildQueueManager(guildId, _options) {
        // Placeholder: In a real multi-guild bot, this would fetch or create a QM instance for the guild.
        // For now, it returns the single instance, assuming its methods are adapted to be guild-aware.
        // This is a known point for future architectural refinement.
        return this.queueManager;
    }
    emit(event, ...args) {
        var _a;
        const result = super.emit(event, ...args);
        if (((_a = this.webhookConfig) === null || _a === void 0 ? void 0 : _a.url) && (!this.webhookConfig.eventsToReport || this.webhookConfig.eventsToReport.includes(event))) {
            this._sendWebhookNotification(event, args).catch(err => {
                super.emit("debug", "Failed to send webhook notification", { error: err.message, event });
            });
        }
        return result;
    }
    _sendWebhookNotification(event, args) {
        const _super = Object.create(null, {
            emit: { get: () => super.emit }
        });
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!((_a = this.webhookConfig) === null || _a === void 0 ? void 0 : _a.url))
                return;
            const payload = { event, timestamp: new Date().toISOString(), data: args.map(arg => (arg instanceof Error ? { name: arg.name, message: arg.message, stack: arg.stack } : arg)) };
            try {
                yield (0, node_fetch_1.default)(this.webhookConfig.url, {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, (this.webhookConfig.secret && { 'X-Webhook-Secret': this.webhookConfig.secret })),
                    body: JSON.stringify(payload)
                });
                _super.emit.call(this, "debug", "Webhook notification sent successfully", { event });
            }
            catch (error) {
                _super.emit.call(this, "debug", "Error sending webhook notification", { error: error.message, event });
            }
        });
    }
    initKeepAlive(guildId, channelId) {
        var _a;
        this.emit("debug", "KeepAlive: Initializing...", { guildId, channelId });
        this.audioPlayer.ensureConnected(guildId, channelId)
            .then(() => this.emit("voiceConnectionUpdate", "keepAliveConnected", guildId, channelId))
            .catch(err => this.emit("voiceConnectionUpdate", "keepAliveConnectionFailed", guildId, channelId, err));
        if (this.keepAliveIntervalId)
            clearInterval(this.keepAliveIntervalId);
        this.keepAliveIntervalId = setInterval(() => {
            this._checkAndMaintainConnection(guildId, channelId);
        }, ((_a = this.keepAliveConfig) === null || _a === void 0 ? void 0 : _a.reconnectInterval) || 30000);
    }
    _checkAndMaintainConnection(guildId, channelId) {
        var _a, _b;
        const maxAttempts = ((_a = this.keepAliveConfig) === null || _a === void 0 ? void 0 : _a.maxReconnectAttempts) || 5;
        const currentAttempts = this.reconnectAttempts.get(guildId) || 0;
        if (!this.audioPlayer.isConnected(guildId) || this.audioPlayer.getCurrentChannelId(guildId) !== channelId) {
            this.emit("debug", "KeepAlive: Disconnected or in wrong channel. Attempting to reconnect...", { guildId, channelId, attempts: currentAttempts });
            if (currentAttempts < maxAttempts) {
                this.reconnectAttempts.set(guildId, currentAttempts + 1);
                this.audioPlayer.ensureConnected(guildId, channelId)
                    .then(() => {
                    this.emit("voiceConnectionUpdate", "keepAliveReconnected", guildId, channelId);
                    this.reconnectAttempts.set(guildId, 0);
                })
                    .catch(err => {
                    this.emit("voiceConnectionUpdate", "keepAliveReconnectFailed", guildId, channelId, err);
                });
            }
            else {
                this.emit("debug", "KeepAlive: Max reconnect attempts reached. Stopping keep-alive for now.", { guildId, channelId });
                if (this.keepAliveIntervalId && guildId === ((_b = this.keepAliveConfig) === null || _b === void 0 ? void 0 : _b.guildId)) {
                    clearInterval(this.keepAliveIntervalId);
                }
            }
        }
    }
    dispose() {
        if (this.keepAliveIntervalId)
            clearInterval(this.keepAliveIntervalId);
        this.audioPlayer.disconnectAll();
        this.removeAllListeners();
        this.emit("debug", "MusicBot disposed.");
    }
    setupEventForwarding() {
        this.audioPlayer.on("trackStart", (track, context) => this.emit("trackStart", track, context));
        this.audioPlayer.on("trackEnd", (track, reason, context) => this.emit("trackEnd", track, reason, context));
        this.audioPlayer.on("error", (error, track, context) => this.emit("trackError", error, track, context));
        this.audioPlayer.on("pause", (track, context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("paused", context.guildId, track, context);
        });
        this.audioPlayer.on("resume", (track, context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("resumed", context.guildId, track, context);
        });
        this.audioPlayer.on("stop", (track, context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("stopped", context.guildId, track, context);
        });
        this.audioPlayer.on("volumeChange", (volume, context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("volumeChanged", context.guildId, volume, context);
        });
        this.audioPlayer.on("queueEndCheck", (guildId) => this.handleQueueEndCheck(guildId));
        this.audioPlayer.on("voiceConnectionUpdate", (status, guildId, channelId, error) => {
            var _a;
            this.emit("voiceConnectionUpdate", status, guildId, channelId, error);
            if (status === 'disconnected' && ((_a = this.keepAliveConfig) === null || _a === void 0 ? void 0 : _a.enabled) && this.keepAliveConfig.guildId === guildId) {
                this._checkAndMaintainConnection(guildId, this.keepAliveConfig.channelId);
            }
        });
        this.queueManager.on("trackAdded", (track, size, context) => this.emit("trackAdded", track, size, context));
        this.queueManager.on("trackRemoved", (track, size, context) => this.emit("trackRemoved", track, size, context));
        this.queueManager.on("queueEnd", (context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("queueEnd", context.guildId, context);
        });
        this.queueManager.on("queueLooped", (context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("queueLooped", context.guildId, context);
        });
        this.queueManager.on("loopModeChanged", (mode, context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("loopModeChanged", context.guildId, mode, context);
        });
        this.queueManager.on("queueShuffled", (context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("shuffled", context.guildId, context);
        });
        this.queueManager.on("queueCleared", (context) => {
            if (context === null || context === void 0 ? void 0 : context.guildId)
                this.emit("queueCleared", context.guildId, context);
        });
        this.queueManager.on("error", (error, context) => {
            var _a, _b;
            const guildId = (context === null || context === void 0 ? void 0 : context.guildId) || ((_b = (_a = this.queueManager.nowPlaying) === null || _a === void 0 ? void 0 : _a.metadata) === null || _b === void 0 ? void 0 : _b.guildId);
            if (guildId)
                this.emit("trackError", error, this.queueManager.nowPlaying, context);
        });
    }
    setupInternalHandlers() {
        this.on("trackEnd", (track, reason, context) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const guildId = ((_a = track === null || track === void 0 ? void 0 : track.metadata) === null || _a === void 0 ? void 0 : _a.guildId) || (context === null || context === void 0 ? void 0 : context.guildId);
            if (!guildId) {
                this.emit("debug", "Track ended but no guildId found in context.", { track, reason, context });
                return;
            }
            this.emit("debug", `Track ended for guild ${guildId}. Reason: ${reason}. Checking for next track.`, { context });
            this.playNextTrack(guildId, context);
        }));
        this.on("queueEnd", (guildId, context) => {
            var _a;
            if (((_a = this.keepAliveConfig) === null || _a === void 0 ? void 0 : _a.enabled) && this.keepAliveConfig.guildId === guildId && this.audioPlayer.isConnected(guildId)) {
                this.emit("debug", "Queue ended, but KeepAlive is active. Player remains connected.", { guildId, context });
            }
            else {
                this.emit("debug", `Queue ended for guild ${guildId}. Player might stop if not kept alive.`, { context });
            }
        });
    }
    handleQueueEndCheck(guildId) {
        this.emit("debug", `QueueEndCheck triggered for guild ${guildId}. Playing next track.`);
        const currentTrack = this.audioPlayer.getCurrentTrack(guildId);
        this.playNextTrack(guildId, currentTrack === null || currentTrack === void 0 ? void 0 : currentTrack.metadata);
    }
    playNextTrack(guildId, previousTrackContext) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!guildId) {
                this.emit("debug", "playNextTrack called without guildId.", { previousTrackContext });
                return;
            }
            const qm = this.getGuildQueueManager(guildId);
            if (this.audioPlayer.getStatus(guildId) === AudioPlayer_1.PlayerStatus.PLAYING && qm.getLoopMode() !== QueueManager_1.LoopMode.TRACK) {
                this.emit("debug", "Player is already playing and not in track loop. playNextTrack aborted.", { guildId, context: previousTrackContext });
                return;
            }
            const nextTrack = qm.getNext(previousTrackContext);
            if (nextTrack) {
                try {
                    const trackContext = Object.assign(Object.assign({}, (nextTrack.metadata || previousTrackContext || {})), { guildId });
                    if (!nextTrack.metadata)
                        nextTrack.metadata = trackContext;
                    if (!trackContext.voiceChannelId && this.audioPlayer.isConnected(guildId)) {
                        trackContext.voiceChannelId = this.audioPlayer.getCurrentChannelId(guildId);
                    }
                    if (!trackContext.voiceChannelId) {
                        this.emit("trackError", new Error("Cannot play next track: voiceChannelId missing and bot not in channel."), nextTrack, trackContext);
                        this.playNextTrack(guildId, trackContext);
                        return;
                    }
                    if (!trackContext.interactionAdapterCreator && (previousTrackContext === null || previousTrackContext === void 0 ? void 0 : previousTrackContext.interactionAdapterCreator)) {
                        trackContext.interactionAdapterCreator = previousTrackContext.interactionAdapterCreator;
                    }
                    if (!nextTrack.streamUrl) {
                        this.emit("debug", `Fetching stream URL for next track: ${nextTrack.title}`, { guildId, context: trackContext });
                        const streamUrl = yield this._resolveStreamUrl(nextTrack, trackContext);
                        if (!streamUrl) {
                            this.emit("trackError", new Error(`Could not resolve stream URL for ${nextTrack.title}`), nextTrack, trackContext);
                            this.playNextTrack(guildId, trackContext);
                            return;
                        }
                        nextTrack.streamUrl = streamUrl;
                    }
                    yield this.audioPlayer.play(nextTrack, trackContext);
                }
                catch (error) {
                    this.emit("trackError", error, nextTrack, previousTrackContext);
                    this.playNextTrack(guildId, previousTrackContext);
                }
            }
            else {
                this.emit("queueEnd", guildId, previousTrackContext);
            }
        });
    }
    _resolveStreamUrl(track, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (track.streamUrl)
                return track.streamUrl;
            if (!track.url) {
                this.emit("debug", "Track has no URL to resolve stream from", { track, context });
                return undefined;
            }
            try {
                if (track.source === "spotify" && this.spotifyClient) {
                    const query = `${track.artist || ""} ${track.title}`.trim();
                    this.emit("debug", `Spotify track, searching for streamable source for "${query}"`, { context });
                    let ytTrack = yield this.youtubeDLWrapper.getTrackInfo(`ytsearch1:${query}`);
                    if (ytTrack && ytTrack.url) {
                        const stream = yield this.youtubeDLWrapper.getStreamUrl(ytTrack.url);
                        if (stream)
                            return stream; // Returns string | null, assign to string | undefined
                    }
                    const scResults = yield this.youtubeDLWrapper.searchSoundCloud(query, 1);
                    if (scResults && scResults.length > 0 && scResults[0].url) {
                        const stream = yield this.youtubeDLWrapper.getStreamUrl(scResults[0].url);
                        return stream !== null && stream !== void 0 ? stream : undefined; // Convert null to undefined
                    }
                    return undefined;
                }
                else {
                    const stream = yield this.youtubeDLWrapper.getStreamUrl(track.url);
                    return stream !== null && stream !== void 0 ? stream : undefined; // Convert null to undefined
                }
            }
            catch (error) {
                this.emit("trackError", new Error(`Failed to resolve stream URL: ${error.message}`), track, context);
                return undefined;
            }
        });
    }
    play(query, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!context.guildId) {
                this.emit("commandError", null, new Error("Guild ID is missing from command context."), context);
                return;
            }
            const guildId = context.guildId;
            const qm = this.getGuildQueueManager(guildId);
            try {
                let trackInfo = null;
                let tracksInfo = [];
                if (query.includes("spotify.com/track")) {
                    if (!this.spotifyClient)
                        throw new Error("Spotify client not configured.");
                    const spotifyTrack = yield this.spotifyClient.getTrack(query);
                    if (spotifyTrack)
                        trackInfo = this._spotifyToTrackInfo(spotifyTrack, context);
                }
                else if (query.includes("spotify.com/album")) {
                    if (!this.spotifyClient)
                        throw new Error("Spotify client not configured.");
                    const albumTracks = yield this.spotifyClient.getAlbumTracks(query);
                    tracksInfo = albumTracks.map(st => this._spotifyToTrackInfo(st, context));
                }
                else if (query.includes("spotify.com/playlist")) {
                    if (!this.spotifyClient)
                        throw new Error("Spotify client not configured.");
                    const playlistTracks = yield this.spotifyClient.getPlaylistTracks(query);
                    tracksInfo = playlistTracks.map(st => this._spotifyToTrackInfo(st, context));
                }
                else if (query.includes("youtube.com/playlist") || query.includes("soundcloud.com") && query.includes("/sets/")) {
                    tracksInfo = yield this.youtubeDLWrapper.getPlaylistTracks(query);
                }
                else {
                    trackInfo = yield this.youtubeDLWrapper.getTrackInfo(query, this.preferSoundCloudWithYouTubeLinks);
                }
                if (trackInfo)
                    tracksInfo.push(trackInfo);
                if (tracksInfo.length === 0) {
                    if (context.reply)
                        yield context.reply({ content: "Could not find any tracks for your query.", ephemeral: true });
                    return;
                }
                const playableTracks = [];
                for (const ti of tracksInfo) {
                    if (ti) {
                        const playableTrack = Object.assign(Object.assign({}, ti), { metadata: context, source: ti.source || (ti.url.includes("spotify") ? "spotify" : "youtube") });
                        playableTracks.push(playableTrack);
                    }
                }
                if (playableTracks.length > 0) {
                    qm.add(playableTracks, context);
                    if (context.reply && playableTracks.length === 1 && playableTracks[0]) {
                        yield context.reply({ content: `Added to queue: **${playableTracks[0].title}**`, ephemeral: false });
                    }
                    else if (context.reply) {
                        yield context.reply({ content: `Added **${playableTracks.length}** tracks to the queue.`, ephemeral: false });
                    }
                }
                if (this.audioPlayer.getStatus(guildId) !== AudioPlayer_1.PlayerStatus.PLAYING && this.audioPlayer.getStatus(guildId) !== AudioPlayer_1.PlayerStatus.PAUSED) {
                    this.playNextTrack(guildId, context);
                }
            }
            catch (error) {
                this.emit("commandError", null, error, context);
                if (context.reply)
                    yield context.reply({ content: `Error: ${error.message}`, ephemeral: true });
            }
        });
    }
    _spotifyToTrackInfo(spotifyTrack, context) {
        var _a;
        return {
            title: spotifyTrack.name,
            url: spotifyTrack.external_urls.spotify,
            artist: spotifyTrack.artists.map(a => a.name).join(", "),
            thumbnailUrl: (_a = spotifyTrack.album.images[0]) === null || _a === void 0 ? void 0 : _a.url,
            duration: Math.floor(spotifyTrack.duration_ms / 1000),
            source: "spotify",
            metadata: context,
        };
    }
    skip(context) {
        if (!context.guildId)
            return;
        const skippedTrack = this.audioPlayer.stop(context.guildId, context);
        if (skippedTrack && context.reply) {
            context.reply({ content: `Skipped: **${skippedTrack.title}**`, ephemeral: false });
        }
        else if (context.reply) {
            context.reply({ content: "Nothing to skip.", ephemeral: true });
        }
    }
    togglePause(context) {
        if (!context.guildId)
            return;
        this.audioPlayer.togglePause(context.guildId, context);
    }
    stop(context) {
        if (!context.guildId)
            return;
        const qm = this.getGuildQueueManager(context.guildId);
        qm.clear(context);
        this.audioPlayer.destroy(context.guildId, context);
        if (context.reply)
            context.reply({ content: "Player stopped and queue cleared.", ephemeral: false });
    }
    setVolume(volume, context) {
        if (!context.guildId)
            return;
        if (volume < 0 || volume > 150) {
            if (context.reply)
                context.reply({ content: "Volume must be between 0 and 150.", ephemeral: true });
            return;
        }
        this.audioPlayer.setVolume(context.guildId, volume, context);
        if (context.reply)
            context.reply({ content: `Volume set to ${volume}%`, ephemeral: false });
    }
    getQueue(context) {
        if (!context.guildId)
            return [];
        const qm = this.getGuildQueueManager(context.guildId);
        return qm.getQueue();
    }
    setLoopMode(mode, context) {
        if (!context.guildId)
            return;
        const qm = this.getGuildQueueManager(context.guildId);
        qm.setLoopMode(mode, context);
        if (context.reply)
            context.reply({ content: `Loop mode set to: ${mode}`, ephemeral: false });
    }
    shuffleQueue(context) {
        if (!context.guildId)
            return;
        const qm = this.getGuildQueueManager(context.guildId);
        qm.shuffle(context);
        if (context.reply)
            context.reply({ content: "Queue shuffled.", ephemeral: false });
    }
    removeTrack(index, context) {
        if (!context.guildId)
            return null;
        const qm = this.getGuildQueueManager(context.guildId);
        const removed = qm.remove(index, context);
        if (removed && context.reply) {
            context.reply({ content: `Removed from queue: **${removed.title}**`, ephemeral: false });
        }
        return removed;
    }
    clearQueue(context) {
        if (!context.guildId)
            return;
        const qm = this.getGuildQueueManager(context.guildId);
        qm.clear(context);
        if (context.reply)
            context.reply({ content: "Queue cleared.", ephemeral: false });
    }
    handleCommand(commandName, args, context) {
        const command = this.commandManager.getCommand(commandName);
        if (command) {
            try {
                command.execute(this, context, args);
                this.emit("commandExecuted", command, context);
            }
            catch (error) {
                this.emit("commandError", command, error, context);
            }
        }
        else {
            this.emit("unknownCommand", commandName, context);
        }
    }
}
exports.MusicBot = MusicBot;
