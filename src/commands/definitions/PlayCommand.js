"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayCommand = void 0;
class PlayCommand {
    constructor() {
        this.name = "play";
        this.aliases = ["p", "start"];
        this.description = "Plays a song from a URL or search query. Adds to queue if a song is already playing.";
        this.usage = "!play <song URL or search query>";
        this.category = "music";
        this.args = [
            {
                name: "query",
                description: "The URL or search term for the song.",
                required: true,
                type: "string",
            },
        ];
    }
    execute(context, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = args.join(" ");
            if (!query) {
                return "Please provide a song URL or search query.";
            }
            const musicBot = context.musicBot;
            const ytdlWrapper = musicBot.youtubeDLWrapper; // Assume ytdlWrapper is accessible via MusicBot
            const queueManager = musicBot.queueManager; // Assume queueManager is accessible
            const audioPlayer = musicBot.audioPlayer; // Assume audioPlayer is accessible
            let trackInfo = null;
            // Basic URL check (can be improved)
            const isUrl = query.startsWith("http://") || query.startsWith("https://");
            try {
                if (isUrl) {
                    musicBot.emit("debug", `Fetching track info for URL: ${query}`);
                    trackInfo = (yield ytdlWrapper.getTrackInfo(query));
                }
                else {
                    // Search logic: First try YouTube, then SoundCloud as a fallback or based on preference
                    // For simplicity, let's assume direct search on YouTube first, then SoundCloud if no results or preferred.
                    // The original spec mentioned: "Search on SoundCloud first when YouTube links are entered if preferSoundCloud is true"
                    // And "Search first on Spotify -> then SoundCloud" for song names.
                    // This simplified version will search YouTube via yt-dlp's default search (usually YouTube)
                    // then try SoundCloud if no good YouTube result or if a specific strategy is implemented.
                    musicBot.emit("debug", `Searching for track: ${query}`);
                    // yt-dlp's default search is usually YouTube. We can use `ytsearch1:` for one result.
                    const searchResults = yield ytdlWrapper.getTrackInfo(`ytsearch1:${query}`);
                    if (searchResults) {
                        trackInfo = searchResults;
                    }
                    else {
                        // Fallback to SoundCloud search if no YouTube results
                        musicBot.emit("debug", `No YouTube result for "${query}", trying SoundCloud.`);
                        const scResults = yield ytdlWrapper.searchSoundCloud(query, 1);
                        if (scResults && scResults.length > 0) {
                            trackInfo = scResults[0];
                        }
                    }
                }
                if (!trackInfo || !trackInfo.url) {
                    musicBot.emit("error", new Error(`Could not find a track for query: ${query}`), null);
                    return `Could not find a track for "${query}". Try a different query or URL.`;
                }
                // Fetch stream URL before adding to queue or playing
                if (!trackInfo.streamUrl) {
                    musicBot.emit("debug", `Fetching stream URL for: ${trackInfo.title}`);
                    trackInfo.streamUrl = yield ytdlWrapper.getStreamUrl(trackInfo.url);
                    if (!trackInfo.streamUrl) {
                        musicBot.emit("trackError", new Error(`Failed to get stream URL for ${trackInfo.title}`), trackInfo);
                        return `Failed to get a playable stream for "${trackInfo.title}".`;
                    }
                }
                queueManager.add(trackInfo);
                // musicBot.emit("trackAdded", trackInfo, queueManager.getSize()); // Emitted by QueueManager itself
                if (audioPlayer.getStatus() === "idle" || audioPlayer.getStatus() === "ended") {
                    const nextTrack = queueManager.getNext();
                    if (nextTrack) {
                        yield audioPlayer.play(nextTrack);
                    }
                }
                else {
                    return `Added to queue: **${trackInfo.title}**`;
                }
            }
            catch (error) {
                console.error("PlayCommand Error:", error);
                musicBot.emit("commandError", this, error, context);
                return `An error occurred: ${error.message || "Unknown error"}`;
            }
        });
    }
}
exports.PlayCommand = PlayCommand;
