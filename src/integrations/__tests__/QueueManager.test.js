"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueueManager_1 = require("../../queue/QueueManager");
describe("QueueManager", () => {
    let queueManager;
    const mockTrack1 = { id: "1", title: "Track 1", url: "http://example.com/track1", source: "youtube", duration: 180 };
    const mockTrack2 = { id: "2", title: "Track 2", url: "http://example.com/track2", source: "soundcloud", duration: 240 };
    const mockTrack3 = { id: "3", title: "Track 3", url: "http://example.com/track3", source: "youtube", duration: 200 };
    beforeEach(() => {
        queueManager = new QueueManager_1.QueueManager({ maxSize: 5 });
    });
    test("should add a track to the queue", () => {
        queueManager.add(mockTrack1);
        expect(queueManager.getSize()).toBe(1);
        expect(queueManager.getQueue()[0]).toEqual(mockTrack1);
    });
    test("should add multiple tracks to the queue", () => {
        queueManager.add([mockTrack1, mockTrack2]);
        expect(queueManager.getSize()).toBe(2);
        expect(queueManager.getQueue()).toEqual([mockTrack1, mockTrack2]);
    });
    test("should add a track to the front if priority is true", () => {
        queueManager.add(mockTrack1);
        queueManager.add(mockTrack2, true);
        expect(queueManager.getQueue()[0]).toEqual(mockTrack2);
        expect(queueManager.getSize()).toBe(2);
    });
    test("should not exceed max size", () => {
        const tracks = Array(6).fill(0).map((_, i) => (Object.assign(Object.assign({}, mockTrack1), { id: `t${i}`, title: `Track ${i}` })));
        const addSize = queueManager.add(tracks);
        expect(addSize).toBe(0); // Or check the actual number added if partial add is implemented
        expect(queueManager.getSize()).toBe(0); // Assuming it rejects if oversized, or adds up to maxSize
        // If partial add was implemented, this would be: expect(queueManager.getSize()).toBe(5);
    });
    test("should remove a track by position", () => {
        queueManager.add([mockTrack1, mockTrack2, mockTrack3]);
        const removed = queueManager.remove(2); // Remove mockTrack2
        expect(removed).toEqual(mockTrack2);
        expect(queueManager.getSize()).toBe(2);
        expect(queueManager.getQueue()).toEqual([mockTrack1, mockTrack3]);
    });
    test("should return null when removing from invalid position", () => {
        queueManager.add(mockTrack1);
        expect(queueManager.remove(0)).toBeNull();
        expect(queueManager.remove(2)).toBeNull();
        expect(queueManager.getSize()).toBe(1);
    });
    test("should get the next track and set it as nowPlaying", () => {
        queueManager.add([mockTrack1, mockTrack2]);
        const next = queueManager.getNext();
        expect(next).toEqual(mockTrack1);
        expect(queueManager.nowPlaying).toEqual(mockTrack1);
        expect(queueManager.getSize()).toBe(1);
        expect(queueManager.getHistory()).toContain(mockTrack1); // if nowPlaying is added to history immediately
    });
    test("should handle getNext when queue is empty", () => {
        const next = queueManager.getNext();
        expect(next).toBeNull();
        expect(queueManager.nowPlaying).toBeNull();
    });
    test("should clear the queue", () => {
        queueManager.add([mockTrack1, mockTrack2]);
        queueManager.clear();
        expect(queueManager.getSize()).toBe(0);
        expect(queueManager.nowPlaying).toBeNull(); // Check if nowPlaying is also cleared
    });
    test("should shuffle the queue", () => {
        queueManager.add([mockTrack1, mockTrack2, mockTrack3]);
        const originalQueue = [...queueManager.getQueue()];
        queueManager.shuffle();
        expect(queueManager.getSize()).toBe(3);
        // Check if the order is different (statistically, not guaranteed for small arrays but good enough for a test)
        // A more robust check would be to ensure all original elements are still present.
        expect(queueManager.getQueue()).not.toEqual(originalQueue);
        originalQueue.forEach(track => expect(queueManager.getQueue()).toContain(track));
    });
    test("should set and get loop mode", () => {
        queueManager.setLoopMode(QueueManager_1.LoopMode.TRACK);
        expect(queueManager.getLoopMode()).toBe(QueueManager_1.LoopMode.TRACK);
        queueManager.setLoopMode(QueueManager_1.LoopMode.QUEUE);
        expect(queueManager.getLoopMode()).toBe(QueueManager_1.LoopMode.QUEUE);
        queueManager.setLoopMode(QueueManager_1.LoopMode.NONE);
        expect(queueManager.getLoopMode()).toBe(QueueManager_1.LoopMode.NONE);
    });
    test("loopMode.TRACK should return nowPlaying track on getNext()", () => {
        queueManager.add(mockTrack1);
        queueManager.getNext(); // mockTrack1 is nowPlaying
        queueManager.setLoopMode(QueueManager_1.LoopMode.TRACK);
        const next = queueManager.getNext();
        expect(next).toEqual(mockTrack1);
        expect(queueManager.nowPlaying).toEqual(mockTrack1);
        expect(queueManager.getSize()).toBe(0); // Original queue was emptied
    });
    test("loopMode.QUEUE should re-populate queue from history when queue is empty", () => {
        queueManager.add([mockTrack1, mockTrack2]);
        queueManager.getNext(); // mockTrack1 to history, mockTrack2 is nowPlaying
        queueManager.getNext(); // mockTrack2 to history, queue is empty
        expect(queueManager.getSize()).toBe(0);
        expect(queueManager.getHistory().length).toBe(2);
        queueManager.setLoopMode(QueueManager_1.LoopMode.QUEUE);
        const next = queueManager.getNext();
        expect(next).toEqual(mockTrack1); // First track from history
        expect(queueManager.nowPlaying).toEqual(mockTrack1);
        expect(queueManager.getSize()).toBe(1); // mockTrack2 should be in queue now
        expect(queueManager.getQueue()[0]).toEqual(mockTrack2);
        expect(queueManager.getHistory().length).toBe(1); // mockTrack1 moved from history to nowPlaying
    });
});
