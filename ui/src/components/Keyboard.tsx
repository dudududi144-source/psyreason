import { useState, useEffect, useRef, useCallback } from 'react';

interface KeyboardProps {
  onNoteOn?: (midi: number, velocity: number) => void;
  onNoteOff?: (midi: number) => void;
  octave?: number;
  visibleOctaves?: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const KEY_MAP: Record<string, number> = {
  'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5,
  't': 6, 'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11,
  'k': 12, 'o': 13, 'l': 14, 'p': 15,
};

export default function Keyboard({ onNoteOn, onNoteOff, octave = 3, visibleOctaves = 2 }: KeyboardProps) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const startOctave = octave;
  const totalKeys = visibleOctaves * 12 + 1;
  const activeRef = useRef(activeNotes);
  activeRef.current = activeNotes;

  const triggerNote = useCallback((midiOffset: number) => {
    const midi = (startOctave * 12) + midiOffset;
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
    onNoteOn?.(midi, 100);
  }, [startOctave, onNoteOn]);

  const releaseNote = useCallback((midiOffset: number) => {
    const midi = (startOctave * 12) + midiOffset;
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
    onNoteOff?.(midi);
  }, [startOctave, onNoteOff]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (KEY_MAP[key] !== undefined) {
        triggerNote(KEY_MAP[key]);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (KEY_MAP[key] !== undefined) {
        releaseNote(KEY_MAP[key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerNote, releaseNote]);

  const isBlackKey = (noteIndex: number): boolean => {
    return [1, 3, 6, 8, 10].includes(noteIndex % 12);
  };

  return (
    <div className="keyboard-container">
      <div className="keyboard-header">
        <span className="keyboard-title">KEYBOARD</span>
        <span className="keyboard-hint">Use keys A W S E D F T G Y H U J K O L P</span>
      </div>
      <div className="keyboard-keys">
        {Array.from({ length: totalKeys }).map((_, i) => {
          const noteIndex = i % 12;
          const midi = (startOctave * 12) + i;
          const black = isBlackKey(i);
          const isActive = activeNotes.has(midi);
          const noteName = NOTE_NAMES[noteIndex] + (Math.floor(midi / 12) - 1);
          return (
            <div
              key={i}
              className={'piano-key ' + (black ? 'black' : 'white') + (isActive ? ' active' : '')}
              onMouseDown={() => triggerNote(i)}
              onMouseUp={() => releaseNote(i)}
              onMouseLeave={() => releaseNote(i)}
            >
              <span className="key-label">{black ? '' : noteName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
