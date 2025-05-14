import { AudioPlayer, PlayerStatus, PlayableTrack } from "../../player/AudioPlayer";
import { EventEmitter } from "events";

// Mock the underlying audio library (e.g., a simple event emitter for testing)
class MockAudioResource extends EventEmitter {
  play() { setTimeout(() => this.emit("finish"), 50); } // Simulate playback finishing
  pause() {}
  resume() {}
  stop() { setTimeout(() => this.emit("finish"), 10); }
  setVolume(volume: number) {}
}

describe("AudioPlayer", () => {
  let audioPlayer: AudioPlayer;
  const mockTrack: PlayableTrack = {
    id: "test001",
    title: "Test Track",
    url: "http://example.com/test.mp3",
    streamUrl: "http://example.com/stream/test.mp3", // Assume stream URL is fetched
    source: "test_source",
    duration: 120,
  };

  beforeEach(() => {
    // Provide a mock createAudioResource function
    audioPlayer = new AudioPlayer({
      createAudioResource: (streamUrl: string) => new MockAudioResource() as any,
      initialVolume: 50,
    });
  });

  afterEach(() => {
    audioPlayer.stop(); // Clean up any playing resources
  });

  test("should initialize with IDLE status and default volume", () => {
    expect(audioPlayer.getStatus()).toBe(PlayerStatus.IDLE);
    expect(audioPlayer.getVolume()).toBe(50); // Default or initial volume
  });

  test("should play a track and emit trackStart event", async () => {
    const trackStartListener = jest.fn();
    audioPlayer.on("trackStart", trackStartListener);

    await audioPlayer.play(mockTrack);

    expect(audioPlayer.getStatus()).toBe(PlayerStatus.PLAYING);
    expect(audioPlayer.getCurrentTrack()).toEqual(mockTrack);
    expect(trackStartListener).toHaveBeenCalledWith(mockTrack);
  });

  test("should emit trackEnd event when track finishes", (done) => {
    const trackEndListener = jest.fn();
    audioPlayer.on("trackEnd", (endedTrack) => {
      trackEndListener(endedTrack);
      expect(endedTrack).toEqual(mockTrack);
      expect(audioPlayer.getStatus()).toBe(PlayerStatus.ENDED); // Or IDLE depending on implementation
      done();
    });

    audioPlayer.play(mockTrack);
  });

  test("should pause and resume playback", async () => {
    const pauseListener = jest.fn();
    const resumeListener = jest.fn();
    audioPlayer.on("pause", pauseListener);
    audioPlayer.on("resume", resumeListener);

    await audioPlayer.play(mockTrack);
    audioPlayer.pause();
    expect(audioPlayer.getStatus()).toBe(PlayerStatus.PAUSED);
    expect(pauseListener).toHaveBeenCalledWith(mockTrack);

    audioPlayer.resume();
    expect(audioPlayer.getStatus()).toBe(PlayerStatus.PLAYING);
    expect(resumeListener).toHaveBeenCalledWith(mockTrack);
  });

  test("should stop playback and emit stop event", async () => {
    const stopListener = jest.fn();
    audioPlayer.on("stop", stopListener);

    await audioPlayer.play(mockTrack);
    audioPlayer.stop();

    expect(audioPlayer.getStatus()).toBe(PlayerStatus.STOPPED); // Or IDLE
    expect(audioPlayer.getCurrentTrack()).toBeNull();
    expect(stopListener).toHaveBeenCalledWith(mockTrack);
  });

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

  test("should emit error if play is called without a streamUrl", async () => {
    const errorListener = jest.fn();
    audioPlayer.on("error", errorListener);

    const trackWithoutStream: PlayableTrack = { ...mockTrack, streamUrl: undefined };
    await audioPlayer.play(trackWithoutStream);

    expect(errorListener).toHaveBeenCalled();
    expect(audioPlayer.getStatus()).not.toBe(PlayerStatus.PLAYING);
  });
  
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

