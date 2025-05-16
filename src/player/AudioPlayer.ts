import { EventEmitter } from "events";
import { Readable } from "stream";
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    VoiceConnectionStatus,
    AudioPlayerStatus,
    VoiceConnection,
    AudioPlayer as DiscordAudioPlayer,
    StreamType,
    entersState,
    NoSubscriberBehavior,
    VoiceConnectionDisconnectReason,
    VoiceConnectionDisconnectedState,
    VoiceConnectionDisconnectedWebSocketState
} from "@discordjs/voice";
import { TrackInfo } from "../integrations/YouTubeDLWrapper"; 
import { CommandContext } from "../commands/CommandManager";

interface Emitter extends EventEmitter {
    emit(event: string, ...args: any[]): boolean;
}

export interface AudioPlayerOptions {
    defaultVolume?: number; 
    noSubscriberBehavior?: NoSubscriberBehavior;
}

export enum PlayerStatus {
    IDLE = "idle",
    PLAYING = "playing",
    PAUSED = "paused",
    BUFFERING = "buffering",
    ENDED = "ended", 
    ERROR = "error",
    CONNECTING = "connecting",
    DISCONNECTED = "disconnected"
}

export interface PlayableTrack extends TrackInfo {
    metadata?: CommandContext;
    streamUrl?: string; 
}

export class AudioPlayer extends EventEmitter {
    private voiceConnections: Map<string, VoiceConnection> = new Map();
    private audioPlayers: Map<string, DiscordAudioPlayer> = new Map();
    private currentTracks: Map<string, PlayableTrack | null> = new Map();
    private playerStatuses: Map<string, PlayerStatus> = new Map();
    private musicBotEmitter: Emitter;
    private options: AudioPlayerOptions;

    constructor(options?: AudioPlayerOptions, musicBotEmitter?: Emitter) {
        super();
        this.options = {
            defaultVolume: 0.5, 
            noSubscriberBehavior: NoSubscriberBehavior.Pause,
            ...options,
        };
        this.musicBotEmitter = musicBotEmitter || this;
    }

    private _getGuildPlayer(guildId: string): DiscordAudioPlayer {
        let player = this.audioPlayers.get(guildId);
        if (!player) {
            player = createAudioPlayer({
                behaviors: {
                    noSubscriber: this.options.noSubscriberBehavior || NoSubscriberBehavior.Pause,
                },
            });
            this.audioPlayers.set(guildId, player);
            this._setupPlayerEventHandlers(guildId, player);
            this.playerStatuses.set(guildId, PlayerStatus.IDLE);
        }
        return player;
    }

    private _setupPlayerEventHandlers(guildId: string, player: DiscordAudioPlayer): void {
        player.on(AudioPlayerStatus.Idle, async () => {
            const oldTrack = this.currentTracks.get(guildId);
            this.playerStatuses.set(guildId, PlayerStatus.ENDED);
            this.currentTracks.set(guildId, null);
            if (oldTrack) {
                this.emit("trackEnd", oldTrack, "finished", oldTrack.metadata);
            }
            this.emit("queueEndCheck", guildId);
        });

        player.on(AudioPlayerStatus.Playing, () => {
            this.playerStatuses.set(guildId, PlayerStatus.PLAYING);
        });

        player.on(AudioPlayerStatus.Paused, () => {
            this.playerStatuses.set(guildId, PlayerStatus.PAUSED);
            const track = this.currentTracks.get(guildId);
            this.emit("pause", track, track?.metadata);
        });

        player.on(AudioPlayerStatus.Buffering, () => {
            this.playerStatuses.set(guildId, PlayerStatus.BUFFERING);
        });

        player.on("error", (error) => {
            const track = this.currentTracks.get(guildId);
            this.playerStatuses.set(guildId, PlayerStatus.ERROR);
            this.emit("error", error, track, track?.metadata);
            this.emit("queueEndCheck", guildId); 
        });
    }

