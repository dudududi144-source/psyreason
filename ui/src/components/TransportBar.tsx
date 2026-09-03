interface TransportBarProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

export default function TransportBar({ isPlaying, onPlayToggle, bpm, onBpmChange }: TransportBarProps) {
  return (
    <div className="transport-bar">
      <button className={isPlaying ? 'playing' : ''} onClick={onPlayToggle}>
        {isPlaying ? 'STOP' : 'PLAY'}
      </button>
      <div className="bpm-control">
        <span>BPM:</span>
        <input
          type="number"
          value={bpm}
          min={60}
          max={200}
          onChange={(e) => onBpmChange(Number(e.target.value))}
        />
      </div>
      <span className="time-signature">4/4</span>
    </div>
  );
}
