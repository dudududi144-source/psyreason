import { useState } from 'react';

interface SequencerViewProps {
  bpm: number;
  isPlaying: boolean;
}

const TRACKS = ['KICK', 'SNARE', 'HATS', 'BASS', 'LEAD', 'ARP', 'PAD', 'FX'];
const STEPS = 16;

export default function SequencerView({ bpm, isPlaying }: SequencerViewProps) {
  const [patterns, setPatterns] = useState<boolean[][]>(() =>
    TRACKS.map(() => Array(STEPS).fill(false))
  );
  const [currentStep, setCurrentStep] = useState(0);

  const toggleStep = (trackIndex: number, stepIndex: number) => {
    setPatterns((prev) => {
      const newPatterns = prev.map((track) => [...track]);
      newPatterns[trackIndex][stepIndex] = !newPatterns[trackIndex][stepIndex];
      return newPatterns;
    });
  };

  return (
    <div className="sequencer-view">
      <div className="sequencer-header">
        <h2>PATTERN SEQUENCER</h2>
        <span>{bpm} BPM | 16 Steps</span>
      </div>
      <div className="track-list">
        {TRACKS.map((trackName, trackIndex) => (
          <div key={trackName} className="track-row">
            <span className="track-name">{trackName}</span>
            <div className="pattern-grid">
              {patterns[trackIndex].map((active, stepIndex) => (
                <div
                  key={stepIndex}
                  className={`pattern-cell ${active ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                  onClick={() => toggleStep(trackIndex, stepIndex)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
