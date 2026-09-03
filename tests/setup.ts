// tests/setup.ts - Global test setup for PsyReason
// Runs before every test file (configured in bunfig.toml)

// Polyfill AudioContext for tests that need it (most DSP tests are pure math)
if (typeof globalThis.AudioContext === 'undefined') {
  // @ts-ignore
  globalThis.AudioContext = class MockAudioContext {
    sampleRate = 44100;
    currentTime = 0;
    createGain() { return { connect: () => {}, gain: { value: 1 } }; }
    createOscillator() { return { connect: () => {}, start: () => {}, frequency: { value: 440 } }; }
    createBuffer(channels: number, length: number, sampleRate: number) {
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: () => new Float32Array(length),
      };
    }
  };
}

console.log('[PSYREASON TEST SETUP] Test environment initialized');