    private async _getVoiceConnection(guildId: string, channelId: string, interactionAdapterCreator: any): Promise<VoiceConnection | undefined> {
        let connection = this.voiceConnections.get(guildId);
        if (connection && connection.joinConfig.channelId !== channelId && connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
            this.voiceConnections.delete(guildId);
            connection = undefined;
        }

        if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
            try {
                this.musicBotEmitter.emit("voiceConnectionUpdate", "connecting", guildId, channelId);
                connection = joinVoiceChannel({
                    channelId: channelId,
                    guildId: guildId,
                    adapterCreator: interactionAdapterCreator,
                    selfDeaf: true,
                });
                this.voiceConnections.set(guildId, connection);
                this._setupConnectionEventHandlers(guildId, connection);
                await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
                this.musicBotEmitter.emit("voiceConnectionUpdate", "connected", guildId, channelId);
                return connection;
            } catch (error: any) {
                this.musicBotEmitter.emit("voiceConnectionUpdate", "connectionFailed", guildId, channelId, error);
                if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    connection.destroy();
                }
                this.voiceConnections.delete(guildId);
                this.emit("error", new Error(`Failed to join voice channel: ${error.message}`), null, { guildId, voiceChannelId: channelId } as CommandContext);
                return undefined;
            }
        }
        return connection;
    }

    private _setupConnectionEventHandlers(guildId: string, connection: VoiceConnection): void {
        connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState: VoiceConnectionDisconnectedState) => {
            // The newState for a Disconnected event does not directly contain an Error object.
            // Actual errors that cause disconnection are typically caught by the connection's 'error' event listener.
            // Emitting undefined for the error parameter here.
            this.musicBotEmitter.emit("voiceConnectionUpdate", "disconnected", guildId, connection.joinConfig.channelId, undefined);
            
            if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                this.musicBotEmitter.emit("debug", `Disconnected from ${guildId}: probable kick/move. Waiting for potential auto-reconnect or keep-alive to handle.`);
            } else if (connection.rejoinAttempts < 5) {
                this.musicBotEmitter.emit("debug", `Disconnected from ${guildId}: attempting to rejoin (${connection.rejoinAttempts + 1}/5)`);
                await new Promise(resolve => setTimeout(resolve, (connection.rejoinAttempts + 1) * 5000));
                try {
                  if (connection.state.status !== VoiceConnectionStatus.Destroyed && connection.state.status !== VoiceConnectionStatus.Signalling && connection.state.status !== VoiceConnectionStatus.Ready ) {
                    connection.rejoin();
                  }
                } catch(e: any) {
                  this.musicBotEmitter.emit("debug", `Disconnected from ${guildId}: rejoin failed with error: ${e?.message}. Destroying connection.`);
                  if(connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
                }
            } else {
                this.musicBotEmitter.emit("debug", `Disconnected from ${guildId}: max rejoin attempts reached. Destroying connection.`);
                if(connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
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

        connection.on(VoiceConnectionStatus.Ready, () => {
             this.musicBotEmitter.emit("voiceConnectionUpdate", "ready", guildId, connection.joinConfig.channelId);
        });
    }

    public async play(track: PlayableTrack, context: CommandContext): Promise<void> {
        if (!context.guildId || !context.voiceChannelId || !context.interactionAdapterCreator) {
            this.emit("error", new Error("Guild ID, Voice Channel ID, or adapter creator missing in command context for play"), track, context);
            this.playerStatuses.set(context.guildId || 'unknown', PlayerStatus.ERROR);
            return;
        }
        const guildId = context.guildId;

        const connection = await this._getVoiceConnection(guildId, context.voiceChannelId, context.interactionAdapterCreator);
        if (!connection || connection.state.status !== VoiceConnectionStatus.Ready) {
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
            const resource = createAudioResource(track.streamUrl, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true
            });
            if(this.options.defaultVolume && resource.volume) resource.volume.setVolume(this.options.defaultVolume);
            
            player.play(resource);
            this.currentTracks.set(guildId, track);
            this.emit("trackStart", track, context);
        } catch (error: any) {
            this.emit("error", error, track, context);
            this.playerStatuses.set(guildId, PlayerStatus.ERROR);
            this.emit("queueEndCheck", guildId);
        }
    }

    public togglePause(guildId: string, context?: CommandContext): void {
        const player = this.audioPlayers.get(guildId);
        const status = this.playerStatuses.get(guildId);
        if (!player) return;

        if (status === PlayerStatus.PLAYING) {
            player.pause();
        } else if (status === PlayerStatus.PAUSED) {
            player.unpause();
        } else {
            this.emit("debug", "TogglePause: Player not in a state to be paused/resumed", { guildId, status });
        }
    }
    
    public pause(guildId: string, context?: CommandContext): void {
        const player = this.audioPlayers.get(guildId);
        if (player && this.playerStatuses.get(guildId) === PlayerStatus.PLAYING) {
            player.pause();
        }
    }

    public resume(guildId: string, context?: CommandContext): void {
        const player = this.audioPlayers.get(guildId);
        if (player && this.playerStatuses.get(guildId) === PlayerStatus.PAUSED) {
            player.unpause();
        }
    }

    public stop(guildId: string, context?: CommandContext): PlayableTrack | null {
        const player = this.audioPlayers.get(guildId);
        const stoppedTrack = this.currentTracks.get(guildId) || null;
        if (player) {
            player.stop(true);
        }
        return stoppedTrack;
    }

    public destroy(guildId: string, context?: CommandContext): void {
        this.emit("debug", `AudioPlayer: Destroy called for guild ${guildId}`, { context });
        const connection = this.voiceConnections.get(guildId);
        const player = this.audioPlayers.get(guildId);

        if (player && player.state.status !== AudioPlayerStatus.Idle) {
             player.stop(true);
        }
       
        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
        }
        this.audioPlayers.delete(guildId);
        this.currentTracks.delete(guildId);
        this.playerStatuses.set(guildId, PlayerStatus.IDLE);
        this.voiceConnections.delete(guildId);
        this.emit("debug", `AudioPlayer: Resources for guild ${guildId} potentially destroyed. Event handlers will confirm.`, { context });
    }

    public setVolume(guildId: string, volumePercent: number, context?: CommandContext): void {
        const player = this.audioPlayers.get(guildId);
        // @ts-ignore 
        const resource = player?._state?.resource;
        if (resource && resource.volume) {
            resource.volume.setVolume(volumePercent / 100); 
            const track = this.currentTracks.get(guildId);
            this.emit("volumeChange", volumePercent, track?.metadata || context);
        } else {
            this.emit("debug", "SetVolume: Player not playing or resource not available for inline volume.", { guildId, volumePercent });
        }
    }

    public getStatus(guildId: string): PlayerStatus {
        return this.playerStatuses.get(guildId) || PlayerStatus.IDLE;
    }

    public getCurrentTrack(guildId: string): PlayableTrack | null {
        return this.currentTracks.get(guildId) || null;
    }

    public isConnected(guildId: string): boolean {
        const conn = this.voiceConnections.get(guildId);
        return !!conn && (conn.state.status === VoiceConnectionStatus.Ready || conn.state.status === VoiceConnectionStatus.Signalling);
    }

    public getCurrentChannelId(guildId: string): string | undefined {
        const conn = this.voiceConnections.get(guildId);
        const channelId = conn?.joinConfig.channelId;
        return channelId === null ? undefined : channelId; // Ensure null is converted to undefined
    }

    public async ensureConnected(guildId: string, channelId: string, interactionAdapterCreator?: any): Promise<boolean> {
        if (!interactionAdapterCreator ) {
            const currentTrackMeta = this.currentTracks.get(guildId)?.metadata;
            if(currentTrackMeta && currentTrackMeta.interactionAdapterCreator){
                 interactionAdapterCreator = currentTrackMeta.interactionAdapterCreator;
            } else {
                 this.musicBotEmitter.emit("voiceConnectionUpdate", "ensureConnectedFailedNoAdapter", guildId, channelId);
                 this.emit("error", new Error("Cannot ensure connection: interactionAdapterCreator is missing."), null, {guildId, voiceChannelId: channelId} as CommandContext);
                 return false;
            }
        }

        let connection = this.voiceConnections.get(guildId);
        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed && connection.joinConfig.channelId === channelId) {
            if (connection.state.status === VoiceConnectionStatus.Ready) {
                return true;
            }
        }
        const newConnection = await this._getVoiceConnection(guildId, channelId, interactionAdapterCreator);
        return !!newConnection && newConnection.state.status === VoiceConnectionStatus.Ready;
    }

    public disconnect(guildId: string): void {
        const connection = this.voiceConnections.get(guildId);
        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
        }
    }
    
    public disconnectAll(): void {
        this.voiceConnections.forEach(conn => {
            if (conn.state.status !== VoiceConnectionStatus.Destroyed) {
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

