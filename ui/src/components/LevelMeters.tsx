import { useState, useEffect } from 'react';

interface LevelMetersProps {
  isPlaying: boolean;
  bpm: number;
}

export default function LevelMeters({ isPlaying, bpm }: LevelMetersProps) {
  const [levels, setLevels] = useState<{ l: number; r: number }>({ l: 0, r: 0 });

  useEffect(() => {
    if (!isPlaying) {
      setLevels({ l: 0, r: 0 });
      return;
    }

    const interval = setInterval(() => {
      const beatPhase = (Date.now() / (60000 / bpm)) % 1;
      const kickPulse = Math.max(0, 1 - beatPhase * 4);
      
      setLevels({
        l: Math.min(1, kickPulse * 0.8 + Math.random() * 0.2),
        r: Math.min(1, kickPulse * 0.75 + Math.random() * 0.25),
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  const getLevelColor = (level: number): string => {
    if (level < 0.6) return 'var(--accent)';
    if (level < 0.85) return '#ffcc00';
    return 'var(--danger)';
  };

  return (
    <div className="level-meters">
      <span className="meter-label">L</span>
      <div className="meter-track">
        <div
          className="meter-fill"
          style={{
            width: (levels.l * 100) + '%',
            background: getLevelColor(levels.l),
          }}
        />
      </div>
      <div className="meter-track">
        <div
          className="meter-fill"
          style={{
            width: (levels.r * 100) + '%',
            background: getLevelColor(levels.r),
          }}
        />
      </div>
      <span className="meter-label">R</span>
    </div>
  );
}
