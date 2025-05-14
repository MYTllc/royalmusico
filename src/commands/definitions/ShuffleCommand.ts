import { Command, CommandContext } from "../CommandManager";
import { MusicBot } from "../../core/MusicBot";

export class ShuffleCommand implements Command {
  name = "shuffle";
  aliases = ["mix"];
  description = "Shuffles the current song queue.";
  usage = "!shuffle";
  category = "music";

  async execute(context: CommandContext, args: string[]): Promise<void | string> {
    const musicBot = context.musicBot as MusicBot;
    const queueManager = musicBot.queueManager;

    if (queueManager.getSize() < 2) {
      return "Not enough songs in the queue to shuffle.";
    }

    queueManager.shuffle();
    return "Queue shuffled! 🔀";
  }
}

