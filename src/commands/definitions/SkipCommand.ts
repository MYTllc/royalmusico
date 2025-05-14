import { Command, CommandContext } from "../CommandManager";
import { MusicBot } from "../../core/MusicBot";

export class SkipCommand implements Command {
  name = "skip";
  aliases = ["s", "next"];
  description = "Skips the current song and plays the next one in the queue.";
  usage = "!skip";
  category = "music";

  async execute(context: CommandContext, args: string[]): Promise<void | string> {
    const musicBot = context.musicBot as MusicBot;
    const audioPlayer = musicBot.audioPlayer;
    const queueManager = musicBot.queueManager;

    if (audioPlayer.getStatus() === "idle" && queueManager.getSize() === 0) {
      return "Nothing is playing and the queue is empty.";
    }

    const currentTrack = audioPlayer.getCurrentTrack();
    audioPlayer.stop(); // Stop current track, which should trigger trackEnd and queueEndCheck

    // The AudioPlayer's stop/handleTrackFinish method should ideally trigger the queue to play next.
    // If not, we might need to explicitly call playNext here.
    // For now, assuming AudioPlayer's stop() or the events it emits will lead to QueueManager.getNext() and audioPlayer.play() being called by MusicBot's core logic.

    if (currentTrack) {
        return `Skipped: **${currentTrack.title}**.`;
    } else {
        return "Skipped to the next track."; // Or indicate if queue is now empty
    }
    // MusicBot's core logic should listen to 'trackEnd' or 'queueEndCheck' from AudioPlayer
    // and then call queueManager.getNext() and audioPlayer.play(nextTrack).
  }
}

