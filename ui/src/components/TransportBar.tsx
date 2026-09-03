import { useState, useEffect } from 'react';

interface TransportBarProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

export default function TransportBar({ isPlaying, onPlayToggle, bpm, onBpmChange }: TransportBarProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(1);

  useEffect(() => {
    if (!isPlaying) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedTime(elapsed);
      const beatsPerSecond = bpm / 60;
      const totalBeats = elapsed * beatsPerSecond;
      setCurrentBeat(Math.floor(totalBeats % 4) + 1);
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + '.' + String(ms).padStart(2, '0');
  };

  return (
    <div className="transport-bar">
      <button className={isPlaying ? 'playing' : ''} onClick={onPlayToggle}>
        {isPlaying ? 'STOP' : 'PLAY'}
      </button>
      <div className="time-display">
        <span className="time-label">TIME</span>
        <span className="time-value">{formatTime(elapsedTime)}</span>
      </div>
      <div className="beat-display">
        <span className="time-label">BEAT</span>
        <div className="beat-indicators">
          {[1, 2, 3, 4].map((beat) => (
            <span key={beat} className={'beat-dot ' + (isPlaying && currentBeat === beat ? 'active' : '')} />
          ))}
        </div>
      </div>
      <div className="bpm-control">
        <span>BPM:</span>
        <input type="number" value={bpm} min={60} max={200} onChange={(e) => onBpmChange(Number(e.target.value))} />
      </div>
      <span className="time-signature">4/4</span>
    </div>
  );
}
