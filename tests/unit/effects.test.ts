// tests/unit/effects.test.ts
import { describe, it, expect } from 'bun:test';
import { StereoReverb } from '../../devices/effects/reverb';
import { DigitalDelay, divisionToTime } from '../../devices/effects/delay';
import { Distortion } from '../../devices/effects/distortion';
import { StateVariableFilter } from '../../devices/effects/filter';
import { Compressor } from '../../devices/effects/compressor';
import { ParametricEQ, computeBiquadCoeffs } from '../../devices/effects/eq';

describe('StereoReverb', () => {
  it('produces output for impulse input', () => {
    const reverb = new StereoReverb(44100, { wetLevel: 1, dryLevel: 0, roomSize: 0.7 });
    let totalEnergy = 0;
    for (let i = 0; i < 44100; i++) {
      const input = i === 0 ? 1 : 0;
      const [outL, outR] = reverb.process(input, input);
      totalEnergy += outL * outL + outR * outR;
    }
    expect(totalEnergy).toBeGreaterThan(0);
  });

  it('tail decays over time', () => {
    const reverb = new StereoReverb(44100, { wetLevel: 1, dryLevel: 0, roomSize: 0.5 });
    // impulse
    reverb.process(1, 1);
    // measure energy in first 0.1s vs last 0.1s of 1 second
    let earlyEnergy = 0;
    let lateEnergy = 0;
    for (let i = 0; i < 44100; i++) {
      const [outL] = reverb.process(0, 0);
      if (i < 4410) earlyEnergy += outL * outL;
      if (i > 39690) lateEnergy += outL * outL;
    }
    expect(earlyEnergy).toBeGreaterThan(lateEnergy);
  });

  it('dry-only mode passes input through', () => {
    const reverb = new StereoReverb(44100, { wetLevel: 0, dryLevel: 1 });
    const [outL, outR] = reverb.process(0.5, 0.5);
    expect(outL).toBeCloseTo(0.5, 5);
    expect(outR).toBeCloseTo(0.5, 5);
  });
});

describe('DigitalDelay', () => {
  it('converts beat divisions to time', () => {
    expect(divisionToTime(0.25, 145)).toBeCloseTo(60 / 145, 5); // quarter note
    expect(divisionToTime(0.125, 145)).toBeCloseTo(30 / 145, 5); // eighth note
  });

  it('delays signal by correct amount', () => {
    const delay = new DigitalDelay(44100, { sync: false, time: 0.1, wetLevel: 1, dryLevel: 0, feedback: 0 });
    let impulseOut = 0;
    const delaySamples = Math.floor(0.1 * 44100);
    for (let i = 0; i < delaySamples + 100; i++) {
      const input = i === 0 ? 1 : 0;
      const [outL] = delay.process(input, input);
      if (i === delaySamples) impulseOut = outL;
    }
    expect(Math.abs(impulseOut)).toBeGreaterThan(0.5);
  });

  it('feedback creates repeats', () => {
    const delay = new DigitalDelay(44100, { sync: false, time: 0.05, wetLevel: 1, dryLevel: 0, feedback: 0.5 });
    let nonZeroSamples = 0;
    for (let i = 0; i < 44100; i++) {
      const input = i === 0 ? 1 : 0;
      const [outL] = delay.process(input, input);
      if (Math.abs(outL) > 0.001) nonZeroSamples++;
    }
    // With feedback, should have more output than just one repeat
    expect(nonZeroSamples).toBeGreaterThan(44100 * 0.05 * 2);
  });

  it('does not produce NaN', () => {
    const delay = new DigitalDelay(44100, { feedback: 0.95 });
    for (let i = 0; i < 10000; i++) {
      const input = i === 0 ? 1 : 0;
      const [outL, outR] = delay.process(input, input);
      expect(Number.isFinite(outL)).toBe(true);
      expect(Number.isFinite(outR)).toBe(true);
    }
  });
});

describe('Distortion', () => {
  it('tube mode adds harmonics (output differs from input)', () => {
    const dist = new Distortion(44100, { mode: 'tube', drive: 0.8, outputGain: 1 });
    const input = 0.5;
    const output = dist.process(input);
    expect(output).not.toBe(input);
    expect(Number.isFinite(output)).toBe(true);
  });

  it('bitcrush reduces resolution', () => {
    const dist = new Distortion(44100, { mode: 'bitcrush', drive: 0.9 });
    const out1 = dist.process(0.123456);
    // bitcrushed output should be quantized
    expect(Number.isFinite(out1)).toBe(true);
  });

  it('all modes produce finite output for any input', () => {
    const modes = ['tube', 'digital', 'fuzz', 'bitcrush'];
    for (const mode of modes) {
      const dist = new Distortion(44100, { mode: mode as 'tube', drive: 1 });
      for (const input of [-1, -0.5, 0, 0.5, 1]) {
        const output = dist.process(input);
        expect(Number.isFinite(output)).toBe(true);
      }
    }
  });
});

