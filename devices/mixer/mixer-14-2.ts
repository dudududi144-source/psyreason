// devices/mixer/mixer-14-2.ts - Reason Mixer 14:2 clone
// 14-channel stereo mixer with per-channel EQ, sends, and bus routing

import { ParametricEQ, EqBand } from '../effects/eq';
import { Compressor } from '../effects/compressor';

export interface MixerChannel {
  id: number;
  name: string;
  volume: number;        // 0-1
  pan: number;           // -1 to 1
  mute: boolean;
  solo: boolean;
  eq: ParametricEQ;
  sends: { reverb: number; delay: number; aux1: number; aux2: number };
  inputGain: number;
}

export class MixerChannelImpl implements MixerChannel {
  id: number;
  name: string;
  volume = 0.8;
  pan = 0;
  mute = false;
  solo = false;
  eq: ParametricEQ;
  sends = { reverb: 0, delay: 0, aux1: 0, aux2: 0 };
  inputGain = 1;

  constructor(id: number, name: string, sampleRate: number) {
    this.id = id;
    this.name = name;
    this.eq = new ParametricEQ(sampleRate);
  }

  process(inputL: number, inputR: number): [number, number] {
    if (this.mute) return [0, 0];

    // Apply input gain
    let outL = inputL * this.inputGain;
    let outR = inputR * this.inputGain;

    // Apply EQ
    outL = this.eq.process(outL);
    outR = this.eq.process(outR);

    // Apply pan (constant power panning)
    const panL = Math.cos((this.pan + 1) * Math.PI / 4);
    const panR = Math.sin((this.pan + 1) * Math.PI / 4);
    outL *= panL;
    outR *= panR;

    // Apply volume
    outL *= this.volume;
    outR *= this.volume;

    return [outL, outR];
  }
}

export class Mixer14 {
  channels: MixerChannelImpl[] = [];
  masterVolume = 0.9;
  masterCompressor: Compressor;
  sampleRate: number;

  // Bus outputs
  reverbBus = { level: 0.5, return: 0.5 };
  delayBus = { level: 0.5, return: 0.5 };
  aux1Bus = { level: 0.5, return: 0.5 };
  aux2Bus = { level: 0.5, return: 0.5 };

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
    this.masterCompressor = new Compressor(sampleRate, {
      threshold: -6,
      ratio: 2,
      attack: 0.03,
      release: 0.3,
    });

    // Create 14 channels
    const channelNames = [
      'KICK', 'SNARE', 'HATS', 'PERC',
      'BASS', 'LEAD', 'ARP', 'PAD',
      'FX1', 'FX2', 'FX3', 'FX4',
      'MASTER', 'AUX'
    ];
    for (let i = 0; i < 14; i++) {
      this.channels.push(new MixerChannelImpl(i, channelNames[i], sampleRate));
    }
  }

  process(inputs: [number, number][]): [number, number] {
    let sumL = 0;
    let sumR = 0;
    let anySolo = false;

    // Check if any channel is soloed
    for (const ch of this.channels) {
      if (ch.solo) { anySolo = true; break; }
    }

    // Process each channel
    for (let i = 0; i < Math.min(inputs.length, this.channels.length); i++) {
      const ch = this.channels[i];

      // Skip if solo mode and channel not soloed
      if (anySolo && !ch.solo) continue;

      const [outL, outR] = ch.process(inputs[i][0], inputs[i][1]);
      sumL += outL;
      sumR += outR;
    }

    // Apply master compressor
    sumL = this.masterCompressor.process(sumL);
    sumR = this.masterCompressor.process(sumR);

    // Apply master volume
    sumL *= this.masterVolume;
    sumR *= this.masterVolume;

    return [sumL, sumR];
  }

  setChannelVolume(index: number, volume: number): void {
    if (index >= 0 && index < this.channels.length) {
      this.channels[index].volume = Math.max(0, Math.min(1, volume));
    }
  }

  setChannelPan(index: number, pan: number): void {
    if (index >= 0 && index < this.channels.length) {
      this.channels[index].pan = Math.max(-1, Math.min(1, pan));
    }
  }

  toggleMute(index: number): void {
    if (index >= 0 && index < this.channels.length) {
      this.channels[index].mute = !this.channels[index].mute;
    }
  }

  toggleSolo(index: number): void {
    if (index >= 0 && index < this.channels.length) {
      this.channels[index].solo = !this.channels[index].solo;
    }
  }
}
