import DevicePanel from './DevicePanel';

const DEVICES = [
  { id: 'subtractor', name: 'SUBTRACTOR', type: 'Synthesizer', params: { cutoff: 0.7, resonance: 0.3, attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 } },
  { id: 'nn-xt', name: 'NN-XT', type: 'Sampler', params: { volume: 0.8, pan: 0, tune: 0 } },
  { id: 'redrum', name: 'REDRUM', type: 'Drum Machine', params: { volume: 0.9, decay: 0.5, tone: 0.5 } },
  { id: 'mixer', name: 'MIXER 14:2', type: 'Mixer', params: { masterVolume: 0.9 } },
  { id: 'reverb', name: 'RV-7 REVERB', type: 'Effect', params: { roomSize: 0.7, wetLevel: 0.3, dryLevel: 0.7 } },
  { id: 'delay', name: 'DDL-1 DELAY', type: 'Effect', params: { time: 0.375, feedback: 0.4, wetLevel: 0.35 } },
];

export default function RackView() {
  return (
    <div className="rack-view">
      {DEVICES.map((device) => (
        <DevicePanel key={device.id} device={device} />
      ))}
    </div>
  );
}
