import DevicePanel from './DevicePanel';

interface DeviceDef {
  id: string;
  name: string;
  type: string;
  color: string;
  params: Record<string, number>;
}

const DEVICES: DeviceDef[] = [
  { id: 'subtractor', name: 'SUBTRACTOR', type: 'Synthesizer', color: '#ff6600', params: { cutoff: 0.7, resonance: 0.3, attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 } },
  { id: 'thor', name: 'THOR', type: 'Modular Synth', color: '#ff2bd6', params: { osc1Level: 0.8, osc2Level: 0.4, filterFreq: 0.65, resonance: 0.5, envAmount: 0.4, drive: 0.3 } },
  { id: 'malstrom', name: 'MALSTROM', type: 'Graintable', color: '#ffaa00', params: { position: 0.3, motion: 0.2, index: 0.5, pitch: 0 } },
  { id: 'europa', name: 'EUROPA', type: 'Wavetable', color: '#00ffcc', params: { position: 0, shape: 0.5, harmonics: 0.6, unison: 1 } },
  { id: 'nn-xt', name: 'NN-XT', type: 'Sampler', color: '#00aaff', params: { volume: 0.8, pan: 0, tune: 0, filterFreq: 1.0 } },
  { id: 'grain', name: 'GRAIN', type: 'Granular', color: '#66ccff', params: { grainSize: 0.4, spacing: 0.3, jitter: 0.2, spray: 0.3, pitch: 0 } },
  { id: 'redrum', name: 'REDRUM', type: 'Drum Machine', color: '#ffcc00', params: { volume: 0.9, decay: 0.5, tone: 0.5, pitch: 0.5 } },
  { id: 'kong', name: 'KONG', type: 'Drum Designer', color: '#ff8800', params: { pad1Volume: 0.8, pad2Volume: 0.8, masterVolume: 0.9 } },
  { id: 'mixer', name: 'MIXER 14:2', type: 'Mixer', color: '#00ff88', params: { masterVolume: 0.9, ch1Volume: 0.8, ch2Volume: 0.8 } },
  { id: 'synchronous', name: 'SYNCHRONOUS', type: 'Step FX', color: '#cc66ff', params: { rate: 0.25, filterFreq: 0.5, drive: 0.3 } },
  { id: 'vocoder', name: 'PULSAR', type: 'Vocoder', color: '#ff66cc', params: { bands: 0.5, hold: 0.3, dryWet: 0.8 } },
  { id: 'reverb', name: 'RV-7 REVERB', type: 'Effect', color: '#aa66ff', params: { roomSize: 0.7, damping: 0.5, wetLevel: 0.3, dryLevel: 0.7 } },
  { id: 'delay', name: 'DDL-1 DELAY', type: 'Effect', color: '#aa66ff', params: { time: 0.375, feedback: 0.4, wetLevel: 0.35, dryLevel: 0.8 } },
  { id: 'chorus', name: 'CF-100 CHORUS', type: 'Effect', color: '#aa66ff', params: { rate: 0.5, depth: 0.5, feedback: 0.3 } },
  { id: 'phaser', name: 'PHASER', type: 'Effect', color: '#aa66ff', params: { rate: 0.5, depth: 0.7, feedback: 0.4, stages: 4 } },
  { id: 'compressor', name: 'MCLASS COMP', type: 'Mastering', color: '#ff4444', params: { threshold: 0.6, ratio: 0.4, attack: 0.1, release: 0.3, makeup: 0.5 } },
  { id: 'eq', name: 'MCLASS EQ', type: 'Mastering', color: '#ff4444', params: { lowGain: 0.5, midGain: 0.5, highGain: 0.5 } },
  { id: 'imager', name: 'MCLASS IMAGER', type: 'Mastering', color: '#ff4444', params: { lowWidth: 0, midWidth: 0.5, highWidth: 1.0 } },
  { id: 'arp', name: 'RPG-8 ARP', type: 'Tool', color: '#66ffcc', params: { rate: 0.25, gate: 0.5 } },
  { id: 'matrix', name: 'MATRIX', type: 'Sequencer', color: '#66ffcc', params: { pattern: 0, step: 0 } },
];

const SECTIONS = [
  { title: 'SYNTHESIZERS', filter: (d: DeviceDef) => ['Synthesizer', 'Modular Synth', 'Graintable', 'Wavetable'].includes(d.type) },
  { title: 'SAMPLERS', filter: (d: DeviceDef) => ['Sampler', 'Granular'].includes(d.type) },
  { title: 'DRUMS', filter: (d: DeviceDef) => ['Drum Machine', 'Drum Designer'].includes(d.type) },
  { title: 'EFFECTS & STEP FX', filter: (d: DeviceDef) => ['Effect', 'Step FX', 'Vocoder'].includes(d.type) },
  { title: 'MASTERING', filter: (d: DeviceDef) => d.type === 'Mastering' },
  { title: 'MIXING & TOOLS', filter: (d: DeviceDef) => ['Mixer', 'Tool', 'Sequencer'].includes(d.type) },
];

export default function RackView() {
  return (
    <div className="rack-view">
      <div className="rack-header">
        <h2>DEVICE RACK</h2>
        <span className="rack-count">{DEVICES.length} devices loaded</span>
      </div>
      {SECTIONS.map((section) => {
        const devices = DEVICES.filter(section.filter);
        if (devices.length === 0) return null;
        return (
          <div key={section.title} className="rack-section">
            <h3 className="rack-section-title">{section.title}</h3>
            <div className="rack-grid">
              {devices.map((device) => (
                <DevicePanel key={device.id} device={device} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
