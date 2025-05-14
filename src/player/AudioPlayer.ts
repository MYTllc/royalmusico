import { EventEmitter } from "events";
import { Readable } from "stream";
import { TrackInfo } from "../integrations/YouTubeDLWrapper"; // Adjust path as needed
import { CommandContext } from "../commands/CommandManager"; // Import CommandContext

export interface AudioPlayerOptions {
  // Placeholder for future options, e.g., volume, audio quality settings
}

export enum PlayerStatus {
  IDLE = "idle",
  PLAYING = "playing",
  PAUSED = "paused",
  BUFFERING = "buffering", // Optional: if we want to represent buffering state
  ENDED = "ended",
  ERROR = "error",
}

/**
 * Represents a track that can be played.
 */
export interface PlayableTrack extends TrackInfo {
  metadata?: CommandContext; // Optional: To store context like who requested the song, from which channel, etc.
}

export class AudioPlayer extends EventEmitter {
  private currentTrack: PlayableTrack | null = null;
  private status: PlayerStatus = PlayerStatus.IDLE;

  constructor(private options?: AudioPlayerOptions) {
    super();
  }

  public async play(track: PlayableTrack): Promise<void> {
    if (!track.streamUrl) {
      this.emit("error", new Error("Track has no streamable URL"), track);
      this.status = PlayerStatus.ERROR;
      return;
    }

    this.currentTrack = track;
    this.status = PlayerStatus.PLAYING;
    this.emit("trackStart", this.currentTrack, this.currentTrack.metadata); // Pass metadata

    console.log(`[AudioPlayer] Simulating playback of: ${track.title} from ${track.streamUrl}`);

    if (track.duration) {
      setTimeout(() => {
        if (this.currentTrack === track && this.status === PlayerStatus.PLAYING) {
          this.handleTrackFinish();
        }
      }, track.duration * 1000);
    } else {
        setTimeout(() => {
            if (this.currentTrack === track && this.status === PlayerStatus.PLAYING) {
              this.handleTrackFinish();
            }
        }, 30000); 
    }
  }

  private handleTrackFinish(): void {
    const finishedTrack = this.currentTrack;
    this.status = PlayerStatus.ENDED;
    this.currentTrack = null;
    if (finishedTrack) {
        this.emit("trackEnd", finishedTrack, "finished", finishedTrack.metadata); // Pass metadata
    }
    this.emit("queueEndCheck");
  }

  public pause(): void {
    if (this.status === PlayerStatus.PLAYING) {
      this.status = PlayerStatus.PAUSED;
      this.emit("pause", this.currentTrack, this.currentTrack?.metadata); // Pass metadata
      console.log("[AudioPlayer] Playback paused (simulated).");
    } else {
      console.warn("[AudioPlayer] Cannot pause, not currently playing.");
    }
  }

  public resume(): void {
    if (this.status === PlayerStatus.PAUSED) {
      this.status = PlayerStatus.PLAYING;
      this.emit("resume", this.currentTrack, this.currentTrack?.metadata); // Pass metadata
      console.log("[AudioPlayer] Playback resumed (simulated).");
    } else {
      console.warn("[AudioPlayer] Cannot resume, not currently paused.");
    }
  }

  public stop(): void {
    if (this.status !== PlayerStatus.IDLE && this.status !== PlayerStatus.ENDED) {
      const stoppedTrack = this.currentTrack;
      this.status = PlayerStatus.IDLE;
      this.currentTrack = null;
      this.emit("stop", stoppedTrack, stoppedTrack?.metadata); // Pass metadata
      console.log("[AudioPlayer] Playback stopped (simulated).");
    } else {
        this.emit("debug", "Stop called but player is idle or already ended.");
    }
  }

  public setVolume(volume: number): void {
    this.emit("volumeChange", volume, this.currentTrack?.metadata); // Pass metadata
    console.log(`[AudioPlayer] Volume set to ${volume} (simulated).`);
  }

  public getStatus(): PlayerStatus {
    return this.status;
  }

  public getCurrentTrack(): PlayableTrack | null {
    return this.currentTrack;
  }
}

