import { EventEmitter } from "events";
import { PlayableTrack } from "../player/AudioPlayer";
export declare enum LoopMode {
    NONE = "none",
    TRACK = "track",
    QUEUE = "queue"
}
export interface QueueOptions {
    maxSize?: number;
    defaultLoop?: LoopMode;
}
export declare class QueueManager extends EventEmitter {
    private queue;
    private history;
    private maxSize;
    private loopMode;
    nowPlaying: PlayableTrack | null;
    constructor(options?: QueueOptions);
    /**
     * Adds a track or multiple tracks to the queue.
     * @param {PlayableTrack | PlayableTrack[]} tracks The track(s) to add.
     * @param {boolean} [priority=false] Whether to add to the front of the queue.
     * @returns {number} The new queue size.
     */
    add(tracks: PlayableTrack | PlayableTrack[], priority?: boolean): number;
    /**
     * Removes a track from the queue by its position (1-based index).
     * @param {number} position The position of the track to remove.
     * @returns {PlayableTrack | null} The removed track or null if not found.
     */
    remove(position: number): PlayableTrack | null;
    /**
     * Gets the next track to play based on the loop mode and current queue.
     * Updates `nowPlaying` and moves track from queue to history.
     * @returns {PlayableTrack | null} The next track or null if queue is empty and no loop.
     */
    getNext(): PlayableTrack | null;
    /**
     * Clears the queue.
     */
    clear(): void;
    /**
     * Shuffles the current queue.
     */
    shuffle(): void;
    /**
     * Sets the loop mode for the queue.
     * @param {LoopMode} mode The loop mode to set.
     */
    setLoopMode(mode: LoopMode): void;
    getLoopMode(): LoopMode;
    getQueue(): Readonly<PlayableTrack[]>;
    getHistory(): Readonly<PlayableTrack[]>;
    getSize(): number;
}
