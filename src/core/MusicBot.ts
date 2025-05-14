import { EventEmitter } from "events";
import { YouTubeDLWrapper, YouTubeDLWrapperOptions, TrackInfo } from "../integrations/YouTubeDLWrapper";
import { SpotifyClient, SpotifyConfig, SpotifyTrack } from "../integrations/SpotifyClient"; // Import SpotifyClient
import { AudioPlayer, AudioPlayerOptions, PlayerStatus, PlayableTrack } from "../player/AudioPlayer";
import { QueueManager, QueueOptions, LoopMode } from "../queue/QueueManager";
import { CommandManager, Command, CommandContext } from "../commands/CommandManager";

// Define the events that MusicBot can emit
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
  preferSoundCloudWithYouTubeLinks?: boolean; // New option
  fallbackSearchOrder?: ("spotify" | "youtube" | "soundcloud")[]; // To control search order
}

class MusicBot extends EventEmitter {
  public readonly youtubeDLWrapper: YouTubeDLWrapper;
  public readonly spotifyClient?: SpotifyClient; // Optional SpotifyClient
  public readonly audioPlayer: AudioPlayer;
  public readonly queueManager: QueueManager;
  public readonly commandManager: CommandManager;
  private commandPrefix: string;
  private preferSoundCloudWithYouTubeLinks: boolean;
  private fallbackSearchOrder: ("spotify" | "youtube" | "soundcloud")[];

  constructor(options?: MusicBotOptions) {
    super();
    this.youtubeDLWrapper = new YouTubeDLWrapper(options?.ytDlpOptions);
    if (options?.spotify) {
      this.spotifyClient = new SpotifyClient(options.spotify);
    }
    this.audioPlayer = new AudioPlayer(options?.audioPlayerOptions);
    this.queueManager = new QueueManager(options?.queueOptions);
    this.commandManager = new CommandManager();
    this.commandPrefix = options?.commandPrefix || "!";
    this.preferSoundCloudWithYouTubeLinks = options?.preferSoundCloudWithYouTubeLinks || false;
    this.fallbackSearchOrder = options?.fallbackSearchOrder || ["spotify", "youtube", "soundcloud"];

    this.setupEventForwarding();
    this.setupInternalHandlers();
  }

  private setupEventForwarding(): void {
    this.audioPlayer.on("trackStart", (track) => this.emit("trackStart", track as PlayableTrack));
    this.audioPlayer.on("trackEnd", (track) => this.emit("trackEnd", track as PlayableTrack, "finished"));
    this.audioPlayer.on("error", (error, track) => this.emit("trackError", error, track as PlayableTrack));
    this.audioPlayer.on("pause", (track) => this.emit("paused", track as PlayableTrack));
    this.audioPlayer.on("resume", (track) => this.emit("resumed", track as PlayableTrack));
    this.audioPlayer.on("stop", (track) => this.emit("stopped", track as PlayableTrack));
    this.audioPlayer.on("volumeChange", (volume) => this.emit("volumeChanged", volume));
    this.audioPlayer.on("queueEndCheck", () => this.handleQueueEndCheck());

    this.queueManager.on("trackAdded", (track, size) => this.emit("trackAdded", track as PlayableTrack, size));
    this.queueManager.on("trackRemoved", (track, size) => this.emit("trackRemoved", track as PlayableTrack, size));
    this.queueManager.on("queueEnd", () => this.emit("queueEnd"));
    this.queueManager.on("queueLooped", () => this.emit("queueLooped"));
    this.queueManager.on("loopModeChanged", (mode) => this.emit("loopModeChanged", mode));
    this.queueManager.on("queueShuffled", () => this.emit("shuffled"));
    this.queueManager.on("queueCleared", () => this.emit("queueCleared"));
    this.queueManager.on("error", (error) => this.emit("trackError", error, this.queueManager.nowPlaying as PlayableTrack));
  }

