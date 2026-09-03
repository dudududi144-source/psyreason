// tests/unit/mixer.test.ts
import { describe, it, expect } from 'bun:test';
import { Mixer14, MixerChannelImpl } from '../../devices/mixer/mixer-14-2';

describe('Mixer14', () => {
  it('has 14 channels', () => {
    const mixer = new Mixer14(44100);
    expect(mixer.channels.length).toBe(14);
  });

  it('channel names are correct', () => {
    const mixer = new Mixer14(44100);
    expect(mixer.channels[0].name).toBe('KICK');
    expect(mixer.channels[4].name).toBe('BASS');
    expect(mixer.channels[13].name).toBe('AUX');
  });

  it('processes input to output', () => {
    const mixer = new Mixer14(44100);
    const inputs: [number, number][] = [];
    for (let i = 0; i < 14; i++) {
      inputs.push([i === 0 ? 0.5 : 0, i === 0 ? 0.5 : 0]);
    }
    const [outL, outR] = mixer.process(inputs);
    expect(Number.isFinite(outL)).toBe(true);
    expect(Number.isFinite(outR)).toBe(true);
    expect(Math.abs(outL)).toBeGreaterThan(0);
  });

  it('mute silences channel', () => {
    const mixer = new Mixer14(44100);
    mixer.toggleMute(0);
    const inputs: [number, number][] = [[1, 1]];
    for (let i = 1; i < 14; i++) inputs.push([0, 0]);
    const [outL] = mixer.process(inputs);
    expect(Math.abs(outL)).toBeLessThan(0.01);
  });

  it('solo mutes other channels', () => {
    const mixer = new Mixer14(44100);
    mixer.toggleSolo(1);
    const inputs: [number, number][] = [];
    for (let i = 0; i < 14; i++) inputs.push([0.5, 0.5]);
    const [outL] = mixer.process(inputs);
    expect(Math.abs(outL)).toBeGreaterThan(0);
    // Only channel 1 should contribute
  });

  it('volume control affects level', () => {
    const mixer = new Mixer14(44100);
    mixer.setChannelVolume(0, 1.0);
    const inputs: [number, number][] = [[1, 1]];
    for (let i = 1; i < 14; i++) inputs.push([0, 0]);
    const [outFull] = mixer.process(inputs);

    mixer.setChannelVolume(0, 0.5);
    const [outHalf] = mixer.process(inputs);

    expect(Math.abs(outHalf)).toBeLessThan(Math.abs(outFull));
  });

  it('pan affects stereo balance', () => {
    const mixer = new Mixer14(44100);
    mixer.setChannelPan(0, -1); // full left
    const inputs: [number, number][] = [[1, 1]];
    for (let i = 1; i < 14; i++) inputs.push([0, 0]);
    const [outL, outR] = mixer.process(inputs);
    expect(Math.abs(outL)).toBeGreaterThan(Math.abs(outR));
  });
});

describe('MixerChannelImpl', () => {
  it('applies input gain', () => {
    const channel = new MixerChannelImpl(0, 'TEST', 44100);
    channel.inputGain = 0.5;
    channel.volume = 1;
    const [outL] = channel.process(1, 1);
    expect(Math.abs(outL)).toBeLessThan(0.6);
  });
});
