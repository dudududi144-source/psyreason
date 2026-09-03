import { useState, useEffect, useRef, useCallback } from 'react';
import { engine } from './audio/engine';

// ============ KNOB (real, controls engine) ============
function Knob({ label, value, min, max, onChange, color }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; color: string;
}) {
  const [drag, setDrag] = useState(false);
  const startY = useRef(0);
  const startV = useRef(0);
  const norm = (value - min) / (max - min);
  const rot = -135 + norm * 270;
  return (
    <div className="knob-wrap">
      <div
        className="knob2"
        style={{ borderColor: drag ? color : '#2a2a3a' }}
        onMouseDown={(e) => { e.preventDefault(); setDrag(true); startY.current = e.clientY; startV.current = value; }}
        onMouseMove={(e) => {
          if (!drag) return;
          const d = (startY.current - e.clientY) * 0.006 * (max - min);
          onChange(Math.max(min, Math.min(max, startV.current + d)));
        }}
        onMouseUp={() => setDrag(false)}
        onMouseLeave={() => setDrag(false)}
      >
        <div className="knob2-ind" style={{ transform: 'translateX(-50%) rotate(' + rot + 'deg)', background: color }} />
      </div>
      <div className="knob2-label">{label}</div>
      <div className="knob2-val" style={{ color }}>{value < 100 ? value.toFixed(0) : Math.round(value)}</div>
    </div>
  );
}

// ============ METER (real, from analyser) ============
function Meter() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const lv = engine.getLevels();
      if (ref.current) ref.current.style.width = Math.round(lv.l * 100) + '%';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="meter2">
      <span>L</span>
      <div className="meter2-track"><div className="meter2-fill" ref={ref} /></div>
      <span>R</span>
    </div>
  );
}

