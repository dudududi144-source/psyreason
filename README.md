# PsyReason

Complete Reason clone in the browser. Professional psytrance production environment.

## Architecture

psyreason/
  foundation/ - Core infrastructure (DSP, music, analysis, protocol)
    core/ - transport.mjs, dsp.mjs, grammar.mjs, director.mjs, render.mjs, midi.mjs
    dsp/ - oscillators, filters, envelopes, effects, metering
    music/ - composition-engine, harmony, rhythm, voice-leading
    analysis/ - pitch, tempo, onset, features
    protocol/ - events, channels, state
  devices/ - Virtual devices
    subtractor/ - Subtractive synth (from psysynth)
    nn-xt/ - Advanced sampler (from psy-sampler)
    redrum/ - Drum machine (from psydrum)
    effects/ - Reverb, Delay, Chorus, Distortion, Filter, Compressor, EQ
    mixer/ - Mixer 14:2 (14-channel stereo mixer)
    combinator/ - Device combiner with patching
  host/ - The Host
    audio-engine/ - audio-engine.ts (40KB), dsp.ts (29KB), mastering.ts (17KB)
    event-bus/ - psybus event system
    composition/ - harmony, melody, motif, structure, solver, quality
    sequencer/ - melody-gen, progression-gen, groove, euclidean
    brain/ - composer.js (9 styles: PSYTRANCE, GOA, TECHNO, TRANCE)
  ui/ - React app (Vite)
    src/ - App.tsx, components (RackView, SequencerView, Knob)
  presets/ - soundBank.js (150+ presets)

## Devices

| Device | Type | Status |
|--------|------|--------|
| Subtractor | Subtractive Synth | Active |
| NN-XT | Advanced Sampler | Active |
| Redrum | Drum Machine | Active |
| Mixer 14:2 | 14-Channel Mixer | Active |
| Effects | 7 modules | Active |
| Combinator | Device Combiner | Active |

## Effects

- Reverb (RV-7 style) - 8 comb + 4 allpass, early reflections
- Delay (DDL-1 style) - Tempo sync, ping-pong, feedback filter
- Chorus (CF-100 style) - Chorus/Flanger/Vibrato modes
- Distortion (Scream 4 style) - Tube/Digital/Fuzz/Bitcrush
- Filter (ECF-42 style) - SVF multimode, envelope follower
- Compressor (MClass style) - Lookahead, soft knee, sidechain
- EQ (MClass style) - 4-band parametric

## Foundation

- transport.mjs - MusicalTransport PLL (164 tests)
- dsp.mjs - PolyBLEP + ZDF SVF + 4-op FM + wavetables
- grammar.mjs - BassGrammar, MelodicGrammar, RhythmGrammar
- director.mjs - MusicalDirector with DO-NOTHING abstention
- render.mjs - Offline render + stem export + WAV encoder
- midi.mjs - Web MIDI + 24ppq clock + SMF0 export

## Built On

- psy-foundation - 768 tests
- psy - 164 tests, winning device
- psysynth - 124 tests
- psy-sampler - 653 tests
- psydrum - drum engines
- psy-anthem - composition engine
- psyboss - host engine
- psy5 - composer (9 styles)

## License

MIT
