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
exports.AudioPlayer = exports.PlayerStatus = void 0;
const events_1 = require("events");
var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus["IDLE"] = "idle";
    PlayerStatus["PLAYING"] = "playing";
    PlayerStatus["PAUSED"] = "paused";
    PlayerStatus["BUFFERING"] = "buffering";
    PlayerStatus["ENDED"] = "ended";
    PlayerStatus["ERROR"] = "error";
})(PlayerStatus || (exports.PlayerStatus = PlayerStatus = {}));
class AudioPlayer extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.options = options;
        this.currentTrack = null;
        this.status = PlayerStatus.IDLE;
    }
    play(track) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!track.streamUrl) {
                this.emit("error", new Error("Track has no streamable URL"), track);
                this.status = PlayerStatus.ERROR;
                return;
            }
            this.currentTrack = track;
            this.status = PlayerStatus.PLAYING;
            this.emit("trackStart", this.currentTrack, this.currentTrack.metadata); // Pass metadata
            console.log(`[AudioPlayer] Simulating playback of: ${track.title} from ${track.streamUrl}`);
            if (track.duration) {
                setTimeout(() => {
                    if (this.currentTrack === track && this.status === PlayerStatus.PLAYING) {
                        this.handleTrackFinish();
                    }
                }, track.duration * 1000);
            }
            else {
                setTimeout(() => {
                    if (this.currentTrack === track && this.status === PlayerStatus.PLAYING) {
                        this.handleTrackFinish();
                    }
                }, 30000);
            }
        });
    }
    handleTrackFinish() {
        const finishedTrack = this.currentTrack;
        this.status = PlayerStatus.ENDED;
        this.currentTrack = null;
        if (finishedTrack) {
            this.emit("trackEnd", finishedTrack, "finished", finishedTrack.metadata); // Pass metadata
        }
        this.emit("queueEndCheck");
    }
    pause() {
        var _a;
        if (this.status === PlayerStatus.PLAYING) {
            this.status = PlayerStatus.PAUSED;
            this.emit("pause", this.currentTrack, (_a = this.currentTrack) === null || _a === void 0 ? void 0 : _a.metadata); // Pass metadata
            console.log("[AudioPlayer] Playback paused (simulated).");
        }
        else {
            console.warn("[AudioPlayer] Cannot pause, not currently playing.");
        }
    }
    resume() {
        var _a;
        if (this.status === PlayerStatus.PAUSED) {
            this.status = PlayerStatus.PLAYING;
            this.emit("resume", this.currentTrack, (_a = this.currentTrack) === null || _a === void 0 ? void 0 : _a.metadata); // Pass metadata
            console.log("[AudioPlayer] Playback resumed (simulated).");
        }
        else {
            console.warn("[AudioPlayer] Cannot resume, not currently paused.");
        }
    }
    stop() {
        if (this.status !== PlayerStatus.IDLE && this.status !== PlayerStatus.ENDED) {
            const stoppedTrack = this.currentTrack;
            this.status = PlayerStatus.IDLE;
            this.currentTrack = null;
            this.emit("stop", stoppedTrack, stoppedTrack === null || stoppedTrack === void 0 ? void 0 : stoppedTrack.metadata); // Pass metadata
            console.log("[AudioPlayer] Playback stopped (simulated).");
        }
        else {
            this.emit("debug", "Stop called but player is idle or already ended.");
        }
    }
    setVolume(volume) {
        var _a;
        this.emit("volumeChange", volume, (_a = this.currentTrack) === null || _a === void 0 ? void 0 : _a.metadata); // Pass metadata
        console.log(`[AudioPlayer] Volume set to ${volume} (simulated).`);
    }
    getStatus() {
        return this.status;
    }
    getCurrentTrack() {
        return this.currentTrack;
    }
}
exports.AudioPlayer = AudioPlayer;
