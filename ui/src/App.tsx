import { useState, useEffect, useRef, useCallback } from 'react';
import { engine, TRACKS, ARRANGEMENT, TOTAL_BARS, sectionAtBar, TrackId } from './audio/engine';
import { STYLES } from './audio/generator';

type View = 'arrange' | 'mixer' | 'pianoroll' | 'rack';

// ---------- shared ----------
function useMeter(id: TrackId | 'master', playing: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => { if (ref.current) ref.current.style.height = Math.round(Math.min(1, engine.level(id)) * 100) + '%'; raf = requestAnimationFrame(loop); };
    if (playing) raf = requestAnimationFrame(loop);
    else if (ref.current) ref.current.style.height = '0%';
    return () => cancelAnimationFrame(raf);
  }, [id, playing]);
  return ref;
}

function Knob({ label, value, min, max, onChange, color }: any) {
  const [drag, setDrag] = useState(false);
  const sy = useRef(0); const sv = useRef(0);
  const rot = -135 + ((value - min) / (max - min)) * 270;
  return (
    <div className="k-wrap">
      <div className="k-body" style={{ borderColor: drag ? color : '#2a2a3a' }}
        onMouseDown={(e) => { e.preventDefault(); setDrag(true); sy.current = e.clientY; sv.current = value; }}
        onMouseMove={(e) => { if (!drag) return; onChange(Math.max(min, Math.min(max, sv.current + (sy.current - e.clientY) * 0.006 * (max - min)))); }}
        onMouseUp={() => setDrag(false)} onMouseLeave={() => setDrag(false)}>
        <div className="k-ind" style={{ transform: 'translateX(-50%) rotate(' + rot + 'deg)', background: color }} />
      </div>
      <div className="k-label">{label}</div>
      <div className="k-val" style={{ color }}>{value < 10 ? value.toFixed(2) : Math.round(value)}</div>
    </div>
  );
}

