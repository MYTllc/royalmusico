import { EventEmitter } from "events";
import { PlayableTrack } from "../player/AudioPlayer"; // Assuming PlayableTrack is defined in AudioPlayer_enhanced.ts
import { CommandContext } from "../commands/CommandManager";

export enum LoopMode {
    NONE = "none",
    TRACK = "track",
    QUEUE = "queue",
}

export interface QueueOptions {
    maxSize?: number;
    defaultLoopMode?: LoopMode;
    historyLimit?: number; // Max number of tracks to keep in history
}

export class QueueManager extends EventEmitter {
    private queue: PlayableTrack[] = [];
    private history: PlayableTrack[] = []; // To store tracks that have been played
    private maxSize: number;
    private historyLimit: number;
    private loopMode: LoopMode;
    public nowPlaying: PlayableTrack | null = null;
    private guildId: string; // Assuming one QueueManager per guild, passed in constructor

    constructor(guildId: string, options?: QueueOptions) {
        super();
        this.guildId = guildId; // Store guildId for context in events or logging
        this.maxSize = options?.maxSize || 200;
        this.historyLimit = options?.historyLimit || 50; // Default history limit
        this.loopMode = options?.defaultLoopMode || LoopMode.NONE;
    }

    /**
     * Adds one or more tracks to the queue.
     * @param tracks - A single track or an array of tracks to add.
     * @param context - The command context for event emission.
     * @param priority - If true, adds tracks to the beginning of the queue.
     * @returns The new size of the queue, or -1 if an error occurred (e.g., queue full).
     */
    public add(tracks: PlayableTrack | PlayableTrack[], context?: CommandContext, priority: boolean = false): number {
        const tracksToAdd = Array.isArray(tracks) ? tracks : [tracks];

        if (this.queue.length + tracksToAdd.length > this.maxSize) {
            const error = new Error(`Queue full. Cannot add ${tracksToAdd.length} tracks. Max size is ${this.maxSize}.`);
            this.emit("error", error, context);
            return -1; // Indicate error
        }

        if (priority) {
            this.queue.unshift(...tracksToAdd);
        } else {
            this.queue.push(...tracksToAdd);
        }

        tracksToAdd.forEach(track => {
            // Ensure metadata is passed along if available from the track itself or the command context
            const eventContext = track.metadata || context;
            this.emit("trackAdded", track, this.queue.length, eventContext);
        });
        return this.queue.length;
    }

    /**
     * Removes a track from the queue at a specific position.
     * @param position - The 1-based index of the track to remove.
     * @param context - The command context for event emission.
     * @returns The removed track, or null if the position was invalid.
     */
    public remove(position: number, context?: CommandContext): PlayableTrack | null {
        if (position < 1 || position > this.queue.length) {
            const error = new Error(`Invalid position: ${position}. Must be between 1 and ${this.queue.length}.`);
            this.emit("error", error, context);
            return null;
        }

        const removedTrack = this.queue.splice(position - 1, 1)[0];
        if (removedTrack) {
            this.emit("trackRemoved", removedTrack, this.queue.length, removedTrack.metadata || context);
        }
        return removedTrack || null;
    }

