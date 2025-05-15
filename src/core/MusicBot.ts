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

class MusicBot extends EventEmitter {
  public readonly youtubeDLWrapper: YouTubeDLWrapper;
  public readonly spotifyClient?: SpotifyClient; 
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
    this.audioPlayer.on("trackStart", (track, context) => this.emit("trackStart", track as PlayableTrack, context));
    this.audioPlayer.on("trackEnd", (track, reason, context) => this.emit("trackEnd", track as PlayableTrack, reason, context));
    this.audioPlayer.on("error", (error, track, context) => this.emit("trackError", error, track as PlayableTrack, context));
    this.audioPlayer.on("pause", (track, context) => this.emit("paused", track as PlayableTrack, context));
    this.audioPlayer.on("resume", (track, context) => this.emit("resumed", track as PlayableTrack, context));
    this.audioPlayer.on("stop", (track, context) => this.emit("stopped", track as PlayableTrack, context));
    this.audioPlayer.on("volumeChange", (volume, context) => this.emit("volumeChanged", volume, context));
    this.audioPlayer.on("queueEndCheck", () => this.handleQueueEndCheck());

    this.queueManager.on("trackAdded", (track, size, context) => this.emit("trackAdded", track as PlayableTrack, size, context));
    this.queueManager.on("trackRemoved", (track, size, context) => this.emit("trackRemoved", track as PlayableTrack, size, context));
    this.queueManager.on("queueEnd", (context) => this.emit("queueEnd", context));
    this.queueManager.on("queueLooped", (context) => this.emit("queueLooped", context));
    this.queueManager.on("loopModeChanged", (mode, context) => this.emit("loopModeChanged", mode, context));
    this.queueManager.on("queueShuffled", (context) => this.emit("shuffled", context));
    this.queueManager.on("queueCleared", (context) => this.emit("queueCleared", context));
    this.queueManager.on("error", (error, context) => this.emit("trackError", error, this.queueManager.nowPlaying as PlayableTrack, context));
  }

  private setupInternalHandlers(): void {
    this.on("trackEnd", async (_track, reason, context) => {
        this.emit("debug", `Track ended. Reason: ${reason}. Checking for next track.`, { context });
        this.playNextTrack(context);
    });
  }

  private async playNextTrack(previousTrackContext?: CommandContext): Promise<void> {
    if (this.audioPlayer.getStatus() === PlayerStatus.PLAYING && this.queueManager.getLoopMode() !== LoopMode.TRACK) {
        this.emit("debug", "Player is already playing and not in track loop. playNextTrack aborted.", { context: previousTrackContext });
        return;
    }

    const nextTrack = this.queueManager.getNext();
    if (nextTrack) {
      try {
        // Ensure metadata from the original command context is preserved or set if track is from programmatic play
        const trackContext = nextTrack.metadata || previousTrackContext;
        if (!nextTrack.metadata && trackContext) {
            nextTrack.metadata = trackContext;
        }

        if (!nextTrack.streamUrl) {
            this.emit("debug", `Fetching stream URL for next track: ${nextTrack.title}`, { context: trackContext });
            if (nextTrack.source === "spotify") {
                const query = `${nextTrack.artist} ${nextTrack.title}`;
                this.emit("debug", `Spotify track detected, searching for streamable source for \"${query}\"`, { context: trackContext });
                const ytTrack = await this.youtubeDLWrapper.getTrackInfo(`ytsearch1:${query}`);
                if (ytTrack && ytTrack.url) {
                    const streamUrlResult = await this.youtubeDLWrapper.getStreamUrl(ytTrack.url);
                    nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
                    this.emit("debug", `Found YouTube stream for Spotify track: ${nextTrack.streamUrl}`, { context: trackContext });
                } else {
                    const scResults = await this.youtubeDLWrapper.searchSoundCloud(query, 1);
                    if (scResults && scResults.length > 0 && scResults[0].url) {
                        const streamUrlResult = await this.youtubeDLWrapper.getStreamUrl(scResults[0].url);
                        nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
                        this.emit("debug", `Found SoundCloud stream for Spotify track: ${nextTrack.streamUrl}`, { context: trackContext });
                    } else {
                         this.emit("trackError", new Error(`Could not find a playable stream for Spotify track "${nextTrack.title}". This might be due to DRM protection. Trying other sources if configured.`), nextTrack, trackContext);
                         this.playNextTrack(trackContext); 
                         return;
                    }
                }
            } else {
                 const streamUrlResult = await this.youtubeDLWrapper.getStreamUrl(nextTrack.url);
                 nextTrack.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
            }
            
            if (!nextTrack.streamUrl) {
                this.emit("trackError", new Error(`Failed to get stream URL for ${nextTrack.title}`), nextTrack, trackContext);
                this.playNextTrack(trackContext); 
                return;
            }
        }
        await this.audioPlayer.play(nextTrack); // nextTrack should have its metadata correctly set
      } catch (error: any) {
        this.emit("trackError", error, nextTrack, nextTrack?.metadata || previousTrackContext);
        this.playNextTrack(nextTrack?.metadata || previousTrackContext); 
      }
    } else {
      this.emit("debug", "Queue is empty and no loop active. Playback stopped.", { context: previousTrackContext });
      // Ensure queueEnd event also carries a context if available
      this.emit("queueEnd", previousTrackContext);
    }
  }

  private handleQueueEndCheck(): void {
    this.emit("debug", "AudioPlayer signaled queueEndCheck. Checking for next track.");
    if (this.audioPlayer.getStatus() === PlayerStatus.ENDED || this.audioPlayer.getStatus() === PlayerStatus.IDLE) {
        // Try to get context from the track that just ended, if any
        const lastTrackContext = this.audioPlayer.getCurrentTrack()?.metadata || this.queueManager.nowPlaying?.metadata;
        this.playNextTrack(lastTrackContext);
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

  public async resolveQueryToTrack(query: string, commandContext?: CommandContext): Promise<PlayableTrack | null> {
    this.emit("debug", `Resolving query: ${query}`, { context: commandContext });
    let trackInfo: PlayableTrack | null = null;
    const isUrl = query.startsWith("http://") || query.startsWith("https://");

    if (isUrl) {
        trackInfo = await this.youtubeDLWrapper.getTrackInfo(query) as PlayableTrack;
        if (trackInfo && trackInfo.source === "youtube" && this.preferSoundCloudWithYouTubeLinks && trackInfo.title) {
            this.emit("debug", `YouTube link detected with preferSoundCloud. Searching SoundCloud for: ${trackInfo.title}`, { context: commandContext });
            const scQuery = trackInfo.artist ? `${trackInfo.artist} ${trackInfo.title}` : trackInfo.title;
            const scResults = await this.youtubeDLWrapper.searchSoundCloud(scQuery, 1);
            if (scResults && scResults.length > 0) {
                this.emit("debug", `Found SoundCloud alternative for YouTube link: ${scResults[0].title}`, { context: commandContext });
                trackInfo = scResults[0] as PlayableTrack;
            }
        }
    } else {
        for (const source of this.fallbackSearchOrder) {
            this.emit("debug", `Searching on ${source} for: ${query}`, { context: commandContext });
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
    if (trackInfo && commandContext) {
        trackInfo.metadata = commandContext; // Ensure metadata is set if context is available
    }
    return trackInfo;
  }

  public async play(query: string, priority: boolean = false, commandContext?: CommandContext): Promise<PlayableTrack | null> {
    this.emit("debug", `Programmatic play request for query: ${query}`, { context: commandContext });
    const trackInfo = await this.resolveQueryToTrack(query, commandContext);

    if (!trackInfo || !trackInfo.url) {
      this.emit("trackError", new Error(`Could not find a track for query: ${query}`), null, commandContext);
      return null;
    }
    // Ensure metadata is set from the command context if available
    if (commandContext && !trackInfo.metadata) {
        trackInfo.metadata = commandContext;
    }

    if (!trackInfo.streamUrl && trackInfo.source !== "spotify") { 
        const streamUrlResult = await this.youtubeDLWrapper.getStreamUrl(trackInfo.url);
        trackInfo.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
    }

    if (trackInfo.source !== "spotify" && !trackInfo.streamUrl) {
        this.emit("trackError", new Error(`Failed to get stream URL for ${trackInfo.title}`), trackInfo, commandContext);
        return null;
    }
      
    this.queueManager.add(trackInfo, priority); // trackInfo should have metadata

    if (this.audioPlayer.getStatus() === PlayerStatus.IDLE || this.audioPlayer.getStatus() === PlayerStatus.ENDED) {
      this.playNextTrack(commandContext || trackInfo.metadata); // Pass context for the next play
    }
    return trackInfo;
  }

  public skip(context?: CommandContext): void {
    if (this.audioPlayer.getStatus() !== PlayerStatus.IDLE) {
        const skippedTrack = this.audioPlayer.getCurrentTrack();
        this.audioPlayer.stop(); 
        this.emit("trackEnd", skippedTrack as PlayableTrack, "skipped", context || skippedTrack?.metadata); 
    } else {
        this.emit("debug", "Skip called but player is idle.", { context });
    }
  }

  public pause(context?: CommandContext): void {
    this.audioPlayer.pause(); // AudioPlayer will emit paused event with metadata
  }

  public resume(context?: CommandContext): void {
    this.audioPlayer.resume(); // AudioPlayer will emit resumed event with metadata
  }

  public stop(context?: CommandContext): void {
    this.queueManager.clear(context); 
    this.audioPlayer.stop(); // AudioPlayer will emit stopped event with metadata
  }

  public setVolume(volume: number, context?: CommandContext): void {
    this.audioPlayer.setVolume(volume); // AudioPlayer will emit volumeChanged event with metadata
  }

  public setLoop(mode: LoopMode, context?: CommandContext): void {
    this.queueManager.setLoopMode(mode, context);
  }

  public shuffleQueue(context?: CommandContext): void {
    this.queueManager.shuffle(context);
  }

  public removeFromQueue(position: number, context?: CommandContext): PlayableTrack | null {
    // QueueManager.remove already emits trackRemoved with metadata
    // If we need to emit another event from MusicBot, we'd need the context here.
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

