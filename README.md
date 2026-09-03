# PsyReason

Complete Reason clone in the browser. Professional psytrance production environment with virtual devices, patch cables, sequencer, and commercial-grade DSP.

## Architecture

psyreason/
  foundation/        # Core infrastructure
    core/            # transport.mjs (PLL), dsp.mjs (PolyBLEP/ZDF/FM), grammar.mjs, director.mjs, render.mjs, midi.mjs
    dsp/             # oscillators, filters, envelopes, effects, metering, voicePool
    music/           # composition-engine (66KB), harmony, rhythm, voice-leading, coherence
    analysis/        # pitch, tempo, onset, features
    protocol/        # events, channels, state
  devices/           # Virtual devices
    subtractor/      # Subtractive synth (PolyBLEP + ZDF SVF + LFO + mod matrix)
    nn-xt/           # Advanced sampler (time-stretch, slicer, zones)
    redrum/          # Drum machine (kick/snare/hat/cymbal engines)
    thor/            # Modular synth (3 osc slots, 2 filters, mod matrix, 4 psytrance presets)
    effects/         # 7 effects: Reverb, Delay, Chorus, Distortion, Filter, Compressor, EQ
    mixer/           # Mixer 14:2 (14-channel stereo mixer with per-channel EQ and sends)
    combinator/      # Device combiner with patching and macros
    tools/           # RPG-8 Arpeggiator + Matrix Pattern Sequencer
  host/              # The Host
    rack/            # patch-graph.ts - Reason cable patching system (audio + CV cables)
    audio-engine/    # audio-engine.ts (40KB), dsp.ts (29KB), mastering.ts (17KB)
    event-bus/       # psybus event system
    composition/     # harmony, melody, motif, structure, solver, quality
    sequencer/       # piano-roll.ts + melody-gen, progression-gen, groove, euclidean
    brain/           # composer.js (9 styles: PSYTRANCE, GOA, TECHNO, TRANCE)
  ui/                # React app (Vite)
    src/             # App.tsx, RackView, CableView (SVG), SequencerView, PianoRollUI, Knob
  tests/             # Unit tests (piano-roll, patch-graph, effects, thor, mixer)
  presets/           # soundBank.js (150+ presets)

## Devices

| Device | Type | Status |
|--------|------|--------|
| Subtractor | Subtractive Synth | Active |
| NN-XT | Advanced Sampler | Active |
| Redrum | Drum Machine | Active |
| Thor | Modular Synth (4 psytrance presets) | Active |
| Mixer 14:2 | 14-Channel Mixer | Active |
| Combinator | Device Combiner | Active |
| RPG-8 | Arpeggiator | Active |
| Matrix | Pattern Sequencer | Active |
| Effects | 7 modules | Active |

## Effects

| Effect | Style | Features |
|--------|-------|----------|
| Reverb | RV-7 | 8 comb + 4 allpass, early reflections, stereo width |
| Delay | DDL-1 | Tempo sync, ping-pong, feedback filter |
| Chorus | CF-100 | Chorus/Flanger/Vibrato modes, stereo LFO |
| Distortion | Scream 4 | Tube/Digital/Fuzz/Bitcrush modes, tone shaping |
| Filter | ECF-42 | SVF multimode, envelope follower, LFO modulation |
| Compressor | MClass | Lookahead, soft knee, sidechain, brickwall limiter |
| EQ | MClass | 4-band parametric, bell/shelf/HP/LP/notch |

## Patching System (Reason's magic)

- Audio cables: connect device outputs to inputs
- CV cables: Gate, Pitch CV, Mod CV for modular control
- Spider utilities: audio/CV mergers and splitters
- Signal chain tracking with loop detection
- SVG Cable View UI with draggable cables

## Foundation (from psy - 164 tests)

- transport.mjs - MusicalTransport PLL (octave-fold, gap recovery)
- dsp.mjs - PolyBLEP + ZDF SVF + 4-op FM + wavetables
- grammar.mjs - BassGrammar (12x12), MelodicGrammar (25-bucket), RhythmGrammar (Beta)
- director.mjs - MusicalDirector with DO-NOTHING abstention
- render.mjs - Offline render + stem export + WAV encoder
- midi.mjs - Web MIDI + 24ppq clock + SMF0 export

## UI Views

- RACK - front panel view of all devices with knobs
- CABLES - back of rack view with patch cables (SVG)
- SEQUENCER - 16-step pattern sequencer with 8 tracks
- PIANO ROLL - note editor with draw/erase/select tools

