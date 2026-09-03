import { useState } from 'react';
import RackView from './components/RackView';
import SequencerView from './components/SequencerView';
import CableView from './components/CableView';
import PianoRollUI from './components/PianoRollUI';
import BrowserView from './components/BrowserView';
import TransportBar from './components/TransportBar';

type ViewMode = 'rack' | 'cables' | 'sequencer' | 'pianoroll' | 'browser';

const DEFAULT_CABLE_DEVICES = [
  {
    id: 'subtractor1',
    name: 'SUBTRACTOR',
    x: 40,
    y: 40,
    inputs: [
      { id: 'sub1-cv-gate', name: 'Gate In', type: 'cv' as const },
      { id: 'sub1-cv-pitch', name: 'Pitch CV', type: 'cv' as const },
    ],
    outputs: [
      { id: 'sub1-out-l', name: 'Out L', type: 'audio' as const },
      { id: 'sub1-out-r', name: 'Out R', type: 'audio' as const },
    ],
  },
  {
    id: 'thor1',
    name: 'THOR',
    x: 40,
    y: 200,
    inputs: [
      { id: 'thor1-cv-gate', name: 'Gate In', type: 'cv' as const },
      { id: 'thor1-cv-mod', name: 'Mod CV', type: 'cv' as const },
    ],
    outputs: [
      { id: 'thor1-out-l', name: 'Out L', type: 'audio' as const },
      { id: 'thor1-out-r', name: 'Out R', type: 'audio' as const },
    ],
  },
  {
    id: 'delay1',
    name: 'DDL-1 DELAY',
    x: 340,
    y: 40,
    inputs: [
      { id: 'delay1-in-l', name: 'In L', type: 'audio' as const },
      { id: 'delay1-in-r', name: 'In R', type: 'audio' as const },
    ],
    outputs: [
      { id: 'delay1-out-l', name: 'Out L', type: 'audio' as const },
      { id: 'delay1-out-r', name: 'Out R', type: 'audio' as const },
    ],
  },
  {
    id: 'reverb1',
    name: 'RV-7 REVERB',
    x: 340,
    y: 200,
    inputs: [
      { id: 'reverb1-in-l', name: 'In L', type: 'audio' as const },
      { id: 'reverb1-in-r', name: 'In R', type: 'audio' as const },
    ],
    outputs: [
      { id: 'reverb1-out-l', name: 'Out L', type: 'audio' as const },
      { id: 'reverb1-out-r', name: 'Out R', type: 'audio' as const },
    ],
  },
  {
    id: 'mixer1',
    name: 'MIXER 14:2',
    x: 640,
    y: 40,
    inputs: [
      { id: 'mixer1-in1-l', name: 'Ch 1 L', type: 'audio' as const },
      { id: 'mixer1-in1-r', name: 'Ch 1 R', type: 'audio' as const },
      { id: 'mixer1-in2-l', name: 'Ch 2 L', type: 'audio' as const },
      { id: 'mixer1-in2-r', name: 'Ch 2 R', type: 'audio' as const },
    ],
    outputs: [
      { id: 'mixer1-master-l', name: 'Master L', type: 'audio' as const },
      { id: 'mixer1-master-r', name: 'Master R', type: 'audio' as const },
    ],
  },
  {
    id: 'lfo1',
    name: 'LFO',
    x: 40,
    y: 380,
    inputs: [],
    outputs: [
      { id: 'lfo1-cv-out', name: 'CV Out', type: 'cv' as const },
    ],
  },
];

const DEFAULT_CABLES = [
  { id: 'cable-1', fromPort: 'sub1-out-l', toPort: 'delay1-in-l', type: 'audio' as const },
  { id: 'cable-2', fromPort: 'delay1-out-l', toPort: 'mixer1-in1-l', type: 'audio' as const },
  { id: 'cable-3', fromPort: 'thor1-out-l', toPort: 'reverb1-in-l', type: 'audio' as const },
  { id: 'cable-4', fromPort: 'reverb1-out-l', toPort: 'mixer1-in2-l', type: 'audio' as const },
];

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('rack');
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(145);
  const [cables, setCables] = useState(DEFAULT_CABLES);

  const handleConnect = (fromPort: string, toPort: string, type: 'audio' | 'cv') => {
    setCables((prev) => [
      ...prev,
      { id: 'cable-' + Date.now(), fromPort, toPort, type },
    ]);
  };

  const handleDisconnect = (cableId: string) => {
    setCables((prev) => prev.filter((c) => c.id !== cableId));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo-section">
          <h1 className="logo">PSYREASON</h1>
          <span className="logo-sub">Psytrance Production Studio</span>
        </div>
        <nav className="view-switcher">
          <button className={viewMode === 'rack' ? 'active' : ''} onClick={() => setViewMode('rack')}>RACK</button>
          <button className={viewMode === 'cables' ? 'active' : ''} onClick={() => setViewMode('cables')}>CABLES</button>
          <button className={viewMode === 'sequencer' ? 'active' : ''} onClick={() => setViewMode('sequencer')}>SEQUENCER</button>
          <button className={viewMode === 'pianoroll' ? 'active' : ''} onClick={() => setViewMode('pianoroll')}>PIANO ROLL</button>
          <button className={viewMode === 'browser' ? 'active' : ''} onClick={() => setViewMode('browser')}>BROWSER</button>
        </nav>
      </header>

      <TransportBar
        isPlaying={isPlaying}
        onPlayToggle={() => setIsPlaying(!isPlaying)}
        bpm={bpm}
        onBpmChange={setBpm}
      />

      <main className="main-content">
        {viewMode === 'rack' && <RackView />}
        {viewMode === 'cables' && (
          <CableView
            devices={DEFAULT_CABLE_DEVICES}
            cables={cables}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        )}
        {viewMode === 'sequencer' && <SequencerView bpm={bpm} isPlaying={isPlaying} />}
        {viewMode === 'pianoroll' && (
          <PianoRollUI
            lengthBeats={16}
            onNoteAdd={(midi, startBeat, dur) => console.log('Note added:', midi, startBeat, dur)}
            onNoteRemove={(id) => console.log('Note removed:', id)}
          />
        )}
        {viewMode === 'browser' && <BrowserView />}
      </main>

      <footer className="footer">
        <span>PsyReason v0.3.0 | Built from 15 PSY repos | 1,300+ KB of code</span>
        <span>{bpm} BPM | 4/4 | Psytrance | {cables.length} cables</span>
      </footer>
    </div>
  );
}
