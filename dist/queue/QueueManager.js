"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = exports.LoopMode = void 0;
const events_1 = require("events");
var LoopMode;
(function (LoopMode) {
    LoopMode["NONE"] = "none";
    LoopMode["TRACK"] = "track";
    LoopMode["QUEUE"] = "queue";
})(LoopMode || (exports.LoopMode = LoopMode = {}));
class QueueManager extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.queue = [];
        this.history = [];
        this.nowPlaying = null;
        this.maxSize = (options === null || options === void 0 ? void 0 : options.maxSize) || 200;
        this.loopMode = (options === null || options === void 0 ? void 0 : options.defaultLoop) || LoopMode.NONE;
    }
    add(tracks, priority = false) {
        var _a;
        const tracksToAdd = Array.isArray(tracks) ? tracks : [tracks];
        if (this.queue.length + tracksToAdd.length > this.maxSize) {
            const error = new Error(`Queue full. Cannot add ${tracksToAdd.length} tracks.`);
            this.emit("error", error, (_a = tracksToAdd[0]) === null || _a === void 0 ? void 0 : _a.metadata); // Pass metadata of first track if available
            return this.queue.length;
        }
        if (priority) {
            this.queue.unshift(...tracksToAdd);
        }
        else {
            this.queue.push(...tracksToAdd);
        }
        // Assuming track.metadata is set before calling add (e.g., in PlayCommand)
        tracksToAdd.forEach(track => this.emit("trackAdded", track, this.queue.length, track.metadata));
        return this.queue.length;
    }
    remove(position) {
        var _a;
        if (position < 1 || position > this.queue.length) {
            const error = new Error(`Invalid position: ${position}. Must be between 1 and ${this.queue.length}.`);
            // Attempt to find a context if possible, though difficult here
            this.emit("error", error, (_a = this.nowPlaying) === null || _a === void 0 ? void 0 : _a.metadata);
            return null;
        }
        const removedTrack = this.queue.splice(position - 1, 1)[0];
        if (removedTrack) {
            this.emit("trackRemoved", removedTrack, this.queue.length, removedTrack.metadata);
        }
        return removedTrack || null;
    }
    getNext() {
        var _a;
        const previousTrackContext = (_a = this.nowPlaying) === null || _a === void 0 ? void 0 : _a.metadata;
        if (this.nowPlaying && this.loopMode === LoopMode.TRACK) {
            this.emit("trackLooped", this.nowPlaying, this.nowPlaying.metadata);
            return this.nowPlaying; // metadata is already on nowPlaying
        }
        let nextTrack = null;
        if (this.queue.length > 0) {
            nextTrack = this.queue.shift();
        }
        else if (this.loopMode === LoopMode.QUEUE && this.history.length > 0) {
            this.queue = [...this.history];
            this.history = [];
            nextTrack = this.queue.shift();
            // For queueLooped, the context might be less specific, or related to the first track of the looped queue
            this.emit("queueLooped", nextTrack === null || nextTrack === void 0 ? void 0 : nextTrack.metadata);
        }
        if (this.nowPlaying) {
            if (this.nowPlaying !== nextTrack) {
                this.history.push(this.nowPlaying);
                if (this.history.length > this.maxSize) {
                    this.history.shift();
                }
            }
        }
        this.nowPlaying = nextTrack;
        if (!this.nowPlaying && this.loopMode !== LoopMode.TRACK) {
            this.emit("queueEnd", previousTrackContext); // Pass context of the track that just ended, or last command context
        }
        return this.nowPlaying; // metadata is on the track object itself
    }
    clear(context) {
        this.queue = [];
        const oldNowPlaying = this.nowPlaying;
        this.nowPlaying = null;
        this.emit("queueCleared", context || (oldNowPlaying === null || oldNowPlaying === void 0 ? void 0 : oldNowPlaying.metadata));
    }
    shuffle(context) {
        var _a;
        if (this.queue.length > 1) {
            for (let i = this.queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
            }
            this.emit("queueShuffled", context || ((_a = this.nowPlaying) === null || _a === void 0 ? void 0 : _a.metadata));
        }
    }
    setLoopMode(mode, context) {
        var _a;
        this.loopMode = mode;
        this.emit("loopModeChanged", this.loopMode, context || ((_a = this.nowPlaying) === null || _a === void 0 ? void 0 : _a.metadata));
    }
    getLoopMode() {
        return this.loopMode;
    }
    getQueue() {
        return this.queue;
    }
    getHistory() {
        return this.history;
    }
    getSize() {
        return this.queue.length;
    }
}
exports.QueueManager = QueueManager;
