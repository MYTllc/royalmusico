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
exports.LoopCommand = void 0;
const QueueManager_1 = require("../../queue/QueueManager");
class LoopCommand {
    constructor() {
        this.name = "loop";
        this.aliases = ["repeat"];
        this.description = "Sets the loop mode for the queue (none, track, queue).";
        this.usage = "!loop <none|track|queue>";
        this.category = "music";
        this.args = [
            {
                name: "mode",
                description: "The loop mode to set (none, track, or queue).",
                required: true,
                type: "string",
            },
        ];
    }
    execute(context, args) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const musicBot = context.musicBot;
            const queueManager = musicBot.queueManager;
            const modeArg = (_a = args[0]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (!modeArg) {
                const currentMode = queueManager.getLoopMode();
                return `Current loop mode is: **${currentMode}**. Usage: ${this.usage}`;
            }
            let newMode;
            switch (modeArg) {
                case "none":
                case "off":
                    newMode = QueueManager_1.LoopMode.NONE;
                    break;
                case "track":
                case "song":
                case "one":
                    newMode = QueueManager_1.LoopMode.TRACK;
                    break;
                case "queue":
                case "all":
                    newMode = QueueManager_1.LoopMode.QUEUE;
                    break;
                default:
                    return `Invalid loop mode: "${modeArg}". Available modes: none, track, queue.`;
            }
            queueManager.setLoopMode(newMode);
            return `Loop mode set to: **${newMode}**.`;
        });
    }
}
exports.LoopCommand = LoopCommand;