// ============ SEQUENCER ROW ============
function SeqRow({ name, color, steps, current, onToggle }: {
  name: string; color: string; steps: (boolean | number | null | number[])[];
  current: number; onToggle: (i: number) => void;
}) {
  return (
    <div className="seq-row">
      <div className="seq-name" style={{ color, borderColor: color }}>{name}</div>
      <div className="seq-cells">
        {steps.map((s, i) => {
          const active = s === true || (typeof s === 'number' && s !== null) || (Array.isArray(s) && s.length > 0);
          return (
            <div
              key={i}
              className={'seq-cell' + (active ? ' on' : '') + (current === i ? ' now' : '') + (i % 4 === 0 ? ' beat' : '')}
              style={active ? { background: color, borderColor: color } : undefined}
              onClick={() => onToggle(i)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============ KEYBOARD (plays real notes) ============
const KEYMAP: Record<string, number> = { a: 69, w: 70, s: 71, e: 72, d: 73, f: 74, t: 75, g: 76, h: 77, u: 78, j: 81 };
function Keyboard() {
  const [active, setActive] = useState<Set<number>>(new Set());
  const play = useCallback((midi: number) => {
    engine.playNote(midi);
    setActive((p) => new Set(p).add(midi));
    window.setTimeout(() => setActive((p) => { const n = new Set(p); n.delete(midi); return n; }), 200);
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const m = KEYMAP[e.key.toLowerCase()];
      if (m !== undefined) play(m);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [play]);
  const whites = [69, 71, 72, 74, 76, 77, 81];
  const names = ['A', 'S', 'D', 'F', 'G', 'H', 'J'];
  return (
    <div className="kb2">
      {whites.map((m, i) => (
        <div key={m} className={'kb2-key' + (active.has(m) ? ' on' : '')} onMouseDown={() => play(m)}>
          <span>{names[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(145);
  const [step, setStep] = useState(-1);
  const [cutoff, setCutoff] = useState(6000);
  const [reso, setReso] = useState(0.3);
  const [delayMix, setDelayMix] = useState(0.3);
  const [reverbMix, setReverbMix] = useState(0.25);
  const [bassLvl, setBassLvl] = useState(85);
  const [, force] = useState(0);

  useEffect(() => {
    engine.onStep = (s) => setStep(s);
    return () => { engine.onStep = null; };
  }, []);

  const togglePlay = async () => {
    if (playing) { engine.stop(); setPlaying(false); }
    else { await engine.start(); setPlaying(true); }
  };

  const toggle = (track: string, i: number) => {
    const p = engine.pattern as any;
    if (track === 'lead') {
      p.lead[i] = p.lead[i] === null ? 69 : null;
    } else if (track === 'pad') {
      p.pad[i] = p.pad[i] === null ? [57, 60, 64] : null;
    } else {
      p[track][i] = !p[track][i];
    }
    force((x) => x + 1);
  };

  const p = engine.pattern;

  return (
    <div className="app2">
      <header className="hd2">
        <div>
          <h1 className="logo2">PSYREASON</h1>
          <div className="sub2">REAL-TIME PSYTRANCE ENGINE — Web Audio</div>
        </div>
        <div className="hd2-right">
          <span className="badge2">145 BPM DEFAULT</span>
          <span className="badge2">A-MINOR / PHRYGIAN</span>
        </div>
      </header>

      <div className="transport2">
        <button className={'play2' + (playing ? ' on' : '')} onClick={togglePlay}>
          {playing ? '■ STOP' : '▶ PLAY'}
        </button>
        <div className="bpm2">
          <span>BPM</span>
          <input type="number" value={bpm} min={60} max={200}
            onChange={(e) => { const v = Number(e.target.value); setBpm(v); engine.setBpm(v); }} />
        </div>
        <div className="stepread2">
          <span>STEP</span>
          <div className="steps16">
            {Array.from({ length: 16 }).map((_, i) => (
              <i key={i} className={step === i ? 'lit' : ''} />
            ))}
          </div>
        </div>
        <Meter />
      </div>

      <div className="main2">
        <section className="panel2">
          <h3>SEQUENCER — click cells to edit, hear it live</h3>
          <SeqRow name="KICK" color="#ff4444" steps={p.kick} current={step} onToggle={(i) => toggle('kick', i)} />
          <SeqRow name="BASS" color="#00ff88" steps={p.bass} current={step} onToggle={(i) => toggle('bass', i)} />
          <SeqRow name="HAT" color="#ffcc00" steps={p.hat} current={step} onToggle={(i) => toggle('hat', i)} />
          <SeqRow name="OPEN" color="#ff8800" steps={p.openhat} current={step} onToggle={(i) => toggle('openhat', i)} />
          <SeqRow name="LEAD" color="#00aaff" steps={p.lead} current={step} onToggle={(i) => toggle('lead', i)} />
          <SeqRow name="PAD" color="#aa66ff" steps={p.pad} current={step} onToggle={(i) => toggle('pad', i)} />
          <div className="hint2">Rolling bass between kicks • four-on-floor • offbeat hats • phrygian lead</div>
        </section>

        <section className="panel2">
          <h3>SOUND CONTROL — real parameters</h3>
          <div className="knobs2">
            <Knob label="CUTOFF" value={cutoff} min={100} max={12000} color="#00ff88"
              onChange={(v) => { setCutoff(v); engine.setCutoff(v); }} />
            <Knob label="RESO" value={reso} min={0} max={20} color="#ff6600"
              onChange={(v) => { setReso(v); engine.setResonance(v); }} />
            <Knob label="DELAY" value={delayMix} min={0} max={1} color="#00aaff"
              onChange={(v) => { setDelayMix(v); engine.setDelayMix(v); }} />
            <Knob label="REVERB" value={reverbMix} min={0} max={1} color="#aa66ff"
              onChange={(v) => { setReverbMix(v); engine.setReverbMix(v); }} />
            <Knob label="BASS" value={bassLvl} min={0} max={100} color="#ffcc00"
              onChange={(v) => { setBassLvl(v); engine.setBassLevel(v / 100); }} />
          </div>
          <h3 style={{ marginTop: 18 }}>PLAY LEAD — keys A S D F G H J or click</h3>
          <Keyboard />
        </section>
      </div>

      <footer className="ft2">
        <span>PsyReason v1.0 — real Web Audio synthesis: PolyBLEP-class saws, sub bass, FM kick, convolver reverb, feedback delay</span>
        <span>{playing ? 'RUNNING' : 'IDLE'} • {bpm} BPM</span>
      </footer>
    </div>
  );
}
