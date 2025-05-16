/// <reference types="node" />
import { EventEmitter } from "events";
import { NoSubscriberBehavior } from "@discordjs/voice";
import { TrackInfo } from "../integrations/YouTubeDLWrapper";
import { CommandContext } from "../commands/CommandManager";
interface Emitter extends EventEmitter {
    emit(event: string, ...args: any[]): boolean;
}
export interface AudioPlayerOptions {
    defaultVolume?: number;
    noSubscriberBehavior?: NoSubscriberBehavior;
}
export declare enum PlayerStatus {
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
export declare class AudioPlayer extends EventEmitter {
    private voiceConnections;
    private audioPlayers;
    private currentTracks;
    private playerStatuses;
    private musicBotEmitter;
    private options;
    constructor(options?: AudioPlayerOptions, musicBotEmitter?: Emitter);
    private _getGuildPlayer;
    private _setupPlayerEventHandlers;
    private _getVoiceConnection;
    private _setupConnectionEventHandlers;
    play(track: PlayableTrack, context: CommandContext): Promise<void>;
    togglePause(guildId: string, context?: CommandContext): void;
    pause(guildId: string, context?: CommandContext): void;
    resume(guildId: string, context?: CommandContext): void;
    stop(guildId: string, context?: CommandContext): PlayableTrack | null;
    destroy(guildId: string, context?: CommandContext): void;
    setVolume(guildId: string, volumePercent: number, context?: CommandContext): void;
    getStatus(guildId: string): PlayerStatus;
    getCurrentTrack(guildId: string): PlayableTrack | null;
    isConnected(guildId: string): boolean;
    getCurrentChannelId(guildId: string): string | undefined;
    ensureConnected(guildId: string, channelId: string, interactionAdapterCreator?: any): Promise<boolean>;
    disconnect(guildId: string): void;
    disconnectAll(): void;
}
export {};
