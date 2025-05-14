import { Command, CommandContext } from "../CommandManager";
import { MusicBot } from "../../core/MusicBot";
import { PlayableTrack } from "../../player/AudioPlayer";

export class QueueCommand implements Command {
  name = "queue";
  aliases = ["q", "list"];
  description = "Displays the current song queue.";
  usage = "!queue";
  category = "music";

  async execute(context: CommandContext, args: string[]): Promise<void | string | object> {
    const musicBot = context.musicBot as MusicBot;
    const queueManager = musicBot.queueManager;
    const audioPlayer = musicBot.audioPlayer;

    const currentQueue = queueManager.getQueue();
    const nowPlaying = audioPlayer.getCurrentTrack();

    if (!nowPlaying && currentQueue.length === 0) {
      return "The queue is currently empty and nothing is playing.";
    }

    let response = "";

    if (nowPlaying) {
      response += `**Now Playing:**\n${this.formatTrack(nowPlaying, true)}\n\n`;
    }

    if (currentQueue.length > 0) {
      response += "**Up Next:**\n";
      currentQueue.slice(0, 10).forEach((track, index) => { // Display up to 10 tracks
        response += `${index + 1}. ${this.formatTrack(track)}\n`;
      });
      if (currentQueue.length > 10) {
        response += `\n...and ${currentQueue.length - 10} more track(s).`;
      }
    } else if (!nowPlaying) {
        // This case is covered by the initial check, but as a safeguard:
        response += "The queue is empty.";
    }

    // The response can be a string or an embed object for platforms like Discord
    // For simplicity, returning a string here.
    // For a richer experience, one might return an object that the platform-specific part of MusicBot can format as an embed.
    return response.trim();
  }

  private formatTrack(track: PlayableTrack, isNowPlaying: boolean = false): string {
    let title = track.title || "Unknown Title";
    // Truncate title if too long for display
    if (title.length > 60) {
        title = title.substring(0, 57) + "...";
    }
    let artist = track.artist || "Unknown Artist";
    if (artist.length > 40) {
        artist = artist.substring(0, 37) + "...";
    }
    const duration = track.duration ? this.formatDuration(track.duration) : "N/A";
    
    let formattedString = `[${title}](${track.url}) by ${artist} - ${duration}`;
    if (isNowPlaying) {
        // Could add a play icon or similar for now playing
    }
    return formattedString;
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
      h > 0 ? h : null,
      m,
      s < 10 ? "0" + s : s
    ]
    .filter(Boolean)
    .join(":");
  }
}

