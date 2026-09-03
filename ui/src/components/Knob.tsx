import { useState, useRef, useCallback } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  color?: string;
  onChange?: (value: number) => void;
}

export default function Knob({ label, value, min = 0, max = 1, color = '#00ff88', onChange }: KnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);
  const knobRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
  }, [value]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaY = startY.current - e.clientY;
    const sensitivity = 0.005;
    const newValue = Math.max(min, Math.min(max, startValue.current + deltaY * sensitivity));
    onChange?.(newValue);
  }, [isDragging, min, max, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const normalizedValue = (value - min) / (max - min);
  const rotation = -135 + normalizedValue * 270;

  return (
    <div className="knob-container">
      <div
        ref={knobRef}
        className="knob"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ borderColor: isDragging ? color : undefined }}
      >
        <div className="indicator" style={{ transform: 'translateX(-50%) rotate(' + rotation + 'deg)', background: color }} />
      </div>
      <span className="knob-label">{label}</span>
      <span className="knob-value" style={{ color: color }}>{value.toFixed(2)}</span>
    </div>
  );
}
