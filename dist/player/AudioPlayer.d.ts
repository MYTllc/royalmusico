import { EventEmitter } from "events";
import { TrackInfo } from "../integrations/YouTubeDLWrapper";
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
 * This might be extended or modified based on queue requirements.
 */
export interface PlayableTrack extends TrackInfo {
}
export declare class AudioPlayer extends EventEmitter {
    private options?;
    private currentTrack;
    private status;
    constructor(options?: AudioPlayerOptions | undefined);
    /**
     * Plays a track. The actual streaming and connection logic will be platform-specific.
     * This method should be overridden or extended by a platform-specific player.
     * @param {PlayableTrack} track The track to play.
     */
    play(track: PlayableTrack): Promise<void>;
    private handleTrackFinish;
    /**
     * Pauses the current track. Platform-specific implementation needed.
     */
    pause(): void;
    /**
     * Resumes the current track. Platform-specific implementation needed.
     */
    resume(): void;
    /**
     * Stops playback and clears the current track. Platform-specific implementation needed.
     */
    stop(): void;
    /**
     * Sets the volume. Platform-specific implementation needed.
     * @param {number} volume Volume level (e.g., 0-1 or 0-100, depends on platform).
     */
    setVolume(volume: number): void;
    getStatus(): PlayerStatus;
    getCurrentTrack(): PlayableTrack | null;
}
