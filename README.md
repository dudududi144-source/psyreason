# PsyReason

A complete Reason clone in the browser.

## Vision

PsyReason implements the Reason philosophy:
- Rack View - virtual hardware with front panels
- Cable View - back panel with audio and CV cables
- Professional Devices - synths, samplers, drums, effects, mixers
- Advanced Sequencer - Arrangement, Piano Roll, Automation
- Composition Engine - generative harmony and melody

## Architecture

psyreason/
  foundation/  - Core infrastructure
  devices/     - Virtual devices
  host/        - Rack, Sequencer, Audio Engine
  ui/          - User interface
  presets/     - Factory presets
  tests/       - Unified tests

## Quick Start

```bash
bun install
bun run dev
bun test
bun run build
```

## Built On

- psy-foundation - 768 tests
- psysynth - 124 tests
- psy-sampler - 653 tests
- psydrum - drum engines
- psy-anthem - composition engine
- psyboss - host engine

## License

MIT
