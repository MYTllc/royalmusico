import { EventEmitter } from "events";
import { YouTubeDLWrapper, YouTubeDLWrapperOptions, TrackInfo } from "../integrations/YouTubeDLWrapper";
import { SpotifyClient, SpotifyConfig, SpotifyTrack } from "../integrations/SpotifyClient";
import { AudioPlayer, AudioPlayerOptions, PlayerStatus, PlayableTrack } from "../player/AudioPlayer";
import { QueueManager, QueueOptions, LoopMode } from "../queue/QueueManager";
import { CommandManager, Command, CommandContext } from "../commands/CommandManager";
export interface MusicBotEvents {
    trackStart: (track: PlayableTrack, context?: CommandContext) => void;
    trackEnd: (track: PlayableTrack | null, reason?: string, context?: CommandContext) => void;
    trackError: (error: Error, track?: PlayableTrack | null, context?: CommandContext) => void;
    queueEnd: (context?: CommandContext) => void;
    trackAdded: (track: PlayableTrack, queueSize: number, context?: CommandContext) => void;
    trackRemoved: (track: PlayableTrack, queueSize: number, context?: CommandContext) => void;
    queueLooped: (context?: CommandContext) => void;
    loopModeChanged: (mode: LoopMode, context?: CommandContext) => void;
    volumeChanged: (volume: number, context?: CommandContext) => void;
    paused: (track?: PlayableTrack | null, context?: CommandContext) => void;
    resumed: (track?: PlayableTrack | null, context?: CommandContext) => void;
    stopped: (track?: PlayableTrack | null, context?: CommandContext) => void;
    shuffled: (context?: CommandContext) => void;
    queueCleared: (context?: CommandContext) => void;
    commandExecuted: (command: Command, context: CommandContext) => void;
    commandError: (command: Command | null, error: Error, context: CommandContext) => void;
    unknownCommand: (commandName: string, context: CommandContext) => void;
    debug: (message: string, data?: any, context?: CommandContext) => void;
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
    constructor(options?: MusicBotOptions);
    private setupEventForwarding;
    private setupInternalHandlers;
    private playNextTrack;
    private handleQueueEndCheck;
    registerCommand(commands: Command | Command[]): void;
    handleMessage(messageContent: string, platformContext?: Partial<CommandContext>): Promise<void>;
    resolveQueryToTrack(query: string, commandContext?: CommandContext): Promise<PlayableTrack | null>;
    play(query: string, priority?: boolean, commandContext?: CommandContext): Promise<PlayableTrack | null>;
    skip(context?: CommandContext): void;
    pause(context?: CommandContext): void;
    resume(context?: CommandContext): void;
    stop(context?: CommandContext): void;
    setVolume(volume: number, context?: CommandContext): void;
    setLoop(mode: LoopMode, context?: CommandContext): void;
    shuffleQueue(context?: CommandContext): void;
    removeFromQueue(position: number, context?: CommandContext): PlayableTrack | null;
    getQueue(): Readonly<PlayableTrack[]>;
    getCurrentTrack(): PlayableTrack | null;
}
export { MusicBot, TrackInfo, PlayableTrack, LoopMode, PlayerStatus, SpotifyTrack, SpotifyConfig };