// ---------- ARRANGE ----------
function Arrange({ pos, playing }: { pos: { bar: number; step: number }; playing: boolean }) { void playing;
  const [, force] = useState(0);
  const s = engine.song;
  const rows: { id: TrackId; cells: (boolean | number | null)[] }[] = [
    { id: 'kick', cells: s.kick.map((v) => (v ? 1 : 0)) },
    { id: 'bass', cells: s.bass.map((v) => (v.on ? 1 : 0)) },
    { id: 'hats', cells: s.hats.map((v) => (v ? 1 : 0)) },
    { id: 'open', cells: s.open.map((v) => (v ? 1 : 0)) },
    { id: 'lead', cells: s.lead.map((v) => (v !== null ? 1 : 0)) },
    { id: 'pad', cells: Array(16).fill(0).map((_, i) => (i === 0 ? 1 : 0)) },
  ];
  const toggle = (id: TrackId, i: number) => {
    if (id === 'kick') s.kick[i] = !s.kick[i];
    if (id === 'bass') s.bass[i].on = !s.bass[i].on;
    if (id === 'hats') s.hats[i] = !s.hats[i];
    if (id === 'open') s.open[i] = !s.open[i];
    if (id === 'lead') s.lead[i] = s.lead[i] === null ? 69 : null;
    if (id === 'pad') return;
    force((x) => x + 1);
  };
  let barAcc = 0;
  return (
    <div className="view">
      <div className="timeline">
        {engine.arrangement.map((sec, i) => {
          const TB = engine.totalBars(); const left = (barAcc / TB) * 100; barAcc += sec.bars;
          const width = (sec.bars / engine.totalBars()) * 100;
          const active = pos.bar >= 0 && sectionAtBar(pos.bar).index === i;
          return (
            <div key={sec.name} className={'tl-sec' + (active ? ' on' : '')} style={{ left: left + '%', width: width + '%' }}>
              <span>{sec.name}</span><em>{sec.bars} bars</em>
            </div>
          );
        })}
        {pos.bar >= 0 && <div className="tl-play" style={{ left: ((pos.bar + (pos.step + 1) / 16) / engine.totalBars()) * 100 + '%' }} />}
      </div>
      <div className="lanes">
        {rows.map((r) => {
          const meta = TRACKS.find((t) => t.id === r.id)!;
          return (
            <div key={r.id} className="lane">
              <div className="lane-head" style={{ color: meta.color, borderColor: meta.color }}>
                {meta.name}
                <span className="lane-btns"><button className="prev-btn" title="regenerate" onClick={() => { engine.regenTrack(r.id); force((x) => x + 1); }}>⟲</button><button className="prev-btn" onClick={() => engine.preview(r.id)}>▶</button></span>
              </div>
              <div className="lane-cells">
                {r.cells.map((c, i) => (
                  <div key={i}
                    className={'cell' + (c ? ' on' : '') + (pos.step === i && playing ? ' now' : '') + (i % 4 === 0 ? ' beat' : '')}
                    style={c ? { background: meta.color, borderColor: meta.color } : undefined}
                    onClick={() => toggle(r.id, i)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hint">ARRANGEMENT plays INTRO → BUILD → DROP → BREAK → DROP 2 on loop. Click cells to edit; ▶ previews a track through the mixer.</div>
      <div className="mixer compact">
        {[...TRACKS.map((t) => t.id), 'master'].map((id) => <Strip key={id} id={id as any} playing={playing} />)}
      </div>
    </div>
  );
}

// ---------- MIXER ----------
// Strip is a real component (hooks at top level - no crash)
function Strip({ id, playing }: { id: TrackId | 'master'; playing: boolean }) {
  const [, force] = useState(0);
  const meta = id === 'master' ? { name: 'MASTER', color: '#ffffff' } : TRACKS.find((t) => t.id === id)!;
  const ch = id === 'master' ? null : engine.channels[id];
  const ref = useMeter(id, playing);
  return (
    <div className="strip" style={{ borderColor: (meta as any).color + '44' }}>
      <div className="strip-name" style={{ color: (meta as any).color }}>{(meta as any).name}</div>
      <div className="strip-meter"><div className="strip-fill" ref={ref} /></div>
      {ch && (
        <>
          <input className="fader" type="range" min={0} max={1} step={0.01} defaultValue={0.9}
            onChange={(e) => engine.setFader(id as TrackId, Number(e.target.value))} />
          <div className="strip-btns">
            <button className={'m-btn' + (ch.mute ? ' on-m' : '')} onClick={() => { engine.setMute(id as TrackId, !ch.mute); force((x) => x + 1); }}>M</button>
            <button className={'m-btn' + (ch.solo ? ' on-s' : '')} onClick={() => { engine.setSolo(id as TrackId, !ch.solo); force((x) => x + 1); }}>S</button>
          </div>
          <div className="strip-sends">
            <label>DLY<input type="range" min={0} max={1} step={0.01} defaultValue={id === 'lead' ? 0.35 : 0} onChange={(e) => engine.setSend(id as TrackId, 'd', Number(e.target.value))} /></label>
            <label>RVB<input type="range" min={0} max={1} step={0.01} defaultValue={id === 'pad' ? 0.5 : id === 'lead' ? 0.2 : 0} onChange={(e) => engine.setSend(id as TrackId, 'r', Number(e.target.value))} /></label>
          </div>
        </>
      )}
      {!ch && <div className="strip-note">EQ → COMP → LIMIT</div>}
    </div>
  );
}

function Mixer({ playing }: { playing: boolean }) {
  const strips: (TrackId | 'master')[] = [...TRACKS.map((t) => t.id), 'master'];
  return (
    <div className="view mixer">
      {strips.map((id) => <Strip key={id} id={id} playing={playing} />)}
    </div>
  );
}

// ---------- PIANO ROLL ----------
const SCALE_ROWS = [81, 80, 77, 76, 74, 72, 71, 69, 68, 65, 64, 62, 60, 57];
function PianoRoll({ pos, playing }: { pos: { bar: number; step: number }; playing: boolean }) {
  const [, force] = useState(0);
  const lead = engine.song.lead;
  return (
    <div className="view">
      <div className="hint" style={{ marginBottom: 8 }}>PIANO ROLL — LEAD track (Thor-class detuned saws through filter + sends). Click to place/remove notes.</div>
      <div className="pr">
        {SCALE_ROWS.map((m) => (
          <div key={m} className="pr-row">
            <div className="pr-key">{m % 12 === 0 ? 'C' : m % 12 === 4 ? 'E' : m % 12 === 7 ? 'G' : m % 12 === 9 ? 'A' : m % 12 === 5 ? 'F' : '·'}{Math.floor(m / 12 - 1)}</div>
            <div className="lane-cells">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i}
                  className={'cell' + (lead[i] === m ? ' on' : '') + (pos.step === i && playing ? ' now' : '') + (i % 4 === 0 ? ' beat' : '')}
                  style={lead[i] === m ? { background: '#00aaff', borderColor: '#00aaff' } : undefined}
                  onClick={() => { lead[i] = lead[i] === m ? null : m; force((x) => x + 1); }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- RACK ----------
function Rack() {
  const [sel, setSel] = useState<TrackId>('bass');
  const [, force] = useState(0);
  const p = engine.params[sel];
  const meta = TRACKS.find((t) => t.id === sel)!;
  const knobs: { key: string; label: string; min: number; max: number }[] =
    sel === 'bass' ? [
      { key: 'cutoff', label: 'CUTOFF', min: 100, max: 4000 }, { key: 'res', label: 'RESO', min: 0, max: 20 },
      { key: 'drive', label: 'DRIVE', min: 0, max: 1 }, { key: 'decay', label: 'DECAY', min: 0.05, max: 0.4 },
      { key: 'sidechain', label: 'SIDECHN', min: 0, max: 1 }]
    : sel === 'lead' ? [
      { key: 'cutoff', label: 'CUTOFF', min: 200, max: 9000 }, { key: 'res', label: 'RESO', min: 0, max: 15 },
      { key: 'decay', label: 'DECAY', min: 0.1, max: 0.8 }, { key: 'dSend', label: 'DELAY', min: 0, max: 1 }, { key: 'rSend', label: 'REVERB', min: 0, max: 1 }]
    : sel === 'pad' ? [
      { key: 'cutoff', label: 'CUTOFF', min: 200, max: 5000 }, { key: 'rSend', label: 'REVERB', min: 0, max: 1 }]
    : sel === 'kick' ? [
      { key: 'decay', label: 'DECAY', min: 0.1, max: 0.6 }, { key: 'punch', label: 'PUNCH', min: 0, max: 1 }]
    : [{ key: 'tone', label: 'TONE', min: 3000, max: 12000 }];
  return (
    <div className="view">
      <div className="chain">
        <span className="chain-node" style={{ borderColor: '#ff8800', color: '#ff8800' }}>KONG</span><i>→</i>
        <span className="chain-node" style={{ borderColor: '#ff2bd6', color: '#ff2bd6' }}>THOR·BASS</span><i>→(sidechain)</i>
        <span className="chain-node" style={{ borderColor: '#ff2bd6', color: '#ff2bd6' }}>THOR·LEAD</span><i>→</i>
        <span className="chain-node" style={{ borderColor: '#00aaff', color: '#00aaff' }}>DDL-1</span><i>→</i>
        <span className="chain-node" style={{ borderColor: '#00ffcc', color: '#00ffcc' }}>EUROPA</span><i>→</i>
        <span className="chain-node" style={{ borderColor: '#aa66ff', color: '#aa66ff' }}>RV-7</span><i>→</i>
        <span className="chain-node" style={{ borderColor: '#ffffff', color: '#ffffff' }}>MIXER → EQ → COMP → LIMIT</span>
      </div>
      <div className="rack-tabs">
        {TRACKS.map((t) => (
          <button key={t.id} className={'rack-tab' + (sel === t.id ? ' on' : '')} style={sel === t.id ? { borderColor: t.color, color: t.color } : undefined} onClick={() => setSel(t.id)}>{t.name}</button>
        ))}
      </div>
      <div className="rack-panel" style={{ borderColor: meta.color + '55' }}>
        <div className="rack-title" style={{ color: meta.color }}>{meta.name} — SOUND ENGINE</div>
        <div className="rack-knobs">
          {knobs.map((k) => (
            <Knob key={k.key} label={k.label} value={p[k.key]} min={k.min} max={k.max} color={meta.color}
              onChange={(v: number) => { engine.setParam(sel, k.key, v); force((x) => x + 1); }} />
          ))}
        </div>
        <button className="preview-big" style={{ borderColor: meta.color, color: meta.color }} onClick={() => engine.preview(sel)}>PREVIEW {meta.name}</button>
        <div className="hint">Parameters apply live to the scheduled voices. SIDECHN = kick ducks the bass (the psytrance pump).</div>
      </div>
    </div>
  );
}

// ---------- APP ----------
export default function App() {
  const [view, setView] = useState<View>('arrange');
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(145);
  const [pos, setPos] = useState({ bar: -1, step: -1 });
  const [, force] = useState(0);
  const [styleId, setStyleId] = useState('fullon');
  const mRef = useMeter('master', playing);
  useEffect(() => {
    engine.onTick = (bar, step) => setPos({ bar, step });
    engine.generateStyle('fullon', 1);
    setBpm(engine.bpm);
    force((x) => x + 1);
    return () => { engine.onTick = null; };
  }, []);
  const toggle = async () => { if (playing) { engine.stop(); setPlaying(false); } else { await engine.start(); setPlaying(true); } };
  const secName = pos.bar >= 0 ? sectionAtBar(pos.bar).section.name : '—';
  return (
    <div className="app">
      <header className="top">
        <div className="brand"><h1>PSYREASON</h1><span>WEB DAW — psytrance production system</span></div>
        <nav className="tabs">
          {(['arrange', 'mixer', 'pianoroll', 'rack'] as View[]).map((v) => (
            <button key={v} className={'tab' + (view === v ? ' on' : '')} onClick={() => setView(v)}>{v === 'pianoroll' ? 'PIANO ROLL' : v.toUpperCase()}</button>
          ))}
        </nav>
      </header>
      <div className="transport">
        <button className={'play' + (playing ? ' on' : '')} onClick={toggle}>{playing ? '■ STOP' : '▶ PLAY'}</button>
        <button className="gen" onClick={() => { engine.generateStyle(styleId, Math.floor(Math.random() * 999)); setBpm(engine.bpm); force((x) => x + 1); }} title="generate a new track in this style">⚄ GENERATE</button>
        <div className="t-block"><span>BPM</span><input type="number" value={bpm} min={90} max={200} onChange={(e) => { const v = Number(e.target.value); setBpm(v); engine.setBpm(v); }} /></div>
        <div className="t-block"><span>POS</span><b>{pos.bar >= 0 ? 'BAR ' + (pos.bar + 1) + ' . ' + (pos.step + 1) : '—'}</b></div>
        <div className="t-block"><span>SECTION</span><b className="sec">{secName}</b></div>
        <div className="t-meter"><span>MST</span><div className="t-meter-track"><div className="t-meter-fill" ref={mRef} /></div></div>
      </div>
      <div className="stylebar">
        <span className="sb-label">STYLE SESSIONS</span>
        {STYLES.map((st) => (
          <button key={st.id} className={'style-chip' + (styleId === st.id ? ' on' : '')}
            style={styleId === st.id ? { borderColor: st.color, color: st.color } : undefined}
            onClick={() => { setStyleId(st.id); engine.generateStyle(st.id, 1); setBpm(engine.bpm); force((x) => x + 1); }}>
            {st.name}
          </button>
        ))}
        <span className="style-desc">{(STYLES.find((s) => s.id === styleId) || STYLES[0]).desc}</span>
        <span className="sb-label">SESSION</span>
        {[1, 2, 3].map((v) => (
          <button key={v} className="var-btn" onClick={() => { engine.generateStyle(styleId, v); setBpm(engine.bpm); force((x) => x + 1); }}>S{v}</button>
        ))}
      </div>
      <main className="content">
        {view === 'arrange' && <Arrange pos={pos} playing={playing} />}
        {view === 'mixer' && <Mixer playing={playing} />}
        {view === 'pianoroll' && <PianoRoll pos={pos} playing={playing} />}
        {view === 'rack' && <Rack />}
      </main>
      <footer className="foot">
        <span>PsyReason v4 — one coherent engine: scheduler → voices → channel mixer → FX sends → master chain</span>
        <span>{playing ? 'RUNNING' : 'IDLE'} • {bpm} BPM • {engine.totalBars()}-bar arrangement • seed {engine.seed}</span>
      </footer>
    </div>
  );
}
