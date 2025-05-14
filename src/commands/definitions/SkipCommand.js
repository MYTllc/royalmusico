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
exports.SkipCommand = void 0;
class SkipCommand {
    constructor() {
        this.name = "skip";
        this.aliases = ["s", "next"];
        this.description = "Skips the current song and plays the next one in the queue.";
        this.usage = "!skip";
        this.category = "music";
    }
    execute(context, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const musicBot = context.musicBot;
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
            }
            else {
                return "Skipped to the next track."; // Or indicate if queue is now empty
            }
            // MusicBot's core logic should listen to 'trackEnd' or 'queueEndCheck' from AudioPlayer
            // and then call queueManager.getNext() and audioPlayer.play(nextTrack).
        });
    }
}
exports.SkipCommand = SkipCommand;
