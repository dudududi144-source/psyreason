import { useState, useRef } from 'react';

interface PianoRollUIProps {
  lengthBeats?: number;
  onNoteAdd?: (midi: number, startBeat: number, durationBeats: number) => void;
  onNoteRemove?: (noteId: string) => void;
}

interface UINote {
  id: string;
  midi: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
}

const ROWS = 24; // 2 octaves visible
const LOWEST_MIDI = 48; // C3
const COLS_PER_BEAT = 4; // 16th grid

export default function PianoRollUI({ lengthBeats = 16, onNoteAdd, onNoteRemove }: PianoRollUIProps) {
  const [notes, setNotes] = useState<UINote[]>([]);
  const [selectedTool, setSelectedTool] = useState<'draw' | 'erase' | 'select'>('draw');
  const containerRef = useRef<HTMLDivElement>(null);

  const totalCols = lengthBeats * COLS_PER_BEAT;
  const cellWidth = 28;
  const cellHeight = 18;

  const handleCellClick = (row: number, col: number) => {
    const midi = LOWEST_MIDI + (ROWS - 1 - row);
    const startBeat = col / COLS_PER_BEAT;

    if (selectedTool === 'draw') {
      // Check if note already exists there
      const existing = notes.find(
        (n) => n.midi === midi && startBeat >= n.startBeat && startBeat < n.startBeat + n.durationBeats
      );
      if (existing) {
        if (selectedTool === 'draw') return; // clicking existing note does nothing in draw mode
      }
      const newNote: UINote = {
        id: 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        midi,
        startBeat,
        durationBeats: 0.25,
        velocity: 100,
      };
      setNotes((prev) => [...prev, newNote]);
      onNoteAdd?.(midi, startBeat, 0.25);
    } else if (selectedTool === 'erase') {
      const existing = notes.find(
        (n) => n.midi === midi && startBeat >= n.startBeat && startBeat < n.startBeat + n.durationBeats
      );
      if (existing) {
        setNotes((prev) => prev.filter((n) => n.id !== existing.id));
        onNoteRemove?.(existing.id);
      }
    }
  };

  const isNoteAt = (row: number, col: number): boolean => {
    const midi = LOWEST_MIDI + (ROWS - 1 - row);
    const beat = col / COLS_PER_BEAT;
    return notes.some(
      (n) => n.midi === midi && beat >= n.startBeat && beat < n.startBeat + n.durationBeats
    );
  };

  const isBlackKey = (midi: number): boolean => {
    const pc = midi % 12;
    return [1, 3, 6, 8, 10].includes(pc);
  };

  return (
    <div className="piano-roll-ui">
      <div className="piano-roll-toolbar">
        <button className={selectedTool === 'draw' ? 'active' : ''} onClick={() => setSelectedTool('draw')}>DRAW</button>
        <button className={selectedTool === 'erase' ? 'active' : ''} onClick={() => setSelectedTool('erase')}>ERASE</button>
        <button className={selectedTool === 'select' ? 'active' : ''} onClick={() => setSelectedTool('select')}>SELECT</button>
        <span className="info">{notes.length} notes | {lengthBeats} beats | 1/16 grid</span>
      </div>
      <div className="piano-roll-container" ref={containerRef}>
        <div className="piano-roll-grid">
          {/* Key labels */}
          <div className="key-labels">
            {Array.from({ length: ROWS }).map((_, row) => {
              const midi = LOWEST_MIDI + (ROWS - 1 - row);
              const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
              const name = names[midi % 12] + Math.floor(midi / 12 - 1);
              return (
                <div key={row} className={'key-label ' + (isBlackKey(midi) ? 'black' : 'white')}>
                  {name}
                </div>
              );
            })}
          </div>
          {/* Grid cells */}
          <div className="grid-rows">
            {Array.from({ length: ROWS }).map((_, row) => {
              const midi = LOWEST_MIDI + (ROWS - 1 - row);
              return (
                <div key={row} className="grid-row">
                  {Array.from({ length: totalCols }).map((_, col) => {
                    const active = isNoteAt(row, col);
                    const isBeatLine = col % COLS_PER_BEAT === 0;
                    const isBarLine = col % (COLS_PER_BEAT * 4) === 0;
                    return (
                      <div
                        key={col}
                        className={[
                          'grid-cell',
                          active ? 'active' : '',
                          isBlackKey(midi) ? 'black-row' : '',
                          isBarLine ? 'bar-line' : isBeatLine ? 'beat-line' : '',
                        ].join(' ')}
                        style={{ width: cellWidth, height: cellHeight }}
                        onClick={() => handleCellClick(row, col)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
