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
exports.AudioPlayer = exports.PlayerStatus = void 0;
const events_1 = require("events");
const voice_1 = require("@discordjs/voice");
var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus["IDLE"] = "idle";
    PlayerStatus["PLAYING"] = "playing";
    PlayerStatus["PAUSED"] = "paused";
    PlayerStatus["BUFFERING"] = "buffering";
    PlayerStatus["ENDED"] = "ended";
    PlayerStatus["ERROR"] = "error";
    PlayerStatus["CONNECTING"] = "connecting";
    PlayerStatus["DISCONNECTED"] = "disconnected";
})(PlayerStatus || (exports.PlayerStatus = PlayerStatus = {}));
class AudioPlayer extends events_1.EventEmitter {
    constructor(options, musicBotEmitter) {
        super();
        this.voiceConnections = new Map();
        this.audioPlayers = new Map();
        this.currentTracks = new Map();
        this.playerStatuses = new Map();
        this.options = Object.assign({ defaultVolume: 0.5, noSubscriberBehavior: voice_1.NoSubscriberBehavior.Pause }, options);
        this.musicBotEmitter = musicBotEmitter || this;
    }
    _getGuildPlayer(guildId) {
        let player = this.audioPlayers.get(guildId);
        if (!player) {
            player = (0, voice_1.createAudioPlayer)({
                behaviors: {
                    noSubscriber: this.options.noSubscriberBehavior || voice_1.NoSubscriberBehavior.Pause,
                },
            });
            this.audioPlayers.set(guildId, player);
            this._setupPlayerEventHandlers(guildId, player);
            this.playerStatuses.set(guildId, PlayerStatus.IDLE);
        }
        return player;
    }
    _setupPlayerEventHandlers(guildId, player) {
        player.on(voice_1.AudioPlayerStatus.Idle, () => __awaiter(this, void 0, void 0, function* () {
            const oldTrack = this.currentTracks.get(guildId);
            this.playerStatuses.set(guildId, PlayerStatus.ENDED);
            this.currentTracks.set(guildId, null);
            if (oldTrack) {
                this.emit("trackEnd", oldTrack, "finished", oldTrack.metadata);
            }
            this.emit("queueEndCheck", guildId);
        }));
        player.on(voice_1.AudioPlayerStatus.Playing, () => {
            this.playerStatuses.set(guildId, PlayerStatus.PLAYING);
        });
        player.on(voice_1.AudioPlayerStatus.Paused, () => {
            this.playerStatuses.set(guildId, PlayerStatus.PAUSED);
            const track = this.currentTracks.get(guildId);
            this.emit("pause", track, track === null || track === void 0 ? void 0 : track.metadata);
        });
        player.on(voice_1.AudioPlayerStatus.Buffering, () => {
            this.playerStatuses.set(guildId, PlayerStatus.BUFFERING);
        });
        player.on("error", (error) => {
            const track = this.currentTracks.get(guildId);
            this.playerStatuses.set(guildId, PlayerStatus.ERROR);
            this.emit("error", error, track, track === null || track === void 0 ? void 0 : track.metadata);
            this.emit("queueEndCheck", guildId);
        });
    }
    _getVoiceConnection(guildId, channelId, interactionAdapterCreator) {
        return __awaiter(this, void 0, void 0, function* () {
            let connection = this.voiceConnections.get(guildId);
            if (connection && connection.joinConfig.channelId !== channelId && connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                connection.destroy();
                this.voiceConnections.delete(guildId);
                connection = undefined;
            }
            if (!connection || connection.state.status === voice_1.VoiceConnectionStatus.Destroyed) {
                try {
                    this.musicBotEmitter.emit("voiceConnectionUpdate", "connecting", guildId, channelId);
                    connection = (0, voice_1.joinVoiceChannel)({
                        channelId: channelId,
                        guildId: guildId,
                        adapterCreator: interactionAdapterCreator,
                        selfDeaf: true,
                    });
                    this.voiceConnections.set(guildId, connection);
                    this._setupConnectionEventHandlers(guildId, connection);
                    yield (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Ready, 30000);
                    this.musicBotEmitter.emit("voiceConnectionUpdate", "connected", guildId, channelId);
                    return connection;
                }
                catch (error) {
                    this.musicBotEmitter.emit("voiceConnectionUpdate", "connectionFailed", guildId, channelId, error);
                    if (connection && connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                        connection.destroy();
                    }
                    this.voiceConnections.delete(guildId);
                    this.emit("error", new Error(`Failed to join voice channel: ${error.message}`), null, { guildId, voiceChannelId: channelId });
                    return undefined;
                }
            }
            return connection;
        });
    }
    _setupConnectionEventHandlers(guildId, connection) {
        connection.on(voice_1.VoiceConnectionStatus.Disconnected, (oldState, newState) => __awaiter(this, void 0, void 0, function* () {
            // The newState for a Disconnected event does not directly contain an Error object.
            // Actual errors that cause disconnection are typically caught by the connection's 'error' event listener.
            // Emitting undefined for the error parameter here.
            this.musicBotEmitter.emit("voiceConnectionUpdate", "disconnected", guildId, connection.joinConfig.channelId, undefined);
            if (newState.reason === voice_1.VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                this.musicBotEmitter.emit("debug", `Disconnected from ${guildId}: probable kick/move. Waiting for potential auto-reconnect or keep-alive to handle.`);
            }
            else if (connection.rejoinAttempts < 5) {
                this.musicBotEmitter.emit("debug", `Disconnected from ${guildId}: attempting to rejoin (${connection.rejoinAttempts + 1}/5)`);
                yield new Promise(resolve => setTimeout(resolve, (connection.rejoinAttempts + 1) * 5000));
                try {
                    if (connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed && connection.state.status !== voice_1.VoiceConnectionStatus.Signalling && connection.state.status !== voice_1.VoiceConnectionStatus.Ready) {
                        connection.rejoin();
                    }
                }
                catch (e) {
                    this.musicBotEmitter.emit("debug", `Disconnected from ${guildId}: rejoin failed with error: ${e === null || e === void 0 ? void 0 : e.message}. Destroying connection.`);
                    if (connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed)
                        connection.destroy();
                }
            }
            else {
                this.musicBotEmitter.emit("debug", `Disconnected from ${guildId}: max rejoin attempts reached. Destroying connection.`);
                if (connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed)
                    connection.destroy();
            }
        }));
        connection.on(voice_1.VoiceConnectionStatus.Destroyed, () => {
            this.musicBotEmitter.emit("voiceConnectionUpdate", "destroyed", guildId, connection.joinConfig.channelId);
            this.voiceConnections.delete(guildId);
            const player = this.audioPlayers.get(guildId);
            if (player) {
                player.stop(true);
                this.audioPlayers.delete(guildId);
            }
            this.currentTracks.delete(guildId);
            this.playerStatuses.set(guildId, PlayerStatus.IDLE);
        });
        connection.on(voice_1.VoiceConnectionStatus.Ready, () => {
            this.musicBotEmitter.emit("voiceConnectionUpdate", "ready", guildId, connection.joinConfig.channelId);
        });
    }
    play(track, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!context.guildId || !context.voiceChannelId || !context.interactionAdapterCreator) {
                this.emit("error", new Error("Guild ID, Voice Channel ID, or adapter creator missing in command context for play"), track, context);
                this.playerStatuses.set(context.guildId || 'unknown', PlayerStatus.ERROR);
                return;
            }
            const guildId = context.guildId;
            const connection = yield this._getVoiceConnection(guildId, context.voiceChannelId, context.interactionAdapterCreator);
            if (!connection || connection.state.status !== voice_1.VoiceConnectionStatus.Ready) {
                this.emit("error", new Error("Failed to establish voice connection or connection not ready."), track, context);
                this.playerStatuses.set(guildId, PlayerStatus.ERROR);
                return;
            }
            const player = this._getGuildPlayer(guildId);
            connection.subscribe(player);
            if (!track.streamUrl) {
                this.emit("error", new Error("Track has no streamable URL"), track, context);
                this.playerStatuses.set(guildId, PlayerStatus.ERROR);
                this.emit("queueEndCheck", guildId);
                return;
            }
            try {
                const resource = (0, voice_1.createAudioResource)(track.streamUrl, {
                    inputType: voice_1.StreamType.Arbitrary,
                    inlineVolume: true
                });
                if (this.options.defaultVolume && resource.volume)
                    resource.volume.setVolume(this.options.defaultVolume);
                player.play(resource);
                this.currentTracks.set(guildId, track);
                this.emit("trackStart", track, context);
            }
            catch (error) {
                this.emit("error", error, track, context);
                this.playerStatuses.set(guildId, PlayerStatus.ERROR);
                this.emit("queueEndCheck", guildId);
            }
        });
    }
    togglePause(guildId, context) {
        const player = this.audioPlayers.get(guildId);
        const status = this.playerStatuses.get(guildId);
        if (!player)
            return;
        if (status === PlayerStatus.PLAYING) {
            player.pause();
        }
        else if (status === PlayerStatus.PAUSED) {
            player.unpause();
        }
        else {
            this.emit("debug", "TogglePause: Player not in a state to be paused/resumed", { guildId, status });
        }
    }
    pause(guildId, context) {
        const player = this.audioPlayers.get(guildId);
        if (player && this.playerStatuses.get(guildId) === PlayerStatus.PLAYING) {
            player.pause();
        }
    }
    resume(guildId, context) {
        const player = this.audioPlayers.get(guildId);
        if (player && this.playerStatuses.get(guildId) === PlayerStatus.PAUSED) {
            player.unpause();
        }
    }
    stop(guildId, context) {
        const player = this.audioPlayers.get(guildId);
        const stoppedTrack = this.currentTracks.get(guildId) || null;
        if (player) {
            player.stop(true);
        }
        return stoppedTrack;
    }
    destroy(guildId, context) {
        this.emit("debug", `AudioPlayer: Destroy called for guild ${guildId}`, { context });
        const connection = this.voiceConnections.get(guildId);
        const player = this.audioPlayers.get(guildId);
        if (player && player.state.status !== voice_1.AudioPlayerStatus.Idle) {
            player.stop(true);
        }
        if (connection && connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
            connection.destroy();
        }
        this.audioPlayers.delete(guildId);
        this.currentTracks.delete(guildId);
        this.playerStatuses.set(guildId, PlayerStatus.IDLE);
        this.voiceConnections.delete(guildId);
        this.emit("debug", `AudioPlayer: Resources for guild ${guildId} potentially destroyed. Event handlers will confirm.`, { context });
    }
    setVolume(guildId, volumePercent, context) {
        var _a;
        const player = this.audioPlayers.get(guildId);
        // @ts-ignore 
        const resource = (_a = player === null || player === void 0 ? void 0 : player._state) === null || _a === void 0 ? void 0 : _a.resource;
        if (resource && resource.volume) {
            resource.volume.setVolume(volumePercent / 100);
            const track = this.currentTracks.get(guildId);
            this.emit("volumeChange", volumePercent, (track === null || track === void 0 ? void 0 : track.metadata) || context);
        }
        else {
            this.emit("debug", "SetVolume: Player not playing or resource not available for inline volume.", { guildId, volumePercent });
        }
    }
    getStatus(guildId) {
        return this.playerStatuses.get(guildId) || PlayerStatus.IDLE;
    }
    getCurrentTrack(guildId) {
        return this.currentTracks.get(guildId) || null;
    }
    isConnected(guildId) {
        const conn = this.voiceConnections.get(guildId);
        return !!conn && (conn.state.status === voice_1.VoiceConnectionStatus.Ready || conn.state.status === voice_1.VoiceConnectionStatus.Signalling);
    }
    getCurrentChannelId(guildId) {
        const conn = this.voiceConnections.get(guildId);
        const channelId = conn === null || conn === void 0 ? void 0 : conn.joinConfig.channelId;
        return channelId === null ? undefined : channelId; // Ensure null is converted to undefined
    }
    ensureConnected(guildId, channelId, interactionAdapterCreator) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!interactionAdapterCreator) {
                const currentTrackMeta = (_a = this.currentTracks.get(guildId)) === null || _a === void 0 ? void 0 : _a.metadata;
                if (currentTrackMeta && currentTrackMeta.interactionAdapterCreator) {
                    interactionAdapterCreator = currentTrackMeta.interactionAdapterCreator;
                }
                else {
                    this.musicBotEmitter.emit("voiceConnectionUpdate", "ensureConnectedFailedNoAdapter", guildId, channelId);
                    this.emit("error", new Error("Cannot ensure connection: interactionAdapterCreator is missing."), null, { guildId, voiceChannelId: channelId });
                    return false;
                }
            }
            let connection = this.voiceConnections.get(guildId);
            if (connection && connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed && connection.joinConfig.channelId === channelId) {
                if (connection.state.status === voice_1.VoiceConnectionStatus.Ready) {
                    return true;
                }
            }
            const newConnection = yield this._getVoiceConnection(guildId, channelId, interactionAdapterCreator);
            return !!newConnection && newConnection.state.status === voice_1.VoiceConnectionStatus.Ready;
        });
    }
    disconnect(guildId) {
        const connection = this.voiceConnections.get(guildId);
        if (connection && connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
            connection.destroy();
        }
    }
    disconnectAll() {
        this.voiceConnections.forEach(conn => {
            if (conn.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                conn.destroy();
            }
        });
        this.audioPlayers.forEach(player => player.stop(true));
        this.voiceConnections.clear();
        this.audioPlayers.clear();
        this.currentTracks.clear();
        this.playerStatuses.clear();
        this.emit("debug", "AudioPlayer: All connections and players destroyed.");
    }
}
exports.AudioPlayer = AudioPlayer;
