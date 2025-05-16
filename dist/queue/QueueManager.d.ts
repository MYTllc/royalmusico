/// <reference types="node" />
import { EventEmitter } from "events";
import { PlayableTrack } from "../player/AudioPlayer";
import { CommandContext } from "../commands/CommandManager";
export declare enum LoopMode {
    NONE = "none",
    TRACK = "track",
    QUEUE = "queue"
}
export interface QueueOptions {
    maxSize?: number;
    defaultLoopMode?: LoopMode;
    historyLimit?: number;
}
export declare class QueueManager extends EventEmitter {
    private queue;
    private history;
    private maxSize;
    private historyLimit;
    private loopMode;
    nowPlaying: PlayableTrack | null;
    private guildId;
    constructor(guildId: string, options?: QueueOptions);
    /**
     * Adds one or more tracks to the queue.
     * @param tracks - A single track or an array of tracks to add.
     * @param context - The command context for event emission.
     * @param priority - If true, adds tracks to the beginning of the queue.
     * @returns The new size of the queue, or -1 if an error occurred (e.g., queue full).
     */
    add(tracks: PlayableTrack | PlayableTrack[], context?: CommandContext, priority?: boolean): number;
    /**
     * Removes a track from the queue at a specific position.
     * @param position - The 1-based index of the track to remove.
     * @param context - The command context for event emission.
     * @returns The removed track, or null if the position was invalid.
     */
    remove(position: number, context?: CommandContext): PlayableTrack | null;
    /**
     * Gets the next track to be played based on the current queue and loop mode.
     * Updates `nowPlaying` and manages the history.
     * @param currentAudioPlayerContext - Context from the audio player, potentially the last command context.
     * @returns The next track to play, or null if the queue is empty and not looping.
     */
    getNext(currentAudioPlayerContext?: CommandContext): PlayableTrack | null;
    /**
     * Clears the entire queue. `nowPlaying` is set to null by `getNext` or player stop.
     * @param context - The command context for event emission.
     */
    clear(context?: CommandContext): void;
    /**
     * Shuffles the current queue.
     * @param context - The command context for event emission.
     */
    shuffle(context?: CommandContext): void;
    setLoopMode(mode: LoopMode, context?: CommandContext): void;
    getLoopMode(): LoopMode;
    getQueue(): Readonly<PlayableTrack[]>;
    getHistory(): Readonly<PlayableTrack[]>;
    getSize(): number;
    isEmpty(): boolean;
    /**
     * Moves a track from one position to another in the queue.
     * @param from - The 1-based index of the track to move.
     * @param to - The 1-based index of the new position for the track.
     * @param context - The command context for event emission.
     * @returns True if the move was successful, false otherwise.
     */
    move(from: number, to: number, context?: CommandContext): boolean;
    /**
     * Gets the track at a specific position in the queue without removing it.
     * @param position - The 1-based index of the track.
     * @returns The track at the specified position, or null if invalid.
     */
    getTrackAt(position: number): PlayableTrack | null;
}
