/// <reference types="node" />
import { EventEmitter } from "events";
import { PlayableTrack } from "../player/AudioPlayer";
import { CommandContext } from "../commands/CommandManager";
export declare enum LoopMode {
    NONE = "none",
    TRACK = "track",
    QUEUE = "queue"
}
export interface QueueOptions {
    maxSize?: number;
    defaultLoop?: LoopMode;
}
export declare class QueueManager extends EventEmitter {
    private queue;
    private history;
    private maxSize;
    private loopMode;
    nowPlaying: PlayableTrack | null;
    constructor(options?: QueueOptions);
    add(tracks: PlayableTrack | PlayableTrack[], priority?: boolean): number;
    remove(position: number): PlayableTrack | null;
    getNext(): PlayableTrack | null;
    clear(context?: CommandContext): void;
    shuffle(context?: CommandContext): void;
    setLoopMode(mode: LoopMode, context?: CommandContext): void;
    getLoopMode(): LoopMode;
    getQueue(): Readonly<PlayableTrack[]>;
    getHistory(): Readonly<PlayableTrack[]>;
    getSize(): number;
}
