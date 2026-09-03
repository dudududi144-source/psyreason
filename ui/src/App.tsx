import { useState } from 'react';
import RackView from './components/RackView';
import SequencerView from './components/SequencerView';
import TransportBar from './components/TransportBar';

type ViewMode = 'rack' | 'cables' | 'sequencer';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('rack');
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(145);

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">PSYREASON</h1>
        <div className="view-switcher">
          <button className={viewMode === 'rack' ? 'active' : ''} onClick={() => setViewMode('rack')}>RACK</button>
          <button className={viewMode === 'cables' ? 'active' : ''} onClick={() => setViewMode('cables')}>CABLES</button>
          <button className={viewMode === 'sequencer' ? 'active' : ''} onClick={() => setViewMode('sequencer')}>SEQUENCER</button>
        </div>
      </header>

      <TransportBar isPlaying={isPlaying} onPlayToggle={() => setIsPlaying(!isPlaying)} bpm={bpm} onBpmChange={setBpm} />

      <main className="main-content">
        {viewMode === 'rack' && <RackView />}
        {viewMode === 'cables' && <div className="cables-view">Cable View (Coming Soon)</div>}
        {viewMode === 'sequencer' && <SequencerView bpm={bpm} isPlaying={isPlaying} />}
      </main>

      <footer className="footer">
        <span>PsyReason v0.1.0 - Psytrance Production Studio</span>
        <span>145 BPM | 4/4 | Psytrance</span>
      </footer>
    </div>
  );
}
