import { useState, useEffect, useRef, useCallback } from 'react';
import { engine, DEVICE_META, DeviceId, TargetId } from './audio/engine';

type View = 'rack' | 'cables' | 'sequencer' | 'pianoroll' | 'browser';

function Knob({ label, value, min, max, onChange, color }: any) {
  const [drag, setDrag] = useState(false);
  const startY = useRef(0); const startV = useRef(0);
  const norm = (value - min) / (max - min);
  const rot = -135 + norm * 270;
  return (
    <div className="knob-wrap">
      <div className="knob2" style={{ borderColor: drag ? color : '#2a2a3a' }}
        onMouseDown={(e) => { e.preventDefault(); setDrag(true); startY.current = e.clientY; startV.current = value; }}
        onMouseMove={(e) => { if (!drag) return; const d = (startY.current - e.clientY) * 0.006 * (max - min); onChange(Math.max(min, Math.min(max, startV.current + d))); }}
        onMouseUp={() => setDrag(false)} onMouseLeave={() => setDrag(false)}>
        <div className="knob2-ind" style={{ transform: 'translateX(-50%) rotate(' + rot + 'deg)', background: color }} />
      </div>
      <div className="knob2-label">{label}</div>
      <div className="knob2-val" style={{ color }}>{value < 10 ? value.toFixed(2) : Math.round(value)}</div>
    </div>
  );
}

function Meter() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => { const lv = engine.getLevels(); if (ref.current) ref.current.style.width = Math.round(Math.min(1, lv.l) * 100) + '%'; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="meter2"><span>L</span><div className="meter2-track"><div className="meter2-fill" ref={ref} /></div><span>R</span></div>;
}

// ============ RACK VIEW ============
function RackView() {
  const [levels, setLevels] = useState<Record<string, number>>({ 'thor-bass': 0.9, 'thor-lead': 0.9, europa: 0.6, malstrom: 0.7, kong: 0.9 });
  const [cut, setCut] = useState(6000);
  const [res, setRes] = useState(4);
  return (
    <div className="view3">
      <div className="rackgrid3">
        {DEVICE_META.map((d) => (
          <div key={d.id} className="dev3" style={{ borderColor: d.color + '66' }}>
            <div className="dev3-head" style={{ color: d.color }}><b>{d.name}</b><span>{d.type}</span></div>
            <div className="dev3-body">
              <Knob label="LEVEL" value={levels[d.id]} min={0} max={1} color={d.color}
                onChange={(v: number) => { setLevels((p) => ({ ...p, [d.id]: v })); engine.setDeviceLevel(d.id, v); }} />
              {d.id === 'thor-lead' && (<>
                <Knob label="CUTOFF" value={cut} min={100} max={12000} color="#00ff88" onChange={(v: number) => { setCut(v); engine.setCutoff(v); }} />
                <Knob label="RESO" value={res} min={0} max={20} color="#ff6600" onChange={(v: number) => { setRes(v); engine.setResonance(v); }} />
              </>)}
            </div>
            <button className="test2" style={{ borderColor: d.color, color: d.color }} onClick={() => engine.testDevice(d.id)}>TEST</button>
          </div>
        ))}
        <div className="dev3" style={{ borderColor: '#aa66ff66' }}>
          <div className="dev3-head" style={{ color: '#aa66ff' }}><b>FX RACK</b><span>RV-7 / DDL-1 / PHASER</span></div>
          <div className="dev3-body">
            <Knob label="DLY TIME" value={0.31} min={0.05} max={0.9} color="#00aaff" onChange={(v: number) => engine.setDelayTime(v)} />
            <Knob label="RVB SIZE" value={0.7} min={0.1} max={1} color="#aa66ff" onChange={(v: number) => engine.setReverbSize(v)} />
          </div>
          <div className="dev3-note">devices/effects run live per-sample</div>
        </div>
      </div>
    </div>
  );
}

