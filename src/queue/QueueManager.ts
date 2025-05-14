import { EventEmitter } from "events";
import { PlayableTrack } from "../player/AudioPlayer"; // Adjust path as needed

export enum LoopMode {
  NONE = "none",
  TRACK = "track",
  QUEUE = "queue",
}

export interface QueueOptions {
  maxSize?: number;
  defaultLoop?: LoopMode;
}

export class QueueManager extends EventEmitter {
  private queue: PlayableTrack[] = [];
  private history: PlayableTrack[] = []; // For 'previous' command or replaying history
  private maxSize: number;
  private loopMode: LoopMode;
  public nowPlaying: PlayableTrack | null = null;

  constructor(options?: QueueOptions) {
    super();
    this.maxSize = options?.maxSize || 200;
    this.loopMode = options?.defaultLoop || LoopMode.NONE;
  }

  /**
   * Adds a track or multiple tracks to the queue.
   * @param {PlayableTrack | PlayableTrack[]} tracks The track(s) to add.
   * @param {boolean} [priority=false] Whether to add to the front of the queue.
   * @returns {number} The new queue size.
   */
  public add(tracks: PlayableTrack | PlayableTrack[], priority: boolean = false): number {
    const tracksToAdd = Array.isArray(tracks) ? tracks : [tracks];
    
    if (this.queue.length + tracksToAdd.length > this.maxSize) {
      this.emit("error", new Error(`Queue full. Cannot add ${tracksToAdd.length} tracks.`));
      // Optionally, only add tracks until maxSize is reached
      // tracksToAdd = tracksToAdd.slice(0, this.maxSize - this.queue.length);
      // if (tracksToAdd.length === 0) return this.queue.length;
      return this.queue.length; // Or throw error
    }

    if (priority) {
      this.queue.unshift(...tracksToAdd);
    } else {
      this.queue.push(...tracksToAdd);
    }
    tracksToAdd.forEach(track => this.emit("trackAdded", track, this.queue.length));
    return this.queue.length;
  }

  /**
   * Removes a track from the queue by its position (1-based index).
   * @param {number} position The position of the track to remove.
   * @returns {PlayableTrack | null} The removed track or null if not found.
   */
  public remove(position: number): PlayableTrack | null {
    if (position < 1 || position > this.queue.length) {
      this.emit("error", new Error(`Invalid position: ${position}. Must be between 1 and ${this.queue.length}.`));
      return null;
    }
    const removedTrack = this.queue.splice(position - 1, 1)[0];
    if (removedTrack) {
      this.emit("trackRemoved", removedTrack, this.queue.length);
    }
    return removedTrack || null;
  }

  /**
   * Gets the next track to play based on the loop mode and current queue.
   * Updates `nowPlaying` and moves track from queue to history.
   * @returns {PlayableTrack | null} The next track or null if queue is empty and no loop.
   */
  public getNext(): PlayableTrack | null {
    if (this.nowPlaying && this.loopMode === LoopMode.TRACK) {
      // For track loop, the same track is returned. AudioPlayer should handle re-streaming it.
      this.emit("trackLooped", this.nowPlaying);
      return this.nowPlaying;
    }

    let nextTrack: PlayableTrack | null = null;

    if (this.queue.length > 0) {
      nextTrack = this.queue.shift()!;
    } else if (this.loopMode === LoopMode.QUEUE && this.history.length > 0) {
      // If queue loop is on and main queue is empty, restart from history
      this.queue = [...this.history]; // Copy history to queue
      this.history = []; // Clear history as we are re-adding them
      nextTrack = this.queue.shift()!;
      this.emit("queueLooped");
    }

    if (this.nowPlaying) {
        // Add the previously playing track to history if it's not null
        // and it's not the same as the next track (in case of track loop)
        if (this.nowPlaying !== nextTrack) {
            this.history.push(this.nowPlaying);
            // Keep history size manageable if needed
            if (this.history.length > this.maxSize) { // Or a different limit for history
                this.history.shift();
            }
        }
    }

    this.nowPlaying = nextTrack;

    if (!this.nowPlaying && this.loopMode !== LoopMode.TRACK) {
      // If no next track and not looping current track, emit queueEnd
      this.emit("queueEnd");
    }
    return this.nowPlaying;
  }

  /**
   * Clears the queue.
   */
  public clear(): void {
    this.queue = [];
    this.nowPlaying = null; // Also clear now playing if queue is cleared
    // this.history = []; // Optionally clear history too
    this.emit("queueCleared");
  }

  /**
   * Shuffles the current queue.
   */
  public shuffle(): void {
    if (this.queue.length > 1) {
      for (let i = this.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
      }
      this.emit("queueShuffled");
    }
  }

  /**
   * Sets the loop mode for the queue.
   * @param {LoopMode} mode The loop mode to set.
   */
  public setLoopMode(mode: LoopMode): void {
    this.loopMode = mode;
    this.emit("loopModeChanged", this.loopMode);
  }

  public getLoopMode(): LoopMode {
    return this.loopMode;
  }

  public getQueue(): Readonly<PlayableTrack[]> {
    return this.queue;
  }

  public getHistory(): Readonly<PlayableTrack[]> {
    return this.history;
  }

  public getSize(): number {
    return this.queue.length;
  }

  // Placeholder for queue persistence (saving/loading)
  // public async saveQueue(filePath: string): Promise<void> { /* ... */ }
  // public async loadQueue(filePath: string): Promise<void> { /* ... */ }
}