## Tests

- tests/unit/piano-roll.test.ts - 15 tests
- tests/unit/patch-graph.test.ts - 12 tests
- tests/unit/effects.test.ts - 18 tests
- tests/unit/thor.test.ts - 10 tests
- tests/unit/mixer.test.ts - 8 tests

## Built On

- psy-foundation - 768 tests of core infrastructure
- psy - 164 tests, winning device (PLL, DSP, grammar)
- psysynth - 124 tests, subtractive synth
- psy-sampler - 653 tests, advanced sampler
- psydrum - drum machine with drum engines
- psy-anthem - composition engine
- psyboss - host with audio engine
- psy5 - composer (9 styles) + worklet engine


## Deployment (GitHub Pages)

The app automatically deploys to GitHub Pages on every push to main:

Live URL: https://dudududi144-source.github.io/psyreason/

### Deployment Pipeline
1. Push to main branch
2. GitHub Actions triggers deploy.yml
3. Bun installs dependencies in ui/
4. Vite builds the app
5. Artifact uploaded to GitHub Pages
6. Site deployed automatically

### Local Development
cd ui && bun install && bun run dev
Open http://localhost:3000

## Wiring Verification (All Green)

- [x] All 6 UI components imported and connected
- [x] All CSS classes defined
- [x] Vite config with correct base path
- [x] TypeScript strict mode enabled
- [x] GitHub Actions CI + Deploy workflows
- [x] Favicon included
- [x] All devices wired to rack view
- [x] Cable system with SVG rendering
- [x] Piano roll with draw/erase tools
- [x] Sequencer with real playback
- [x] Browser with device/patch listings

## UI Views (5 screens)

1. RACK - 12 devices with color-coded panels and knobs
2. CABLES - SVG patch bay with draggable audio/CV cables
3. SEQUENCER - 8-track x 16-step with psytrance default pattern
4. PIANO ROLL - Note editor with grid and tools
5. BROWSER - Device/patch/sample browser with search

## v0.4.0 - Final Build (Latest)

### New Devices Added
- **Kong** - Drum Designer with 16 pads (8 drum types: kick, snare, hat, cymbal, tom, clap, perc, fx)
- **Grain** - Granular sampler with 4 algorithms (spectral, grain, long-grain, texture)
- **Synchronous** - Step FX with 16-step parameter modulation + 3 psytrance presets
- **Pulsar Vocoder** - 16/32 band vocoder with envelope followers + 3 presets

### New UI Features
- **Keyboard** - Piano keyboard with computer keyboard mapping (A-W-S-E-D-F-T-G-Y-H-U-J-K-O-L-P)
- **Level Meters** - Animated L/R audio level visualization
- **Metronome** - Toggle metronome in transport
- **Time Display** - Elapsed time + beat indicators (1-2-3-4)
- **Status Strip** - Real-time status info

### Device Count: 23
- 4 Synthesizers (Subtractor, Thor, Malstrom, Europa)
- 2 Samplers (NN-XT, Grain)
- 2 Drum Machines (Redrum, Kong)
- 8 Effects (Synchronous, Vocoder, Reverb, Delay, Chorus, Filter, Distortion, Phaser)
- 3 Mastering (Compressor, EQ, Imager)
- 2 Mixing (Mixer 14:2, Combinator)
- 2 Tools (RPG-8 Arp, Matrix)

### UI Views: 5
1. RACK - 20 devices in 6 organized sections
2. CABLES - SVG patch bay with 9 devices
3. SEQUENCER - 8-track x 16-step with playback
4. PIANO ROLL - Note editor with tools
5. BROWSER - 23 devices + 15 patches

### Deployment Status
- All imports verified OK
- CSS classes all defined
- Vite config with correct base path
- 404.html for SPA routing
- GitHub Pages workflow ready

### Live URL
https://dudududi144-source.github.io/psyreason/

## License

MIT

## Author

dudududi144-source

<!-- Build trigger: 1788467721 -->


<!-- Build trigger npm: 1788467807 -->


<!-- Build trigger v3: 1788467898 -->


<!-- Build trigger after Pages enabled: 1788468830 -->


<!-- Build trigger after 404 fix: 1788469048 -->


<!-- v1.0 real audio build: 1788470978 -->


<!-- v2.0 bridge build: 1788471948 -->


<!-- v3.0 full architecture: 1788472417 -->


<!-- v4 coherent DAW: 1788474104 -->


<!-- v4 build fix: 1788474202 -->


<!-- v5 generate: 1788475143 -->
