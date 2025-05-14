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
const AudioPlayer_1 = require("../../player/AudioPlayer");
const events_1 = require("events");
// Mock the underlying audio library (e.g., a simple event emitter for testing)
class MockAudioResource extends events_1.EventEmitter {
    play() { setTimeout(() => this.emit("finish"), 50); } // Simulate playback finishing
    pause() { }
    resume() { }
    stop() { setTimeout(() => this.emit("finish"), 10); }
    setVolume(volume) { }
}
describe("AudioPlayer", () => {
    let audioPlayer;
    const mockTrack = {
        id: "test001",
        title: "Test Track",
        url: "http://example.com/test.mp3",
        streamUrl: "http://example.com/stream/test.mp3", // Assume stream URL is fetched
        source: "test_source",
        duration: 120,
    };
    beforeEach(() => {
        // Provide a mock createAudioResource function
        audioPlayer = new AudioPlayer_1.AudioPlayer({
            createAudioResource: (streamUrl) => new MockAudioResource(),
            initialVolume: 50,
        });
    });
    afterEach(() => {
        audioPlayer.stop(); // Clean up any playing resources
    });
    test("should initialize with IDLE status and default volume", () => {
        expect(audioPlayer.getStatus()).toBe(AudioPlayer_1.PlayerStatus.IDLE);
        expect(audioPlayer.getVolume()).toBe(50); // Default or initial volume
    });
    test("should play a track and emit trackStart event", () => __awaiter(void 0, void 0, void 0, function* () {
        const trackStartListener = jest.fn();
        audioPlayer.on("trackStart", trackStartListener);
        yield audioPlayer.play(mockTrack);
        expect(audioPlayer.getStatus()).toBe(AudioPlayer_1.PlayerStatus.PLAYING);
        expect(audioPlayer.getCurrentTrack()).toEqual(mockTrack);
        expect(trackStartListener).toHaveBeenCalledWith(mockTrack);
    }));
    test("should emit trackEnd event when track finishes", (done) => {
        const trackEndListener = jest.fn();
        audioPlayer.on("trackEnd", (endedTrack) => {
            trackEndListener(endedTrack);
            expect(endedTrack).toEqual(mockTrack);
            expect(audioPlayer.getStatus()).toBe(AudioPlayer_1.PlayerStatus.ENDED); // Or IDLE depending on implementation
            done();
        });
        audioPlayer.play(mockTrack);
    });
    test("should pause and resume playback", () => __awaiter(void 0, void 0, void 0, function* () {
        const pauseListener = jest.fn();
        const resumeListener = jest.fn();
        audioPlayer.on("pause", pauseListener);
        audioPlayer.on("resume", resumeListener);
        yield audioPlayer.play(mockTrack);
        audioPlayer.pause();
        expect(audioPlayer.getStatus()).toBe(AudioPlayer_1.PlayerStatus.PAUSED);
        expect(pauseListener).toHaveBeenCalledWith(mockTrack);
        audioPlayer.resume();
        expect(audioPlayer.getStatus()).toBe(AudioPlayer_1.PlayerStatus.PLAYING);
        expect(resumeListener).toHaveBeenCalledWith(mockTrack);
    }));
    test("should stop playback and emit stop event", () => __awaiter(void 0, void 0, void 0, function* () {
        const stopListener = jest.fn();
        audioPlayer.on("stop", stopListener);
        yield audioPlayer.play(mockTrack);
        audioPlayer.stop();
        expect(audioPlayer.getStatus()).toBe(AudioPlayer_1.PlayerStatus.STOPPED); // Or IDLE
        expect(audioPlayer.getCurrentTrack()).toBeNull();
        expect(stopListener).toHaveBeenCalledWith(mockTrack);
    }));
    test("should set and get volume, emitting volumeChange event", () => {
        const volumeChangeListener = jest.fn();
        audioPlayer.on("volumeChange", volumeChangeListener);
        audioPlayer.setVolume(75);
        expect(audioPlayer.getVolume()).toBe(75);
        expect(volumeChangeListener).toHaveBeenCalledWith(75);
        audioPlayer.setVolume(0);
        expect(audioPlayer.getVolume()).toBe(0);
        expect(volumeChangeListener).toHaveBeenCalledWith(0);
        audioPlayer.setVolume(100);
        expect(audioPlayer.getVolume()).toBe(100);
        expect(volumeChangeListener).toHaveBeenCalledWith(100);
    });
    test("should emit error if play is called without a streamUrl", () => __awaiter(void 0, void 0, void 0, function* () {
        const errorListener = jest.fn();
        audioPlayer.on("error", errorListener);
        const trackWithoutStream = Object.assign(Object.assign({}, mockTrack), { streamUrl: undefined });
        yield audioPlayer.play(trackWithoutStream);
        expect(errorListener).toHaveBeenCalled();
        expect(audioPlayer.getStatus()).not.toBe(AudioPlayer_1.PlayerStatus.PLAYING);
    }));
    test("should emit queueEndCheck after a track finishes if not looping", (done) => {
        const queueEndCheckListener = jest.fn();
        audioPlayer.on("queueEndCheck", queueEndCheckListener);
        audioPlayer.on("trackEnd", () => {
            // This ensures queueEndCheck is called after trackEnd processing
            process.nextTick(() => {
                expect(queueEndCheckListener).toHaveBeenCalled();
                done();
            });
        });
        audioPlayer.play(mockTrack);
    });
});