  private setupInternalHandlers(): void {
    this.on("trackEnd", async (_track, reason) => {
        this.emit("debug", `Track ended. Reason: ${reason}. Checking for next track.`);
        this.playNextTrack();
    });
  }

  private async playNextTrack(): Promise<void> {
    if (this.audioPlayer.getStatus() === PlayerStatus.PLAYING && this.queueManager.getLoopMode() !== LoopMode.TRACK) {
        this.emit("debug", "Player is already playing and not in track loop. playNextTrack aborted.");
        return;
    }

    const nextTrack = this.queueManager.getNext();
    if (nextTrack) {
      try {
        if (!nextTrack.streamUrl) {
            this.emit("debug", `Fetching stream URL for next track: ${nextTrack.title}`);
            if (nextTrack.source === "spotify") {
                const query = `${nextTrack.artist} ${nextTrack.title}`;
                this.emit("debug", `Spotify track detected, searching for streamable source for \"${query}\"`);
                const ytTrack = await this.youtubeDLWrapper.getTrackInfo(`ytsearch1:${query}`);
                if (ytTrack && ytTrack.url) {
                    const streamUrlResult = await this.youtubeDLWrapper.getStreamUrl(ytTrack.url);
                    nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
                    this.emit("debug", `Found YouTube stream for Spotify track: ${nextTrack.streamUrl}`);
                } else {
                    const scResults = await this.youtubeDLWrapper.searchSoundCloud(query, 1);
                    if (scResults && scResults.length > 0 && scResults[0].url) {
                        const streamUrlResult = await this.youtubeDLWrapper.getStreamUrl(scResults[0].url);
                        nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
                        this.emit("debug", `Found SoundCloud stream for Spotify track: ${nextTrack.streamUrl}`);
                    } else {
                         this.emit("trackError", new Error(`Could not find streamable source for Spotify track: ${nextTrack.title}`), nextTrack);
                         this.playNextTrack();
                         return;
                    }
                }
            } else {
                 const streamUrlResult = await this.youtubeDLWrapper.getStreamUrl(nextTrack.url);
                 nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
            }
            
            if (!nextTrack.streamUrl) {
                this.emit("trackError", new Error(`Failed to get stream URL for ${nextTrack.title}`), nextTrack);
                this.playNextTrack(); 
                return;
            }
        }
        await this.audioPlayer.play(nextTrack);
      } catch (error: any) {
        this.emit("trackError", error, nextTrack);
        this.playNextTrack(); 
      }
    } else {
      this.emit("debug", "Queue is empty and no loop active. Playback stopped.");
    }
  }

  private handleQueueEndCheck(): void {
    this.emit("debug", "AudioPlayer signaled queueEndCheck. Checking for next track.");
    if (this.audioPlayer.getStatus() === PlayerStatus.ENDED || this.audioPlayer.getStatus() === PlayerStatus.IDLE) {
        this.playNextTrack();
    }
  }

  public registerCommand(commands: Command | Command[]): void {
    const cmds = Array.isArray(commands) ? commands : [commands];
    cmds.forEach(cmd => this.commandManager.registerCommand(cmd));
  }

  public async handleMessage(messageContent: string, platformContext: Partial<CommandContext> = {}): Promise<void> {
    const context: CommandContext = {
      musicBot: this,
      ...platformContext,
    };
    await this.commandManager.handleMessage(context, messageContent, this.commandPrefix);
  }

