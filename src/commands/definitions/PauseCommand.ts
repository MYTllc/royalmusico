import { Command, CommandContext } from "../CommandManager";
import { MusicBot } from "../../core/MusicBot";
import { PlayerStatus } from "../../player/AudioPlayer";

export class PauseCommand implements Command {
  name = "pause";
  description = "Pauses the currently playing song.";
  usage = "!pause";
  category = "music";

  async execute(context: CommandContext, args: string[]): Promise<void | string> {
    const musicBot = context.musicBot as MusicBot;
    const audioPlayer = musicBot.audioPlayer;

    if (audioPlayer.getStatus() === PlayerStatus.PLAYING) {
      audioPlayer.pause();
      return "Playback paused.";
    } else if (audioPlayer.getStatus() === PlayerStatus.PAUSED) {
      return "Playback is already paused. Use !resume to continue.";
    } else {
      return "Nothing is currently playing to pause.";
    }
  }
}

