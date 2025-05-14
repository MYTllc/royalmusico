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
exports.RemoveCommand = void 0;
class RemoveCommand {
    constructor() {
        this.name = "remove";
        this.aliases = ["rm", "delete"];
        this.description = "Removes a song from the queue by its position.";
        this.usage = "!remove <position>";
        this.category = "music";
        this.args = [
            {
                name: "position",
                description: "The position of the song in the queue (1-based).",
                required: true,
                type: "number",
            },
        ];
    }
    execute(context, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const musicBot = context.musicBot;
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
            }
            else {
                // This case should ideally be caught by the size check above, but as a fallback:
                return `Could not remove track at position ${position}. Please check the queue.`;
            }
        });
    }
}
exports.RemoveCommand = RemoveCommand;
