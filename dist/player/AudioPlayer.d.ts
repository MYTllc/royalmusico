import { EventEmitter } from "events";
import { TrackInfo } from "../integrations/YouTubeDLWrapper";
import { CommandContext } from "../commands/CommandManager";
export interface AudioPlayerOptions {
}
export declare enum PlayerStatus {
    IDLE = "idle",
    PLAYING = "playing",
    PAUSED = "paused",
    BUFFERING = "buffering",// Optional: if we want to represent buffering state
    ENDED = "ended",
    ERROR = "error"
}
/**
 * Represents a track that can be played.
 */
export interface PlayableTrack extends TrackInfo {
    metadata?: CommandContext;
}
export declare class AudioPlayer extends EventEmitter {
    private options?;
    private currentTrack;
    private status;
    constructor(options?: AudioPlayerOptions | undefined);
    play(track: PlayableTrack): Promise<void>;
    private handleTrackFinish;
    pause(): void;
    resume(): void;
    stop(): void;
    setVolume(volume: number): void;
    getStatus(): PlayerStatus;
    getCurrentTrack(): PlayableTrack | null;
}
