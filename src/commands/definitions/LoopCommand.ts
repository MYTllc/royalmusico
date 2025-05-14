import { Command, CommandContext } from "../CommandManager";
import { MusicBot } from "../../core/MusicBot";
import { LoopMode } from "../../queue/QueueManager";

export class LoopCommand implements Command {
  name = "loop";
  aliases = ["repeat"];
  description = "Sets the loop mode for the queue (none, track, queue).";
  usage = "!loop <none|track|queue>";
  category = "music";
  args = [
    {
      name: "mode",
      description: "The loop mode to set (none, track, or queue).",
      required: true,
      type: "string" as const,
    },
  ];

  async execute(context: CommandContext, args: string[]): Promise<void | string> {
    const musicBot = context.musicBot as MusicBot;
    const queueManager = musicBot.queueManager;
    const modeArg = args[0]?.toLowerCase();

    if (!modeArg) {
      const currentMode = queueManager.getLoopMode();
      return `Current loop mode is: **${currentMode}**. Usage: ${this.usage}`;
    }

    let newMode: LoopMode;
    switch (modeArg) {
      case "none":
      case "off":
        newMode = LoopMode.NONE;
        break;
      case "track":
      case "song":
      case "one":
        newMode = LoopMode.TRACK;
        break;
      case "queue":
      case "all":
        newMode = LoopMode.QUEUE;
        break;
      default:
        return `Invalid loop mode: "${modeArg}". Available modes: none, track, queue.`;
    }

    queueManager.setLoopMode(newMode);
    return `Loop mode set to: **${newMode}**.`;
  }
}

