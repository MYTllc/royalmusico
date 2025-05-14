import { Command, CommandContext } from "../CommandManager";
import { YouTubeDLWrapper } from "../../integrations/YouTubeDLWrapper";
import { PlayableTrack } from "../../player/AudioPlayer";
import { MusicBot } from "../../core/MusicBot"; 

export class PlayCommand implements Command {
  name = "play";
  aliases = ["p", "start"];
  description = "Plays a song from a URL or search query. Adds to queue if a song is already playing.";
  usage = "!play <song URL or search query>";
  category = "music";
  args = [
    {
      name: "query",
      description: "The URL or search term for the song.",
      required: true,
      type: "string" as const,
    },
  ];

  async execute(context: CommandContext, args: string[]): Promise<void | string> {
    const query = args.join(" ");
    if (!query) {
      return "Please provide a song URL or search query.";
    }

    const musicBot = context.musicBot as MusicBot;
    const ytdlWrapper = musicBot.youtubeDLWrapper;
    const queueManager = musicBot.queueManager;
    const audioPlayer = musicBot.audioPlayer;

    let trackInfo: PlayableTrack | null = null;

    const isUrl = query.startsWith("http://") || query.startsWith("https://");

    try {
      if (isUrl) {
        musicBot.emit("debug", `Fetching track info for URL: ${query}`, context);
        trackInfo = await ytdlWrapper.getTrackInfo(query) as PlayableTrack;
      } else {
        musicBot.emit("debug", `Searching for track: ${query}`, context);
        const searchResults = await ytdlWrapper.getTrackInfo(`ytsearch1:${query}`);
        if (searchResults) {
            trackInfo = searchResults as PlayableTrack;
        } else {
            musicBot.emit("debug", `No YouTube result for \"${query}\", trying SoundCloud.`, context);
            const scResults = await ytdlWrapper.searchSoundCloud(query, 1);
            if (scResults && scResults.length > 0) {
                trackInfo = scResults[0] as PlayableTrack;
            }
        }
      }

      if (!trackInfo || !trackInfo.url) {
        musicBot.emit("commandError", this, new Error(`Could not find a track for query: ${query}`), context);
        return `Could not find a track for \"${query}\". Try a different query or URL.`;
      }

      // Assign context to metadata before fetching stream URL or adding to queue
      trackInfo.metadata = context;

      if (!trackInfo.streamUrl) {
        musicBot.emit("debug", `Fetching stream URL for: ${trackInfo.title}`, context);
        const streamUrlResult = await ytdlWrapper.getStreamUrl(trackInfo.url);
        trackInfo.streamUrl = streamUrlResult === null ? undefined : streamUrlResult;
        if (!trackInfo.streamUrl) {
            musicBot.emit("trackError", new Error(`Failed to get stream URL for ${trackInfo.title}`), trackInfo, context);
            return `Failed to get a playable stream for \"${trackInfo.title}\".`;
        }
      }
      
      queueManager.add(trackInfo); // trackInfo now has metadata

      if (audioPlayer.getStatus() === "idle" || audioPlayer.getStatus() === "ended") {
        const nextTrack = queueManager.getNext(); // This track will also have metadata if set correctly in QueueManager
        if (nextTrack) {
          await audioPlayer.play(nextTrack);
        }
      } else {
        return `Added to queue: **${trackInfo.title}**`;
      }

    } catch (error: any) {
      console.error("PlayCommand Error:", error);
      musicBot.emit("commandError", this, error, context);
      return `An error occurred: ${error.message || "Unknown error"}`;
    }
  }
}

