import { useState, useEffect, useRef } from 'react';

interface SequencerViewProps {
  bpm: number;
  isPlaying: boolean;
}

const TRACKS = ['KICK', 'SNARE', 'HATS', 'BASS', 'LEAD', 'ARP', 'PAD', 'FX'];
const STEPS = 16;
const TRACK_COLORS = ['#ff4444', '#ff8844', '#ffcc00', '#00ff88', '#00aaff', '#aa66ff', '#ff66cc', '#888888'];

// Default psytrance pattern (four-on-floor kick + rolling bass)
const DEFAULT_PATTERN: boolean[][] = [
  // KICK: four on the floor
  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  // SNARE: none (psytrance uses kick)
  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  // HATS: off-beats
  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
  // BASS: rolling between kicks
  [false, true, true, true, false, true, true, true, false, true, true, true, false, true, true, true],
  // LEAD
  [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true],
  // ARP
  [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  // PAD
  [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  // FX
  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true],
];

export default function SequencerView({ bpm, isPlaying }: SequencerViewProps) {
  const [patterns, setPatterns] = useState<boolean[][]>(() => DEFAULT_PATTERN.map((row) => [...row]));
  const [currentStep, setCurrentStep] = useState(-1);
  const intervalRef = useRef<number | null>(null);

  // Advance step based on BPM (16 steps per 4 beats = 1 step per 16th note)
  useEffect(() => {
    if (isPlaying) {
      const stepDurationMs = (60000 / bpm) / 4; // 16th note duration
      intervalRef.current = window.setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % STEPS);
      }, stepDurationMs);
    } else {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentStep(-1);
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, bpm]);

  const toggleStep = (trackIndex: number, stepIndex: number) => {
    setPatterns((prev) => {
      const newPatterns = prev.map((track) => [...track]);
      newPatterns[trackIndex][stepIndex] = !newPatterns[trackIndex][stepIndex];
      return newPatterns;
    });
  };

  const clearTrack = (trackIndex: number) => {
    setPatterns((prev) => {
      const newPatterns = prev.map((track) => [...track]);
      newPatterns[trackIndex] = new Array(STEPS).fill(false);
      return newPatterns;
    });
  };

  const randomizeTrack = (trackIndex: number) => {
    setPatterns((prev) => {
      const newPatterns = prev.map((track) => [...track]);
      newPatterns[trackIndex] = Array.from({ length: STEPS }, () => Math.random() < 0.3);
      return newPatterns;
    });
  };

  return (
    <div className="sequencer-view">
      <div className="sequencer-header">
        <h2>PATTERN SEQUENCER</h2>
        <span className="seq-info">{bpm} BPM | 16 Steps | 1/16 grid</span>
      </div>
      <div className="track-list">
        {TRACKS.map((trackName, trackIndex) => (
          <div key={trackName} className="track-row">
            <div className="track-label" style={{ borderLeftColor: TRACK_COLORS[trackIndex] }}>
              <span className="track-name" style={{ color: TRACK_COLORS[trackIndex] }}>{trackName}</span>
              <div className="track-actions">
                <button className="mini-btn" onClick={() => randomizeTrack(trackIndex)} title="Randomize">R</button>
                <button className="mini-btn" onClick={() => clearTrack(trackIndex)} title="Clear">X</button>
              </div>
            </div>
            <div className="pattern-grid">
              {patterns[trackIndex].map((active, stepIndex) => (
                <div
                  key={stepIndex}
                  className={[
                    'pattern-cell',
                    active ? 'active' : '',
                    currentStep === stepIndex ? 'current' : '',
                    stepIndex % 4 === 0 ? 'beat-start' : '',
                  ].join(' ')}
                  style={active ? { background: TRACK_COLORS[trackIndex] } : undefined}
                  onClick={() => toggleStep(trackIndex, stepIndex)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="sequencer-footer">
        <span>Click cells to toggle | R = randomize | X = clear</span>
        <span>{patterns.reduce((sum, track) => sum + track.filter(Boolean).length, 0)} active steps</span>
      </div>
    </div>
  );
}
