import { EventEmitter } from "events";
import { YouTubeDLWrapper, YouTubeDLWrapperOptions, TrackInfo } from "../integrations/YouTubeDLWrapper";
import { SpotifyClient, SpotifyConfig, SpotifyTrack } from "../integrations/SpotifyClient";
import { AudioPlayer, AudioPlayerOptions, PlayerStatus, PlayableTrack } from "../player/AudioPlayer";
import { QueueManager, QueueOptions, LoopMode } from "../queue/QueueManager";
import { CommandManager, Command, CommandContext } from "../commands/CommandManager";
import fetch from 'node-fetch'; 

export interface MusicBotEvents {
    trackStart: (track: PlayableTrack, context?: CommandContext) => void;
    trackEnd: (track: PlayableTrack | null, reason?: string, context?: CommandContext) => void;
    trackError: (error: Error, track?: PlayableTrack | null, context?: CommandContext) => void;
    queueEnd: (guildId: string, context?: CommandContext) => void; 
    trackAdded: (track: PlayableTrack, queueSize: number, context?: CommandContext) => void;
    trackRemoved: (track: PlayableTrack, queueSize: number, context?: CommandContext) => void;
    queueLooped: (guildId: string, context?: CommandContext) => void; 
    loopModeChanged: (guildId: string, mode: LoopMode, context?: CommandContext) => void; 
    volumeChanged: (guildId: string, volume: number, context?: CommandContext) => void; 
    paused: (guildId: string, track?: PlayableTrack | null, context?: CommandContext) => void; 
    resumed: (guildId: string, track?: PlayableTrack | null, context?: CommandContext) => void; 
    stopped: (guildId: string, track?: PlayableTrack | null, context?: CommandContext) => void; 
    shuffled: (guildId: string, context?: CommandContext) => void; 
    queueCleared: (guildId: string, context?: CommandContext) => void; 
    commandExecuted: (command: Command, context: CommandContext) => void;
    commandError: (command: Command | null, error: Error, context: CommandContext) => void;
    unknownCommand: (commandName: string, context: CommandContext) => void;
    debug: (message: string, data?: any, context?: CommandContext) => void;
    voiceConnectionUpdate: (status: string, guildId: string, channelId?: string, error?: Error) => void;
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
    webhookConfig?: {
        url: string;
        eventsToReport?: (keyof MusicBotEvents)[];
        secret?: string;
    };
    keepAliveConfig?: {
        enabled: boolean;
        guildId: string; 
        channelId: string;
        reconnectInterval?: number;
        maxReconnectAttempts?: number;
    };
}

class MusicBot extends EventEmitter {
    public readonly youtubeDLWrapper: YouTubeDLWrapper;
    public readonly spotifyClient?: SpotifyClient;
    public readonly audioPlayer: AudioPlayer;
    public readonly queueManager: QueueManager; // Assuming this will be made guild-aware or a map of QMs
    public readonly commandManager: CommandManager;
    private commandPrefix: string;
    private preferSoundCloudWithYouTubeLinks: boolean;
    private fallbackSearchOrder: ("spotify" | "youtube" | "soundcloud")[];
    private webhookConfig?: MusicBotOptions['webhookConfig'];
    private keepAliveConfig?: MusicBotOptions['keepAliveConfig'];
    private keepAliveIntervalId?: NodeJS.Timeout;
    private reconnectAttempts: Map<string, number> = new Map();

    constructor(options?: MusicBotOptions) {
        super();
        this.youtubeDLWrapper = new YouTubeDLWrapper(options?.ytDlpOptions);
        if (options?.spotify) {
            this.spotifyClient = new SpotifyClient(options.spotify);
        }
        this.audioPlayer = new AudioPlayer(options?.audioPlayerOptions, this);
        // TODO: Address QueueManager guild-specificity. For now, using a placeholder.
        this.queueManager = new QueueManager("global_placeholder_guild_id", options?.queueOptions);
        this.commandManager = new CommandManager();
        this.commandPrefix = options?.commandPrefix || "!";
        this.preferSoundCloudWithYouTubeLinks = options?.preferSoundCloudWithYouTubeLinks || false;
        this.fallbackSearchOrder = options?.fallbackSearchOrder || ["spotify", "youtube", "soundcloud"];
        this.webhookConfig = options?.webhookConfig;
        this.keepAliveConfig = options?.keepAliveConfig;

        this.setupEventForwarding();
        this.setupInternalHandlers();
        if (this.keepAliveConfig?.enabled) {
            this.initKeepAlive(this.keepAliveConfig.guildId, this.keepAliveConfig.channelId);
        }
    }
    