    /**
     * Gets the next track to be played based on the current queue and loop mode.
     * Updates `nowPlaying` and manages the history.
     * @param currentAudioPlayerContext - Context from the audio player, potentially the last command context.
     * @returns The next track to play, or null if the queue is empty and not looping.
     */
    public getNext(currentAudioPlayerContext?: CommandContext): PlayableTrack | null {
        const previousTrack = this.nowPlaying;
        const previousTrackContext = previousTrack?.metadata || currentAudioPlayerContext;

        if (this.nowPlaying && this.loopMode === LoopMode.TRACK) {
            this.emit("trackLooped", this.nowPlaying, this.nowPlaying.metadata || previousTrackContext);
            // No change to nowPlaying, just re-emit for the same track
            return this.nowPlaying;
        }

        // Add the previously playing track to history (if it existed and wasn't a track loop)
        if (previousTrack && this.loopMode !== LoopMode.TRACK) {
            this.history.unshift(previousTrack); // Add to the beginning of history
            if (this.history.length > this.historyLimit) {
                this.history.pop(); // Remove the oldest if limit exceeded
            }
        }

        let nextTrack: PlayableTrack | null = null;
        if (this.queue.length > 0) {
            nextTrack = this.queue.shift()!;
        } else if (this.loopMode === LoopMode.QUEUE && this.history.length > 0) {
            // If queue loop is on and queue is empty, replay history
            // We take all tracks from history, clear history, and add them back to queue
            // This ensures the original order of the queue is replayed.
            this.queue = [...this.history].reverse(); // History is newest first, so reverse for queue order
            this.history = []; // Clear history as it is now the queue
            if (this.queue.length > 0) {
                nextTrack = this.queue.shift()!;
                this.emit("queueLooped", nextTrack.metadata || previousTrackContext); 
            }
        }

        this.nowPlaying = nextTrack;

        if (!this.nowPlaying && this.loopMode !== LoopMode.TRACK) {
            // Queue is truly empty and not looping a single track
            this.emit("queueEnd", previousTrackContext);
        }
        
        return this.nowPlaying; // This will have its own metadata if it exists
    }

    /**
     * Clears the entire queue. `nowPlaying` is set to null by `getNext` or player stop.
     * @param context - The command context for event emission.
     */
    public clear(context?: CommandContext): void {
        const oldQueueSize = this.queue.length;
        this.queue = [];
        // nowPlaying is typically cleared by the AudioPlayer stopping or when getNext returns null.
        // However, if a clear command is issued, we should also reflect that the queue is cleared.
        this.emit("queueCleared", context || this.nowPlaying?.metadata);
        if (oldQueueSize > 0 && !this.nowPlaying && this.queue.length === 0) {
            // If queue was cleared while nothing was playing, explicitly emit queueEnd
            this.emit("queueEnd", context);
        }
    }

    /**
     * Shuffles the current queue.
     * @param context - The command context for event emission.
     */
    public shuffle(context?: CommandContext): void {
        if (this.queue.length > 1) {
            for (let i = this.queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
            }
            this.emit("queueShuffled", context || this.nowPlaying?.metadata);
        }
    }

    public setLoopMode(mode: LoopMode, context?: CommandContext): void {
        if (this.loopMode !== mode) {
            this.loopMode = mode;
            this.emit("loopModeChanged", this.loopMode, context || this.nowPlaying?.metadata);
        }
    }

    public getLoopMode(): LoopMode {
        return this.loopMode;
    }

    public getQueue(): Readonly<PlayableTrack[]> {
        return Object.freeze([...this.queue]); // Return a frozen copy
    }

    public getHistory(): Readonly<PlayableTrack[]> {
        return Object.freeze([...this.history]); // Return a frozen copy
    }

    public getSize(): number {
        return this.queue.length;
    }

    public isEmpty(): boolean {
        return this.queue.length === 0;
    }

    /**
     * Moves a track from one position to another in the queue.
     * @param from - The 1-based index of the track to move.
     * @param to - The 1-based index of the new position for the track.
     * @param context - The command context for event emission.
     * @returns True if the move was successful, false otherwise.
     */
    public move(from: number, to: number, context?: CommandContext): boolean {
        if (from < 1 || from > this.queue.length || to < 1 || to > this.queue.length) {
            const error = new Error(`Invalid move positions: from ${from}, to ${to}. Queue size is ${this.queue.length}.`);
            this.emit("error", error, context);
            return false;
        }
        if (from === to) return true; // No change needed

        const [trackToMove] = this.queue.splice(from - 1, 1);
        this.queue.splice(to - 1, 0, trackToMove);

        this.emit("trackMoved", trackToMove, from, to, this.queue.length, trackToMove.metadata || context);
        return true;
    }

    /**
     * Gets the track at a specific position in the queue without removing it.
     * @param position - The 1-based index of the track.
     * @returns The track at the specified position, or null if invalid.
     */
    public getTrackAt(position: number): PlayableTrack | null {
        if (position < 1 || position > this.queue.length) {
            return null;
        }
        return this.queue[position - 1];
    }
}