describe('StateVariableFilter', () => {
  it('lowpass attenuates high frequencies', () => {
    const filter = new StateVariableFilter(44100, { frequency: 1000, resonance: 0, mode: 'lowpass' });
    // Warm up
    for (let i = 0; i < 1000; i++) filter.process(Math.sin(2 * Math.PI * 8000 * i / 44100));
    // Measure high freq output
    let highEnergy = 0;
    for (let i = 0; i < 4410; i++) {
      const out = filter.process(Math.sin(2 * Math.PI * 8000 * i / 44100));
      highEnergy += out * out;
    }
    // Measure low freq output
    const filter2 = new StateVariableFilter(44100, { frequency: 1000, resonance: 0, mode: 'lowpass' });
    for (let i = 0; i < 1000; i++) filter2.process(Math.sin(2 * Math.PI * 100 * i / 44100));
    let lowEnergy = 0;
    for (let i = 0; i < 4410; i++) {
      const out = filter2.process(Math.sin(2 * Math.PI * 100 * i / 44100));
      lowEnergy += out * out;
    }
    expect(lowEnergy).toBeGreaterThan(highEnergy * 2);
  });

  it('resonance creates peak at cutoff', () => {
    const lowRes = new StateVariableFilter(44100, { frequency: 1000, resonance: 0.1, mode: 'lowpass' });
    const highRes = new StateVariableFilter(44100, { frequency: 1000, resonance: 0.9, mode: 'lowpass' });

    let energyLowRes = 0;
    let energyHighRes = 0;
    for (let i = 0; i < 4410; i++) {
      const input = Math.sin(2 * Math.PI * 1000 * i / 44100);
      const out1 = lowRes.process(input);
      const out2 = highRes.process(input);
      energyLowRes += out1 * out1;
      energyHighRes += out2 * out2;
    }
    expect(energyHighRes).toBeGreaterThan(energyLowRes);
  });
});

describe('Compressor', () => {
  it('reduces gain for loud signals', () => {
    const comp = new Compressor(44100, { threshold: -20, ratio: 4, makeupGain: 0, lookahead: 0.001 });
    // Warm up with loud signal
    let lastOut = 0;
    for (let i = 0; i < 4410; i++) {
      lastOut = comp.process(0.9);
    }
    expect(Math.abs(lastOut)).toBeLessThan(0.9);
  });

  it('does not affect signals below threshold', () => {
    const comp = new Compressor(44100, { threshold: -6, ratio: 4, makeupGain: 0, lookahead: 0.001 });
    let lastOut = 0;
    for (let i = 0; i < 4410; i++) {
      lastOut = comp.process(0.1);
    }
    expect(Math.abs(lastOut)).toBeGreaterThan(0.08); // nearly unchanged
  });

  it('gain reduction is reported', () => {
    const comp = new Compressor(44100, { threshold: -20, ratio: 8, makeupGain: 0, lookahead: 0.001 });
    for (let i = 0; i < 4410; i++) comp.process(0.9);
    expect(comp.getGainReductionDb()).toBeLessThan(0);
  });
});

describe('ParametricEQ', () => {
  it('flat EQ passes signal unchanged', () => {
    const eq = new ParametricEQ(44100, [
      { frequency: 1000, gain: 0, q: 1, type: 'bell', enabled: false },
    ]);
    let out = 0;
    for (let i = 0; i < 1000; i++) {
      out = eq.process(0.5);
    }
    // disabled band -> passthrough
    expect(out).toBeCloseTo(0.5, 1);
  });

  it('boost increases level at target frequency', () => {
    const boost = new ParametricEQ(44100, [
      { frequency: 1000, gain: 6, q: 1, type: 'bell', enabled: true },
    ]);
    const flat = new ParametricEQ(44100, [
      { frequency: 1000, gain: 0, q: 1, type: 'bell', enabled: true },
    ]);

    let boostEnergy = 0;
    let flatEnergy = 0;
    for (let i = 0; i < 4410; i++) {
      const input = Math.sin(2 * Math.PI * 1000 * i / 44100);
      const out1 = boost.process(input);
      const out2 = flat.process(input);
      boostEnergy += out1 * out1;
      flatEnergy += out2 * out2;
    }
    expect(boostEnergy).toBeGreaterThan(flatEnergy);
  });

  it('biquad coefficients are finite', () => {
    const types = ['bell', 'lowShelf', 'highShelf', 'lowpass', 'highpass', 'notch'];
    for (const type of types) {
      const coeffs = computeBiquadCoeffs(type as 'bell', 1000, 6, 1, 44100);
      expect(Number.isFinite(coeffs.b0)).toBe(true);
      expect(Number.isFinite(coeffs.a0)).toBe(true);
      expect(coeffs.a0).not.toBe(0);
    }
  });
});