  public async resolveQueryToTrack(query: string): Promise<PlayableTrack | null> {
    this.emit("debug", `Resolving query: ${query}`);
    let trackInfo: PlayableTrack | null = null;
    const isUrl = query.startsWith("http://") || query.startsWith("https://");

    if (isUrl) {
        trackInfo = await this.youtubeDLWrapper.getTrackInfo(query) as PlayableTrack;
        if (trackInfo && trackInfo.source === "youtube" && this.preferSoundCloudWithYouTubeLinks && trackInfo.title) {
            this.emit("debug", `YouTube link detected with preferSoundCloud. Searching SoundCloud for: ${trackInfo.title}`);
            const scQuery = trackInfo.artist ? `${trackInfo.artist} ${trackInfo.title}` : trackInfo.title;
            const scResults = await this.youtubeDLWrapper.searchSoundCloud(scQuery, 1);
            if (scResults && scResults.length > 0) {
                this.emit("debug", `Found SoundCloud alternative for YouTube link: ${scResults[0].title}`);
                trackInfo = scResults[0] as PlayableTrack;
            }
        }
    } else {
        for (const source of this.fallbackSearchOrder) {
            this.emit("debug", `Searching on ${source} for: ${query}`);
            if (source === "spotify" && this.spotifyClient) {
                const spotifyResults = await this.spotifyClient.searchTracks(query, 1);
                if (spotifyResults && spotifyResults.length > 0) {
                    trackInfo = spotifyResults[0] as PlayableTrack;
                    break;
                }
            } else if (source === "youtube") {
                const ytResult = await this.youtubeDLWrapper.getTrackInfo(`ytsearch1:${query}`);
                if (ytResult) {
                    trackInfo = ytResult as PlayableTrack;
                    break;
                }
            } else if (source === "soundcloud") {
                const scResults = await this.youtubeDLWrapper.searchSoundCloud(query, 1);
                if (scResults && scResults.length > 0) {
                    trackInfo = scResults[0] as PlayableTrack;
                    break;
                }
            }
        }
    }
    return trackInfo;
  }


  public async play(query: string, priority: boolean = false): Promise<PlayableTrack | null> {
    this.emit("debug", `Programmatic play request for query: ${query}`);
    const trackInfo = await this.resolveQueryToTrack(query);

    if (!trackInfo || !trackInfo.url) {
      this.emit("trackError", new Error(`Could not find a track for query: ${query}`), null);
      return null;
    }

    if (!trackInfo.streamUrl && trackInfo.source !== "spotify") { 
        const streamUrlResult = await this.youtubeDLWrapper.getStreamUrl(trackInfo.url);
        trackInfo.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
    }

    if (trackInfo.source !== "spotify" && !trackInfo.streamUrl) {
        this.emit("trackError", new Error(`Failed to get stream URL for ${trackInfo.title}`), trackInfo);
        return null;
    }
      
    this.queueManager.add(trackInfo, priority);

    if (this.audioPlayer.getStatus() === PlayerStatus.IDLE || this.audioPlayer.getStatus() === PlayerStatus.ENDED) {
      this.playNextTrack();
    }
    return trackInfo;
  }

  public skip(): void {
    if (this.audioPlayer.getStatus() !== PlayerStatus.IDLE) {
        const skippedTrack = this.audioPlayer.getCurrentTrack();
        this.audioPlayer.stop(); 
        this.emit("trackEnd", skippedTrack as PlayableTrack, "skipped"); 
    } else {
        this.emit("debug", "Skip called but player is idle.");
    }
  }

  public pause(): void {
    this.audioPlayer.pause();
  }

  public resume(): void {
    this.audioPlayer.resume();
  }

  public stop(): void {
    this.queueManager.clear(); 
    this.audioPlayer.stop(); 
  }

  public setVolume(volume: number): void {
    this.audioPlayer.setVolume(volume);
  }

  public setLoop(mode: LoopMode): void {
    this.queueManager.setLoopMode(mode);
  }

  public shuffleQueue(): void {
    this.queueManager.shuffle();
  }

  public removeFromQueue(position: number): PlayableTrack | null {
    return this.queueManager.remove(position);
  }

  public getQueue(): Readonly<PlayableTrack[]> {
    return this.queueManager.getQueue();
  }

  public getCurrentTrack(): PlayableTrack | null {
    return this.audioPlayer.getCurrentTrack();
  }
}

export { MusicBot, TrackInfo, PlayableTrack, LoopMode, PlayerStatus, SpotifyTrack, SpotifyConfig };


