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
exports.PauseCommand = void 0;
const AudioPlayer_1 = require("../../player/AudioPlayer");
class PauseCommand {
    constructor() {
        this.name = "pause";
        this.description = "Pauses the currently playing song.";
        this.usage = "!pause";
        this.category = "music";
    }
    execute(context, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const musicBot = context.musicBot;
            const audioPlayer = musicBot.audioPlayer;
            if (audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.PLAYING) {
                audioPlayer.pause();
                return "Playback paused.";
            }
            else if (audioPlayer.getStatus() === AudioPlayer_1.PlayerStatus.PAUSED) {
                return "Playback is already paused. Use !resume to continue.";
            }
            else {
                return "Nothing is currently playing to pause.";
            }
        });
    }
}
exports.PauseCommand = PauseCommand;
