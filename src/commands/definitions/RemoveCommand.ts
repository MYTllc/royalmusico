import { Command, CommandContext } from "../CommandManager";
import { MusicBot } from "../../core/MusicBot";

export class RemoveCommand implements Command {
  name = "remove";
  aliases = ["rm", "delete"];
  description = "Removes a song from the queue by its position.";
  usage = "!remove <position>";
  category = "music";
  args = [
    {
      name: "position",
      description: "The position of the song in the queue (1-based).",
      required: true,
      type: "number" as const,
    },
  ];

  async execute(context: CommandContext, args: string[]): Promise<void | string> {
    const musicBot = context.musicBot as MusicBot;
    const queueManager = musicBot.queueManager;
    const positionArg = args[0];

    if (!positionArg) {
      return `Please provide the position of the song to remove. Usage: ${this.usage}`;
    }

    const position = parseInt(positionArg, 10);

    if (isNaN(position) || position <= 0) {
      return `Invalid position: "${positionArg}". Please provide a valid number greater than 0.`;
    }

    if (position > queueManager.getSize()) {
        return `Invalid position: ${position}. The queue only has ${queueManager.getSize()} songs.`;
    }

    const removedTrack = queueManager.remove(position);

    if (removedTrack) {
      return `Removed from queue: **${removedTrack.title}**.`;
    } else {
      // This case should ideally be caught by the size check above, but as a fallback:
      return `Could not remove track at position ${position}. Please check the queue.`;
    }
  }
}