// ============ CABLES VIEW ============
const TARGETS: { id: TargetId; name: string; color: string }[] = [
  { id: 'master', name: 'MIXER / MASTER', color: '#00ff88' },
  { id: 'phaser', name: 'PHASER', color: '#ff66cc' },
  { id: 'delay', name: 'DDL-1 DELAY', color: '#00aaff' },
  { id: 'reverb', name: 'RV-7 REVERB', color: '#aa66ff' },
];
function CablesView() {
  const [, force] = useState(0);
  const [pending, setPending] = useState<DeviceId | null>(null);
  return (
    <div className="view3">
      <div className="cables3-hint">{pending ? 'Now click a destination (right side) to patch cable' : 'Click a device output (left), then a destination (right). Cables really rewire the audio graph.'}</div>
      <div className="cables3">
        <div className="cables3-col">
          {DEVICE_META.map((d) => (
            <div key={d.id} className={'port3' + (pending === d.id ? ' sel' : '')} style={{ borderColor: d.color, color: d.color }}
              onClick={() => setPending(pending === d.id ? null : d.id)}>
              {d.name} OUT
            </div>
          ))}
        </div>
        <div className="cables3-mid">
          {engine.cables.map((c) => {
            const dev = DEVICE_META.find((d) => d.id === c.from);
            const tgt = TARGETS.find((t) => t.id === c.to);
            return (
              <div key={c.id} className="cable3" style={{ borderColor: tgt!.color }}>
                <span style={{ color: dev!.color }}>{dev!.name}</span> → <span style={{ color: tgt!.color }}>{tgt!.name}</span>
                <button onClick={() => { engine.disconnect(c.id); force((x) => x + 1); }}>✕</button>
              </div>
            );
          })}
        </div>
        <div className="cables3-col">
          {TARGETS.map((t) => (
            <div key={t.id} className="port3" style={{ borderColor: t.color, color: t.color }}
              onClick={() => { if (pending) { engine.connect(pending, t.id); setPending(null); force((x) => x + 1); } }}>
              {t.name} IN
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ SEQUENCER VIEW ============
function SeqRow({ name, color, steps, current, onToggle }: any) {
  return (
    <div className="seq-row">
      <div className="seq-name" style={{ color, borderColor: color }}>{name}</div>
      <div className="seq-cells">
        {steps.map((s: any, i: number) => {
          const active = s === true || (typeof s === 'number' && s !== null) || (Array.isArray(s) && s.length > 0);
          return <div key={i} className={'seq-cell' + (active ? ' on' : '') + (current === i ? ' now' : '') + (i % 4 === 0 ? ' beat' : '')}
            style={active ? { background: color, borderColor: color } : undefined} onClick={() => onToggle(i)} />;
        })}
      </div>
    </div>
  );
}
function SequencerView({ step }: { step: number }) {
  const [, force] = useState(0);
  const p = engine.pattern;
  const toggle = (track: string, i: number) => {
    const pp = p as any;
    if (track === 'lead') pp.lead[i] = pp.lead[i] === null ? 69 : null;
    else if (track === 'pad') pp.pad[i] = pp.pad[i] === null ? [57, 60, 64] : null;
    else pp[track][i] = !pp[track][i];
    force((x) => x + 1);
  };
  return (
    <div className="view3">
      <SeqRow name="KICK" color="#ff4444" steps={p.kick} current={step} onToggle={(i: number) => toggle('kick', i)} />
      <SeqRow name="BASS" color="#00ff88" steps={p.bass} current={step} onToggle={(i: number) => toggle('bass', i)} />
      <SeqRow name="HAT" color="#ffcc00" steps={p.hat} current={step} onToggle={(i: number) => toggle('hat', i)} />
      <SeqRow name="OPEN" color="#ff8800" steps={p.openhat} current={step} onToggle={(i: number) => toggle('openhat', i)} />
      <SeqRow name="LEAD" color="#00aaff" steps={p.lead} current={step} onToggle={(i: number) => toggle('lead', i)} />
      <SeqRow name="PAD" color="#aa66ff" steps={p.pad} current={step} onToggle={(i: number) => toggle('pad', i)} />
      <div className="hint2">KICK/HAT = Kong • BASS/LEAD = Thor • PAD = Europa • routes follow CABLES view</div>
    </div>
  );
}

// ============ PIANO ROLL VIEW ============
function PianoRollView() {
  const [, force] = useState(0);
  const rows = [72, 70, 69, 68, 65, 64, 62, 60];
  const names = ['C5', 'A#4', 'A4', 'G#4', 'F4', 'E4', 'D4', 'C4'];
  const toggle = (midi: number, stepI: number) => {
    const lead = engine.pattern.lead;
    if (lead[stepI] === midi) lead[stepI] = null;
    else lead[stepI] = midi;
    force((x) => x + 1);
  };
  return (
    <div className="view3">
      <div className="hint2" style={{ marginBottom: 10 }}>PIANO ROLL — edits the LEAD track (Thor engine). Click cells.</div>
      {rows.map((midi, r) => (
        <div key={midi} className="pr-row">
          <div className="pr-name">{names[r]}</div>
          <div className="seq-cells">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className={'seq-cell' + (engine.pattern.lead[i] === midi ? ' on' : '') + (i % 4 === 0 ? ' beat' : '')}
                style={engine.pattern.lead[i] === midi ? { background: '#00aaff', borderColor: '#00aaff' } : undefined}
                onClick={() => toggle(midi, i)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ BROWSER VIEW ============
function BrowserView() {
  const [msg, setMsg] = useState('');
  const leads = engine.presetNames();
  return (
    <div className="view3">
      <div className="br3-section">
        <h4>THOR LEAD PRESETS (devices/thor)</h4>
        <div className="br3-list">
          {leads.map((n, i) => (
            <button key={n} className="br3-item" onClick={() => { engine.loadPreset('lead', i); setMsg('Loaded lead: ' + n); }}>{n}</button>
          ))}
        </div>
      </div>
      <div className="br3-section">
        <h4>THOR BASS PRESETS (devices/thor)</h4>
        <div className="br3-list">
          {leads.map((n, i) => (
            <button key={n} className="br3-item" onClick={() => { engine.loadPreset('bass', i); setMsg('Loaded bass: ' + n); }}>{n}</button>
          ))}
        </div>
      </div>
      <div className="br3-section">
        <h4>FX CHAINS (devices/effects)</h4>
        <div className="br3-list">
          <button className="br3-item" onClick={() => { engine.loadPreset('fx', 0); setMsg('Loaded: Tight 3/16'); }}>Tight 3/16</button>
          <button className="br3-item" onClick={() => { engine.loadPreset('fx', 1); setMsg('Loaded: Psy Space'); }}>Psy Space</button>
          <button className="br3-item" onClick={() => { engine.loadPreset('fx', 2); setMsg('Loaded: Phaser Push'); }}>Phaser Push</button>
        </div>
      </div>
      <div className="hint2">{msg}</div>
    </div>
  );
}

// ============ KEYBOARD ============
const KEYMAP: Record<string, number> = { a: 69, w: 70, s: 71, e: 72, d: 73, f: 74, t: 75, g: 76, h: 77, u: 78, j: 81 };
function Keyboard() {
  const [active, setActive] = useState<Set<number>>(new Set());
  const play = useCallback((m: number) => {
    engine.playNote(m);
    setActive((p) => new Set(p).add(m));
    window.setTimeout(() => setActive((p) => { const n = new Set(p); n.delete(m); return n; }), 200);
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.repeat) return; const m = KEYMAP[e.key.toLowerCase()]; if (m !== undefined) play(m); };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [play]);
  return (
    <div className="kb2">
      {[69, 71, 72, 74, 76, 77, 81].map((m, i) => (
        <div key={m} className={'kb2-key' + (active.has(m) ? ' on' : '')} onMouseDown={() => play(m)}>
          <span>{['A', 'S', 'D', 'F', 'G', 'H', 'J'][i]}</span>
        </div>
      ))}
    </div>
  );
}

// ============ APP ============
export default function App() {
  const [view, setView] = useState<View>('rack');
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(145);
  const [step, setStep] = useState(-1);
  useEffect(() => { engine.onStep = (s) => setStep(s); return () => { engine.onStep = null; }; }, []);
  const togglePlay = async () => { if (playing) { engine.stop(); setPlaying(false); } else { await engine.start(); setPlaying(true); } };

  return (
    <div className="app2">
      <header className="hd2">
        <div><h1 className="logo2">PSYREASON</h1><div className="sub2">FULL ARCHITECTURE BUILD — rack / cables / sequencer / piano roll / browser, all wired to devices/ code</div></div>
        <nav className="nav3">
          {(['rack', 'cables', 'sequencer', 'pianoroll', 'browser'] as View[]).map((v) => (
            <button key={v} className={'nav3-btn' + (view === v ? ' on' : '')} onClick={() => setView(v)}>{v.toUpperCase()}</button>
          ))}
        </nav>
      </header>

      <div className="transport2">
        <button className={'play2' + (playing ? ' on' : '')} onClick={togglePlay}>{playing ? '■ STOP' : '▶ PLAY'}</button>
        <div className="bpm2"><span>BPM</span><input type="number" value={bpm} min={60} max={200} onChange={(e) => { const v = Number(e.target.value); setBpm(v); engine.setBpm(v); }} /></div>
        <div className="stepread2"><span>STEP</span><div className="steps16">{Array.from({ length: 16 }).map((_, i) => <i key={i} className={step === i ? 'lit' : ''} />)}</div></div>
        <Meter />
      </div>

      <main className="main3">
        {view === 'rack' && <RackView />}
        {view === 'cables' && <CablesView />}
        {view === 'sequencer' && <SequencerView step={step} />}
        {view === 'pianoroll' && <PianoRollView />}
        {view === 'browser' && <BrowserView />}
      </main>

      <div className="kb-strip"><Keyboard /></div>
      <footer className="ft2">
        <span>PsyReason v3.0 — first architecture, fully wired: Thor / Europa / Malstrom / Kong + RV-7 / DDL-1 / Phaser</span>
        <span>{playing ? 'RUNNING' : 'IDLE'} • {bpm} BPM</span>
      </footer>
    </div>
  );
}