    private getGuildQueueManager(guildId: string, _options?: QueueOptions): QueueManager {
        // Placeholder: In a real multi-guild bot, this would fetch or create a QM instance for the guild.
        // For now, it returns the single instance, assuming its methods are adapted to be guild-aware.
        // This is a known point for future architectural refinement.
        return this.queueManager; 
    }

    public emit<K extends keyof MusicBotEvents>(event: K, ...args: Parameters<MusicBotEvents[K]>): boolean {
        const result = super.emit(event, ...args);
        if (this.webhookConfig?.url && (!this.webhookConfig.eventsToReport || this.webhookConfig.eventsToReport.includes(event))) {
            this._sendWebhookNotification(event, args).catch(err => {
                super.emit("debug", "Failed to send webhook notification", { error: err.message, event });
            });
        }
        return result;
    }

    private async _sendWebhookNotification<K extends keyof MusicBotEvents>(event: K, args: Parameters<MusicBotEvents[K]>) {
        if (!this.webhookConfig?.url) return;
        const payload = { event, timestamp: new Date().toISOString(), data: args.map(arg => (arg instanceof Error ? { name: arg.name, message: arg.message, stack: arg.stack } : arg)) };
        try {
            await fetch(this.webhookConfig.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(this.webhookConfig.secret && { 'X-Webhook-Secret': this.webhookConfig.secret })},
                body: JSON.stringify(payload)
            });
            super.emit("debug", "Webhook notification sent successfully", { event });
        } catch (error: any) {
            super.emit("debug", "Error sending webhook notification", { error: error.message, event });
        }
    }

    private initKeepAlive(guildId: string, channelId: string): void {
        this.emit("debug", "KeepAlive: Initializing...", { guildId, channelId });
        this.audioPlayer.ensureConnected(guildId, channelId)
            .then(() => this.emit("voiceConnectionUpdate", "keepAliveConnected", guildId, channelId))
            .catch(err => this.emit("voiceConnectionUpdate", "keepAliveConnectionFailed", guildId, channelId, err));

        if (this.keepAliveIntervalId) clearInterval(this.keepAliveIntervalId);
        this.keepAliveIntervalId = setInterval(() => {
            this._checkAndMaintainConnection(guildId, channelId);
        }, this.keepAliveConfig?.reconnectInterval || 30000);
    }

    private _checkAndMaintainConnection(guildId: string, channelId: string): void {
        const maxAttempts = this.keepAliveConfig?.maxReconnectAttempts || 5;
        const currentAttempts = this.reconnectAttempts.get(guildId) || 0;

        if (!this.audioPlayer.isConnected(guildId) || this.audioPlayer.getCurrentChannelId(guildId) !== channelId) {
            this.emit("debug", "KeepAlive: Disconnected or in wrong channel. Attempting to reconnect...", { guildId, channelId, attempts: currentAttempts });
            if (currentAttempts < maxAttempts) {
                this.reconnectAttempts.set(guildId, currentAttempts + 1);
                this.audioPlayer.ensureConnected(guildId, channelId)
                    .then(() => {
                        this.emit("voiceConnectionUpdate", "keepAliveReconnected", guildId, channelId);
                        this.reconnectAttempts.set(guildId, 0);
                    })
                    .catch(err => {
                        this.emit("voiceConnectionUpdate", "keepAliveReconnectFailed", guildId, channelId, err);
                    });
            } else {
                this.emit("debug", "KeepAlive: Max reconnect attempts reached. Stopping keep-alive for now.", { guildId, channelId });
                if (this.keepAliveIntervalId && guildId === this.keepAliveConfig?.guildId) {
                     clearInterval(this.keepAliveIntervalId);
                }
            }
        }
    }

    public dispose(): void {
        if (this.keepAliveIntervalId) clearInterval(this.keepAliveIntervalId);
        this.audioPlayer.disconnectAll();
        this.removeAllListeners();
        this.emit("debug", "MusicBot disposed.");
    }

    private setupEventForwarding(): void {
        this.audioPlayer.on("trackStart", (track, context) => this.emit("trackStart", track, context));
        this.audioPlayer.on("trackEnd", (track, reason, context) => this.emit("trackEnd", track, reason, context));
        this.audioPlayer.on("error", (error, track, context) => this.emit("trackError", error, track, context));
        this.audioPlayer.on("pause", (track, context) => {
            if(context?.guildId) this.emit("paused", context.guildId, track, context)
        });
        this.audioPlayer.on("resume", (track, context) => {
            if(context?.guildId) this.emit("resumed", context.guildId, track, context)
        });
        this.audioPlayer.on("stop", (track, context) => {
             if(context?.guildId) this.emit("stopped", context.guildId, track, context)
        });
        this.audioPlayer.on("volumeChange", (volume, context) => {
            if(context?.guildId) this.emit("volumeChanged", context.guildId, volume, context)
        });
        this.audioPlayer.on("queueEndCheck", (guildId) => this.handleQueueEndCheck(guildId));
        this.audioPlayer.on("voiceConnectionUpdate", (status, guildId, channelId, error) => {
            this.emit("voiceConnectionUpdate", status, guildId, channelId, error);
            if (status === 'disconnected' && this.keepAliveConfig?.enabled && this.keepAliveConfig.guildId === guildId) {
                this._checkAndMaintainConnection(guildId, this.keepAliveConfig.channelId);
            }
        });

        this.queueManager.on("trackAdded", (track, size, context) => this.emit("trackAdded", track, size, context));
        this.queueManager.on("trackRemoved", (track, size, context) => this.emit("trackRemoved", track, size, context));
        this.queueManager.on("queueEnd", (context) => {
            if(context?.guildId) this.emit("queueEnd", context.guildId, context)
        });
        this.queueManager.on("queueLooped", (context) => {
            if(context?.guildId) this.emit("queueLooped", context.guildId, context)
        });
        this.queueManager.on("loopModeChanged", (mode, context) => {
            if(context?.guildId) this.emit("loopModeChanged", context.guildId, mode, context)
        });
        this.queueManager.on("queueShuffled", (context) => {
            if(context?.guildId) this.emit("shuffled", context.guildId, context)
        });
        this.queueManager.on("queueCleared", (context) => {
            if(context?.guildId) this.emit("queueCleared", context.guildId, context)
        });
        this.queueManager.on("error", (error, context) => {
            const guildId = context?.guildId || this.queueManager.nowPlaying?.metadata?.guildId;
            if(guildId) this.emit("trackError", error, this.queueManager.nowPlaying, context)
        });
    }

    private setupInternalHandlers(): void {
        this.on("trackEnd", async (track, reason, context) => {
            const guildId = track?.metadata?.guildId || context?.guildId;
            if (!guildId) {
                this.emit("debug", "Track ended but no guildId found in context.", { track, reason, context });
                return;
            }
            this.emit("debug", `Track ended for guild ${guildId}. Reason: ${reason}. Checking for next track.`, { context });
            this.playNextTrack(guildId, context);
        });

        this.on("queueEnd", (guildId, context) => {
            if (this.keepAliveConfig?.enabled && this.keepAliveConfig.guildId === guildId && this.audioPlayer.isConnected(guildId)) {
                this.emit("debug", "Queue ended, but KeepAlive is active. Player remains connected.", { guildId, context });
            } else {
                 this.emit("debug", `Queue ended for guild ${guildId}. Player might stop if not kept alive.`, { context });
            }
        });
    }
    
    private handleQueueEndCheck(guildId: string): void {
        this.emit("debug", `QueueEndCheck triggered for guild ${guildId}. Playing next track.`);
        const currentTrack = this.audioPlayer.getCurrentTrack(guildId);
        this.playNextTrack(guildId, currentTrack?.metadata);
    }

    private async playNextTrack(guildId: string, previousTrackContext?: CommandContext): Promise<void> {
        if (!guildId) {
            this.emit("debug", "playNextTrack called without guildId.", { previousTrackContext });
            return;
        }
        
        const qm = this.getGuildQueueManager(guildId);

        if (this.audioPlayer.getStatus(guildId) === PlayerStatus.PLAYING && qm.getLoopMode() !== LoopMode.TRACK) {
            this.emit("debug", "Player is already playing and not in track loop. playNextTrack aborted.", { guildId, context: previousTrackContext });
            return;
        }

        const nextTrack = qm.getNext(previousTrackContext);
        if (nextTrack) {
            try {
                const trackContext: CommandContext = { ...(nextTrack.metadata || previousTrackContext || {}), guildId };
                if (!nextTrack.metadata) nextTrack.metadata = trackContext;
                
                if (!trackContext.voiceChannelId && this.audioPlayer.isConnected(guildId)) {
                    trackContext.voiceChannelId = this.audioPlayer.getCurrentChannelId(guildId);
                }
                
                if (!trackContext.voiceChannelId) {
                     this.emit("trackError", new Error("Cannot play next track: voiceChannelId missing and bot not in channel."), nextTrack, trackContext);
                     this.playNextTrack(guildId, trackContext);
                     return;
                }
                if (!trackContext.interactionAdapterCreator && previousTrackContext?.interactionAdapterCreator){
                    trackContext.interactionAdapterCreator = previousTrackContext.interactionAdapterCreator;
                }

                if (!nextTrack.streamUrl) {
                    this.emit("debug", `Fetching stream URL for next track: ${nextTrack.title}`, { guildId, context: trackContext });
                    const streamUrl = await this._resolveStreamUrl(nextTrack, trackContext);
                    if (!streamUrl) {
                        this.emit("trackError", new Error(`Could not resolve stream URL for ${nextTrack.title}`), nextTrack, trackContext);
                        this.playNextTrack(guildId, trackContext);
                        return;
                    }
                    nextTrack.streamUrl = streamUrl;
                }
                await this.audioPlayer.play(nextTrack, trackContext);
            } catch (error: any) {
                this.emit("trackError", error, nextTrack, previousTrackContext);
                this.playNextTrack(guildId, previousTrackContext);
            }
        } else {
            this.emit("queueEnd", guildId, previousTrackContext);
        }
    }

    private async _resolveStreamUrl(track: PlayableTrack, context: CommandContext): Promise<string | undefined> {
        if (track.streamUrl) return track.streamUrl;
        if (!track.url) {
            this.emit("debug", "Track has no URL to resolve stream from", { track, context });
            return undefined;
        }

        try {
            if (track.source === "spotify" && this.spotifyClient) {
                const query = `${track.artist || ""} ${track.title}`.trim();
                this.emit("debug", `Spotify track, searching for streamable source for "${query}"`, { context });
                let ytTrack = await this.youtubeDLWrapper.getTrackInfo(`ytsearch1:${query}`);
                if (ytTrack && ytTrack.url) {
                    const stream = await this.youtubeDLWrapper.getStreamUrl(ytTrack.url);
                    if(stream) return stream; // Returns string | null, assign to string | undefined
                }
                const scResults = await this.youtubeDLWrapper.searchSoundCloud(query, 1);
                if (scResults && scResults.length > 0 && scResults[0].url) {
                    const stream = await this.youtubeDLWrapper.getStreamUrl(scResults[0].url);
                    return stream ?? undefined; // Convert null to undefined
                }
                return undefined;
            } else {
                const stream = await this.youtubeDLWrapper.getStreamUrl(track.url);
                return stream ?? undefined; // Convert null to undefined
            }
        } catch (error: any) {
            this.emit("trackError", new Error(`Failed to resolve stream URL: ${error.message}`), track, context);
            return undefined;
        }
    }

    public async play(query: string, context: CommandContext): Promise<void> {
        if (!context.guildId) {
            this.emit("commandError", null, new Error("Guild ID is missing from command context."), context);
            return;
        }
        const guildId = context.guildId;
        const qm = this.getGuildQueueManager(guildId);

        try {
            let trackInfo: TrackInfo | null = null;
            let tracksInfo: TrackInfo[] = [];

            if (query.includes("spotify.com/track")) {
                if (!this.spotifyClient) throw new Error("Spotify client not configured.");
                const spotifyTrack = await this.spotifyClient.getTrack(query);
                if (spotifyTrack) trackInfo = this._spotifyToTrackInfo(spotifyTrack, context);
            } else if (query.includes("spotify.com/album")) {
                if (!this.spotifyClient) throw new Error("Spotify client not configured.");
                const albumTracks = await this.spotifyClient.getAlbumTracks(query);
                tracksInfo = albumTracks.map(st => this._spotifyToTrackInfo(st, context));
            } else if (query.includes("spotify.com/playlist")) {
                if (!this.spotifyClient) throw new Error("Spotify client not configured.");
                const playlistTracks = await this.spotifyClient.getPlaylistTracks(query);
                tracksInfo = playlistTracks.map(st => this._spotifyToTrackInfo(st, context));
            } else if (query.includes("youtube.com/playlist") || query.includes("soundcloud.com") && query.includes("/sets/")) {
                tracksInfo = await this.youtubeDLWrapper.getPlaylistTracks(query);
            } else {
                trackInfo = await this.youtubeDLWrapper.getTrackInfo(query, this.preferSoundCloudWithYouTubeLinks);
            }

            if (trackInfo) tracksInfo.push(trackInfo);

            if (tracksInfo.length === 0) {
                if(context.reply) await context.reply({ content: "Could not find any tracks for your query.", ephemeral: true });
                return;
            }

            const playableTracks: PlayableTrack[] = [];
            for (const ti of tracksInfo) {
                if(ti) {
                    const playableTrack: PlayableTrack = { ...ti, metadata: context, source: ti.source || (ti.url.includes("spotify") ? "spotify" : "youtube") }; 
                    playableTracks.push(playableTrack);
                }
            }

            if (playableTracks.length > 0) {
                qm.add(playableTracks, context);
                if(context.reply && playableTracks.length === 1 && playableTracks[0]) {
                     await context.reply({ content: `Added to queue: **${playableTracks[0].title}**`, ephemeral: false });
                } else if (context.reply) {
                     await context.reply({ content: `Added **${playableTracks.length}** tracks to the queue.`, ephemeral: false });
                }
            }

            if (this.audioPlayer.getStatus(guildId) !== PlayerStatus.PLAYING && this.audioPlayer.getStatus(guildId) !== PlayerStatus.PAUSED) {
                this.playNextTrack(guildId, context);
            }
        } catch (error: any) {
            this.emit("commandError", null, error, context);
            if(context.reply) await context.reply({ content: `Error: ${error.message}`, ephemeral: true });
        }
    }

    private _spotifyToTrackInfo(spotifyTrack: SpotifyTrack, context?: CommandContext): PlayableTrack {
        return {
            title: spotifyTrack.name,
            url: spotifyTrack.external_urls.spotify,
            artist: spotifyTrack.artists.map(a => a.name).join(", "),
            thumbnailUrl: spotifyTrack.album.images[0]?.url,
            duration: Math.floor(spotifyTrack.duration_ms / 1000),
            source: "spotify",
            metadata: context,
        };
    }

    public skip(context: CommandContext): void {
        if (!context.guildId) return;
        const skippedTrack = this.audioPlayer.stop(context.guildId, context);
        if (skippedTrack && context.reply) {
            context.reply({ content: `Skipped: **${skippedTrack.title}**`, ephemeral: false });
        } else if (context.reply) {
            context.reply({ content: "Nothing to skip.", ephemeral: true });
        }
    }

    public togglePause(context: CommandContext): void {
        if (!context.guildId) return;
        this.audioPlayer.togglePause(context.guildId, context);
    }

    public stop(context: CommandContext): void {
        if (!context.guildId) return;
        const qm = this.getGuildQueueManager(context.guildId);
        qm.clear(context);
        this.audioPlayer.destroy(context.guildId, context);
        if(context.reply) context.reply({ content: "Player stopped and queue cleared.", ephemeral: false });
    }

    public setVolume(volume: number, context: CommandContext): void {
        if (!context.guildId) return;
        if (volume < 0 || volume > 150) {
            if(context.reply) context.reply({ content: "Volume must be between 0 and 150.", ephemeral: true });
            return;
        }
        this.audioPlayer.setVolume(context.guildId, volume, context);
        if(context.reply) context.reply({ content: `Volume set to ${volume}%`, ephemeral: false });
    }

    public getQueue(context: CommandContext): Readonly<PlayableTrack[]> {
        if (!context.guildId) return [];
        const qm = this.getGuildQueueManager(context.guildId);
        return qm.getQueue();
    }

    public setLoopMode(mode: LoopMode, context: CommandContext): void {
        if (!context.guildId) return;
        const qm = this.getGuildQueueManager(context.guildId);
        qm.setLoopMode(mode, context);
        if(context.reply) context.reply({ content: `Loop mode set to: ${mode}`, ephemeral: false });
    }

    public shuffleQueue(context: CommandContext): void {
        if (!context.guildId) return;
        const qm = this.getGuildQueueManager(context.guildId);
        qm.shuffle(context);
        if(context.reply) context.reply({ content: "Queue shuffled.", ephemeral: false });
    }

    public removeTrack(index: number, context: CommandContext): PlayableTrack | null {
        if (!context.guildId) return null;
        const qm = this.getGuildQueueManager(context.guildId);
        const removed = qm.remove(index, context);
        if (removed && context.reply) {
            context.reply({ content: `Removed from queue: **${removed.title}**`, ephemeral: false });
        }
        return removed;
    }

    public clearQueue(context: CommandContext): void {
        if (!context.guildId) return;
        const qm = this.getGuildQueueManager(context.guildId);
        qm.clear(context);
        if(context.reply) context.reply({ content: "Queue cleared.", ephemeral: false });
    }

    public handleCommand(commandName: string, args: string[], context: CommandContext): void {
        const command = this.commandManager.getCommand(commandName);
        if (command) {
            try {
                command.execute(this, context, args);
                this.emit("commandExecuted", command, context);
            } catch (error: any) {
                this.emit("commandError", command, error, context);
            }
        } else {
            this.emit("unknownCommand", commandName, context);
        }
    }
}

export { MusicBot };

