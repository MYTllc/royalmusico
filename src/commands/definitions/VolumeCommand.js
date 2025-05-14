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
exports.VolumeCommand = void 0;
class VolumeCommand {
    constructor() {
        this.name = "volume";
        this.aliases = ["vol"];
        this.description = "Sets the playback volume (0-100).";
        this.usage = "!volume <0-100>";
        this.category = "music";
        this.args = [
            {
                name: "level",
                description: "The volume level (0-100).",
                required: true,
                type: "number",
            },
        ];
    }
    execute(context, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const musicBot = context.musicBot;
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
        });
    }
}
exports.VolumeCommand = VolumeCommand;
