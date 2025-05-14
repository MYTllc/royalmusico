import { Command, CommandContext } from "../CommandManager";
import { MusicBot } from "../../core/MusicBot";

export class VolumeCommand implements Command {
  name = "volume";
  aliases = ["vol"];
  description = "Sets the playback volume (0-100).";
  usage = "!volume <0-100>";
  category = "music";
  args = [
    {
      name: "level",
      description: "The volume level (0-100).",
      required: true,
      type: "number" as const,
    },
  ];

  async execute(context: CommandContext, args: string[]): Promise<void | string> {
    const musicBot = context.musicBot as MusicBot;
    const audioPlayer = musicBot.audioPlayer;
    const volumeArg = args[0];

    if (!volumeArg) {
      // If no argument, could potentially show current volume if player supports getting it.
      // For now, require an argument.
      return `Please provide a volume level (0-100). Usage: ${this.usage}`;
    }

    const volumeLevel = parseInt(volumeArg, 10);

    if (isNaN(volumeLevel) || volumeLevel < 0 || volumeLevel > 100) {
      return `Invalid volume level: "${volumeArg}". Please provide a number between 0 and 100.`;
    }

    // The actual volume setting will depend on the underlying audio library (e.g., Discord.js Voice)
    // The AudioPlayer.setVolume method is a placeholder for this platform-specific logic.
    // We might need to scale the volume (e.g., 0-1 for some libraries).
    audioPlayer.setVolume(volumeLevel); // Assuming AudioPlayer handles the scale if needed

    return `Volume set to: **${volumeLevel}%**.`;
  }
}

