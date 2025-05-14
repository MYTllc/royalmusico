import { EventEmitter } from "events";
import { PlayableTrack } from "../player/AudioPlayer"; // Adjust path as needed
import { CommandContext } from "../commands/CommandManager"; // Import CommandContext

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
  private history: PlayableTrack[] = []; 
  private maxSize: number;
  private loopMode: LoopMode;
  public nowPlaying: PlayableTrack | null = null;

  constructor(options?: QueueOptions) {
    super();
    this.maxSize = options?.maxSize || 200;
    this.loopMode = options?.defaultLoop || LoopMode.NONE;
  }

  public add(tracks: PlayableTrack | PlayableTrack[], priority: boolean = false): number {
    const tracksToAdd = Array.isArray(tracks) ? tracks : [tracks];
    
    if (this.queue.length + tracksToAdd.length > this.maxSize) {
      const error = new Error(`Queue full. Cannot add ${tracksToAdd.length} tracks.`);
      this.emit("error", error, tracksToAdd[0]?.metadata); // Pass metadata of first track if available
      return this.queue.length; 
    }

    if (priority) {
      this.queue.unshift(...tracksToAdd);
    } else {
      this.queue.push(...tracksToAdd);
    }
    // Assuming track.metadata is set before calling add (e.g., in PlayCommand)
    tracksToAdd.forEach(track => this.emit("trackAdded", track, this.queue.length, track.metadata));
    return this.queue.length;
  }

  public remove(position: number): PlayableTrack | null {
    if (position < 1 || position > this.queue.length) {
      const error = new Error(`Invalid position: ${position}. Must be between 1 and ${this.queue.length}.`);
      // Attempt to find a context if possible, though difficult here
      this.emit("error", error, this.nowPlaying?.metadata ); 
      return null;
    }
    const removedTrack = this.queue.splice(position - 1, 1)[0];
    if (removedTrack) {
      this.emit("trackRemoved", removedTrack, this.queue.length, removedTrack.metadata);
    }
    return removedTrack || null;
  }

  public getNext(): PlayableTrack | null {
    const previousTrackContext = this.nowPlaying?.metadata;
    if (this.nowPlaying && this.loopMode === LoopMode.TRACK) {
      this.emit("trackLooped", this.nowPlaying, this.nowPlaying.metadata);
      return this.nowPlaying; // metadata is already on nowPlaying
    }

    let nextTrack: PlayableTrack | null = null;

    if (this.queue.length > 0) {
      nextTrack = this.queue.shift()!;
    } else if (this.loopMode === LoopMode.QUEUE && this.history.length > 0) {
      this.queue = [...this.history]; 
      this.history = []; 
      nextTrack = this.queue.shift()!;
      // For queueLooped, the context might be less specific, or related to the first track of the looped queue
      this.emit("queueLooped", nextTrack?.metadata); 
    }

    if (this.nowPlaying) {
        if (this.nowPlaying !== nextTrack) {
            this.history.push(this.nowPlaying);
            if (this.history.length > this.maxSize) { 
                this.history.shift();
            }
        }
    }

    this.nowPlaying = nextTrack;

    if (!this.nowPlaying && this.loopMode !== LoopMode.TRACK) {
      this.emit("queueEnd", previousTrackContext); // Pass context of the track that just ended, or last command context
    }
    return this.nowPlaying; // metadata is on the track object itself
  }

  public clear(context?: CommandContext): void {
    this.queue = [];
    const oldNowPlaying = this.nowPlaying;
    this.nowPlaying = null; 
    this.emit("queueCleared", context || oldNowPlaying?.metadata);
  }

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
    this.loopMode = mode;
    this.emit("loopModeChanged", this.loopMode, context || this.nowPlaying?.metadata);
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
}

