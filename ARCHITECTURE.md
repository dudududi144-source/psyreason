# PsyReason Architecture

## Overview

PsyReason is a complete Reason clone in the browser, built from the best code extracted from 15 PSY repositories.

## Architecture Layers

UI Layer: RackView, SequencerView, CableView, BrowserView
Host Layer: AudioEngine, Sequencer, Composition, Event Bus
Device Layer: Subtractor, NN-XT, Redrum, Effects, Mixer, Combinator
Foundation Layer: DSP, Music, Analysis, Protocol, Transport, MIDI

## Device Protocol

interface PsyDevice {
  id: string;
  name: string;
  type: synth | sampler | drum | effect | mixer | combinator;
  audioInputs: AudioPort[];
  audioOutputs: AudioPort[];
  cvInputs: CVPort[];
  cvOutputs: CVPort[];
  parameters: Parameter[];
  init(audioContext: AudioContext): Promise<void>;
  process(block: AudioBlock): void;
  dispose(): void;
}

## Audio Engine

- AudioWorklet-based DSP (no main thread blocking)
- Graph builder: constructs AudioContext graph from devices
- Offline render: deterministic bounce to WAV
- Mastering chain: EQ -> Compressor -> Limiter

## Composition Engine

- Harmony: chord progressions, voice leading, tension curves
- Melody: generative melody with motif memory
- Structure: macro form, section planner
- Solver: constraint-based composition
- Quality: artistic validation

## Foundation Modules (from psy)

| Module | Size | Purpose |
|--------|------|---------|
| transport.mjs | 17KB | MusicalTransport PLL |
| dsp.mjs | 17KB | PolyBLEP, ZDF SVF, FM, wavetables |
| grammar.mjs | 14KB | 3 grammar classes |
| director.mjs | 11KB | MusicalDirector |
| render.mjs | 11KB | Offline render + WAV |
| midi.mjs | 12KB | Web MIDI + SMF0 |
| foundation.mjs | 28KB | Core utilities |

## Effects Chain

Input -> Distortion -> Filter -> Chorus -> Delay -> Reverb -> EQ -> Compressor -> Output

## Psytrance Presets

- Acid Bass Station: Subtractor -> Filter -> Delay -> Compressor
- Psy Lead Machine: Subtractor -> Chorus -> Reverb
- Full-On Drum Kit: Redrum -> EQ -> Compressor
- Psytrance FX: acidDelay, psychedelicSpace, fullOnDrive, darkProgressive
