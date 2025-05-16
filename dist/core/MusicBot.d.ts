/// <reference types="node" />
import { EventEmitter } from "events";
import { YouTubeDLWrapper, YouTubeDLWrapperOptions } from "../integrations/YouTubeDLWrapper";
import { SpotifyClient, SpotifyConfig } from "../integrations/SpotifyClient";
import { AudioPlayer, AudioPlayerOptions, PlayableTrack } from "../player/AudioPlayer";
import { QueueManager, QueueOptions, LoopMode } from "../queue/QueueManager";
import { CommandManager, Command, CommandContext } from "../commands/CommandManager";
export interface MusicBotEvents {
    trackStart: (track: PlayableTrack, context?: CommandContext) => void;
    trackEnd: (track: PlayableTrack | null, reason?: string, context?: CommandContext) => void;
    trackError: (error: Error, track?: PlayableTrack | null, context?: CommandContext) => void;
    queueEnd: (guildId: string, context?: CommandContext) => void;
    trackAdded: (track: PlayableTrack, queueSize: number, context?: CommandContext) => void;
    trackRemoved: (track: PlayableTrack, queueSize: number, context?: CommandContext) => void;
    queueLooped: (guildId: string, context?: CommandContext) => void;
    loopModeChanged: (guildId: string, mode: LoopMode, context?: CommandContext) => void;
    volumeChanged: (guildId: string, volume: number, context?: CommandContext) => void;
    paused: (guildId: string, track?: PlayableTrack | null, context?: CommandContext) => void;
    resumed: (guildId: string, track?: PlayableTrack | null, context?: CommandContext) => void;
    stopped: (guildId: string, track?: PlayableTrack | null, context?: CommandContext) => void;
    shuffled: (guildId: string, context?: CommandContext) => void;
    queueCleared: (guildId: string, context?: CommandContext) => void;
    commandExecuted: (command: Command, context: CommandContext) => void;
    commandError: (command: Command | null, error: Error, context: CommandContext) => void;
    unknownCommand: (commandName: string, context: CommandContext) => void;
    debug: (message: string, data?: any, context?: CommandContext) => void;
    voiceConnectionUpdate: (status: string, guildId: string, channelId?: string, error?: Error) => void;
}
declare interface MusicBot {
    on<K extends keyof MusicBotEvents>(event: K, listener: MusicBotEvents[K]): this;
    once<K extends keyof MusicBotEvents>(event: K, listener: MusicBotEvents[K]): this;
    emit<K extends keyof MusicBotEvents>(event: K, ...args: Parameters<MusicBotEvents[K]>): boolean;
    off<K extends keyof MusicBotEvents>(event: K, listener: MusicBotEvents[K]): this;
    removeAllListeners<K extends keyof MusicBotEvents>(event?: K): this;
}
export interface MusicBotOptions {
    ytDlpOptions?: YouTubeDLWrapperOptions;
    audioPlayerOptions?: AudioPlayerOptions;
    queueOptions?: QueueOptions;
    commandPrefix?: string;
    spotify?: SpotifyConfig;
    preferSoundCloudWithYouTubeLinks?: boolean;
    fallbackSearchOrder?: ("spotify" | "youtube" | "soundcloud")[];
    webhookConfig?: {
        url: string;
        eventsToReport?: (keyof MusicBotEvents)[];
        secret?: string;
    };
    keepAliveConfig?: {
        enabled: boolean;
        guildId: string;
        channelId: string;
        reconnectInterval?: number;
        maxReconnectAttempts?: number;
    };
}
declare class MusicBot extends EventEmitter {
    readonly youtubeDLWrapper: YouTubeDLWrapper;
    readonly spotifyClient?: SpotifyClient;
    readonly audioPlayer: AudioPlayer;
    readonly queueManager: QueueManager;
    readonly commandManager: CommandManager;
    private commandPrefix;
    private preferSoundCloudWithYouTubeLinks;
    private fallbackSearchOrder;
    private webhookConfig?;
    private keepAliveConfig?;
    private keepAliveIntervalId?;
    private reconnectAttempts;
    constructor(options?: MusicBotOptions);
    private getGuildQueueManager;
    private _sendWebhookNotification;
    private initKeepAlive;
    private _checkAndMaintainConnection;
    dispose(): void;
    private setupEventForwarding;
    private setupInternalHandlers;
    private handleQueueEndCheck;
    private playNextTrack;
    private _resolveStreamUrl;
    play(query: string, context: CommandContext): Promise<void>;
    private _spotifyToTrackInfo;
    skip(context: CommandContext): void;
    togglePause(context: CommandContext): void;
    stop(context: CommandContext): void;
    setVolume(volume: number, context: CommandContext): void;
    getQueue(context: CommandContext): Readonly<PlayableTrack[]>;
    setLoopMode(mode: LoopMode, context: CommandContext): void;
    shuffleQueue(context: CommandContext): void;
    removeTrack(index: number, context: CommandContext): PlayableTrack | null;
    clearQueue(context: CommandContext): void;
    handleCommand(commandName: string, args: string[], context: CommandContext): void;
}
export { MusicBot };
