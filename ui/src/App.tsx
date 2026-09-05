import React, { useState, useEffect, useRef, useCallback } from 'react';
import { engine, TRACKS, ARRANGEMENT, TOTAL_BARS, sectionAtBar, TrackId } from './audio/engine';
import { STYLES, SESSIONS_PER_SUB, subById, libraryStats, FAMILIES, composeForm } from './audio/generator';
import { SOUND_LIB, soundCount } from './audio/sounds';

type View = 'arrange' | 'mixer' | 'pianoroll' | 'rack' | 'library' | 'sounds' | 'form';

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

function Knob({ label, value, min, max, onChange, color, size }: any) {
  value = typeof value === 'number' && isFinite(value) ? value : (Number(value) || 0);
  const [drag, setDrag] = useState(false);
  const sy = useRef(0); const sv = useRef(0);
  const rot = -135 + ((value - min) / (max - min)) * 270;
  const sz = typeof size === 'number' ? size : 56;
  return (
    <div className="k-wrap">
      <div className="k-body" style={{ width: sz, height: sz, borderColor: drag ? color : '#2a2a3a' }}
        onMouseDown={(e) => { e.preventDefault(); setDrag(true); sy.current = e.clientY; sv.current = value; }}
        onMouseMove={(e) => { if (!drag) return; onChange(Math.max(min, Math.min(max, sv.current + (sy.current - e.clientY) * 0.006 * (max - min)))); }}
        onMouseUp={() => setDrag(false)} onMouseLeave={() => setDrag(false)}>
        <div className="k-ind" style={{ top: sz * 0.07, height: sz * 0.27, transformOrigin: '50% ' + Math.round(sz * 0.64) + 'px', transform: 'translateX(-50%) rotate(' + rot + 'deg)', background: color }} />
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
            <div key={sec.name} className={'tl-sec' + (active ? ' on' : '')} style={{ left: left + '%', width: width + '%' }}
              onClick={() => engine.jumpToSection(i)} title="Launch section (quantized to bar)">
              <span>{sec.name}</span><em>{sec.bars} bars</em>
            </div>
          );
        })}
        {pos.bar >= 0 && <div className="tl-play" style={{ left: ((pos.bar + (pos.step + 1) / 16) / engine.totalBars()) * 100 + '%' }} />}
      </div>
      <div className="hint" style={{ marginBottom: 8 }}>Click any section to launch it live — jumps at the next bar, Ableton-style.</div>
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
    </div>
  );
}

// ---------- MIXER (PRO CONSOLE) ----------
function useMeterPro(id: TrackId | 'master', playing: boolean) {
  const fill = useRef<HTMLDivElement>(null);
  const peak = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0; let disp = 0; let pk = 0;
    const loop = () => {
      const lv = playing ? engine.level(id) : 0;
      disp = Math.max(lv, disp * 0.9);
      pk = Math.max(disp, pk - 0.006);
      if (fill.current) fill.current.style.height = (Math.min(1, disp) * 100).toFixed(1) + '%';
      if (peak.current) peak.current.style.bottom = (Math.min(1, pk) * 100).toFixed(1) + '%';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, playing]);
  return { fill, peak };
}

function EqCurve({ eq, color }: { eq: { low: number; mid: number; high: number }; color: string }) {
  const pts: string[] = [];
  const fmin = Math.log10(40), fmax = Math.log10(16000);
  for (let i = 0; i <= 72; i++) {
    const f = Math.pow(10, fmin + (fmax - fmin) * i / 72);
    const wl = 1 / (1 + Math.pow(f / 160, 2));
    const wh = Math.pow(f / 7000, 2) / (1 + Math.pow(f / 7000, 2));
    const wm = Math.max(0, 1 - wl - wh);
    const db = eq.low * wl + eq.mid * wm + eq.high * wh;
    const x = (i / 72) * 240;
    const y = 40 - (db / 12) * 34;
    pts.push(x.toFixed(1) + ',' + y.toFixed(1));
  }
  return (
    <svg className="eq-svg" viewBox="0 0 240 80" preserveAspectRatio="none">
      <line x1="0" y1="40" x2="240" y2="40" className="eq-zero" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function ProStrip({ id, playing, selected, onSelect, bump }: { id: TrackId; playing: boolean; selected: boolean; onSelect: () => void; bump: () => void }) {
  const meta = TRACKS.find((t) => t.id === id)!;
  const st = engine.channelUI(id);
  const { fill, peak } = useMeterPro(id, playing);
  const act = (fn: () => void) => { fn(); bump(); };
  return (
    <div className={'pstrip' + (selected ? ' sel' : '')} style={{ borderColor: selected ? meta.color : meta.color + '44' }} onClick={onSelect}>
      <div className="ps-head" style={{ background: meta.color }}>{meta.name}</div>
      <div className="ps-eq">
        <Knob size={38} label="HI" value={st.eq.high} min={-12} max={12} color={meta.color} onChange={(v: number) => act(() => engine.setEq(id, 'high', v))} />
        <Knob size={38} label="MID" value={st.eq.mid} min={-12} max={12} color={meta.color} onChange={(v: number) => act(() => engine.setEq(id, 'mid', v))} />
        <Knob size={38} label="LOW" value={st.eq.low} min={-12} max={12} color={meta.color} onChange={(v: number) => act(() => engine.setEq(id, 'low', v))} />
      </div>
      <div className="ps-eq">
        <Knob size={38} label="DRV" value={st.drive} min={0} max={1} color={meta.color} onChange={(v: number) => act(() => engine.setDrive(id, v))} />
        <Knob size={38} label="DLY" value={st.d} min={0} max={1} color={meta.color} onChange={(v: number) => act(() => engine.setSend(id, 'd', v))} />
        <Knob size={38} label="REV" value={st.r} min={0} max={1} color={meta.color} onChange={(v: number) => act(() => engine.setSend(id, 'r', v))} />
      </div>
      <div className="ps-core">
        <div className="ps-meter"><div className="ps-fill" ref={fill} /><div className="ps-peak" ref={peak} /></div>
        <input className="pfader" type="range" min={0} max={1} step={0.005} value={st.level}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => act(() => engine.setFader(id, Number(e.target.value)))} />
      </div>
      <div className="ps-foot">
        <Knob size={38} label="PAN" value={st.pan} min={-1} max={1} color={meta.color} onChange={(v: number) => act(() => engine.setPan(id, v))} />
        <div className="ps-ms">
          <button className={'m-btn' + (st.mute ? ' on-m' : '')} onClick={(e) => { e.stopPropagation(); act(() => engine.setMute(id, !st.mute)); }}>M</button>
          <button className={'m-btn' + (st.solo ? ' on-s' : '')} onClick={(e) => { e.stopPropagation(); act(() => engine.setSolo(id, !st.solo)); }}>S</button>
        </div>
      </div>
    </div>
  );
}

function ProMaster({ playing, bump }: { playing: boolean; bump: () => void }) {
  const { fill, peak } = useMeterPro('master', playing);
  const mu = engine.masterUI;
  const act = (fn: () => void) => { fn(); bump(); };
  const clip = playing && engine.level('master') > 0.96;
  return (
    <div className="pstrip master">
      <div className="ps-head mst">MASTER</div>
      <div className="ps-eq">
        <Knob size={38} label="HI" value={mu.eq.high} min={-12} max={12} color="#ffffff" onChange={(v: number) => act(() => engine.setMasterEq('high', v))} />
        <Knob size={38} label="MID" value={mu.eq.mid} min={-12} max={12} color="#ffffff" onChange={(v: number) => act(() => engine.setMasterEq('mid', v))} />
        <Knob size={38} label="LOW" value={mu.eq.low} min={-12} max={12} color="#ffffff" onChange={(v: number) => act(() => engine.setMasterEq('low', v))} />
      </div>
      <div className="ps-eq">
        <Knob size={38} label="THR" value={mu.thresh} min={-40} max={0} color="#ffcc00" onChange={(v: number) => act(() => engine.setMasterComp(Math.round(v), mu.ratio))} />
        <Knob size={38} label="RATIO" value={mu.ratio} min={1} max={8} color="#ffcc00" onChange={(v: number) => act(() => engine.setMasterComp(mu.thresh, Math.round(v * 2) / 2))} />
        <div className={'lim-led' + (clip ? ' clip' : '')} title="limiter" />
      </div>
      <div className="ps-core">
        <div className="ps-meter"><div className="ps-fill" ref={fill} /><div className="ps-peak" ref={peak} /></div>
        <input className="pfader" type="range" min={0} max={1} step={0.005} value={mu.level} onChange={(e) => act(() => engine.setMasterLevel(Number(e.target.value)))} />
      </div>
      <div className="ps-foot"><span className="m-label">EQ → COMP → LIM</span></div>
    </div>
  );
}

function FxReturns({ bump }: { bump: () => void }) {
  const fx = engine.fxState();
  const act = (fn: () => void) => { fn(); bump(); };
  return (
    <div className="fxret">
      <span className="fxret-title">FX RETURNS</span>
      <span className="fxret-group">DELAY
        <Knob size={38} label="FDBK" value={fx.dFb} min={0} max={0.85} color="#00aaff" onChange={(v: number) => act(() => engine.setDelayFb(v))} />
        <Knob size={38} label="TONE" value={fx.dTone} min={800} max={8000} color="#00aaff" onChange={(v: number) => act(() => engine.setDelayTone(v))} />
      </span>
      <span className="fxret-group">REVERB
        <Knob size={38} label="SPACE" value={fx.space} min={0} max={1.6} color="#aa66ff" onChange={(v: number) => act(() => engine.setReverbSpace(v))} />
      </span>
      <span className="fxret-hint">mastering chain active: EQ → COMP → brickwall LIMITER (-1 dB)</span>
    </div>
  );
}

function ChannelDetail({ id }: { id: TrackId }) {
  const meta = TRACKS.find((t) => t.id === id)!;
  const st = engine.channelUI(id);
  return (
    <div className="cdetail" style={{ borderColor: meta.color + '66' }}>
      <div className="cd-head" style={{ color: meta.color }}>{meta.name} — EQ CURVE</div>
      <div className="cd-body">
        <EqCurve eq={st.eq} color={meta.color} />
        <div className="cd-nums">
          <span>LVL {(st.level * 100).toFixed(0)}%</span>
          <span>PAN {st.pan === 0 ? 'C' : st.pan < 0 ? 'L' + Math.round(-st.pan * 100) : 'R' + Math.round(st.pan * 100)}</span>
          <span>EQ {st.eq.low.toFixed(1)} / {st.eq.mid.toFixed(1)} / {st.eq.high.toFixed(1)} dB</span>
          <span>DRV {(st.drive * 100).toFixed(0)}% • DLY {(st.d * 100).toFixed(0)}% • REV {(st.r * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function Mixer({ playing }: { playing: boolean }) {
  const [, force] = useState(0);
  const [sel, setSel] = useState<TrackId>('lead');
  const bump = useCallback(() => force((x) => x + 1), []);
  return (
    <div className="view console-pro">
      <FxReturns bump={bump} />
      <div className="cp-row">
        {TRACKS.map((t) => <ProStrip key={t.id} id={t.id} playing={playing} selected={sel === t.id} onSelect={() => setSel(t.id)} bump={bump} />)}
        <ProMaster playing={playing} bump={bump} />
      </div>
      <ChannelDetail id={sel} />
      <div className="hint">PRO CONSOLE — vertical faders + peak-hold meters • 3-band EQ / PAN / DRIVE / sends per channel • M/S • click a channel to inspect its EQ curve • MASTER bus with EQ, compressor and limiter.</div>
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
const KNOB_CFG: Record<TrackId, { key: string; label: string; min: number; max: number }[]> = {
  bass: [ { key: 'cutoff', label: 'CUTOFF', min: 100, max: 4000 }, { key: 'res', label: 'RESO', min: 0, max: 12 }, { key: 'drive', label: 'DRIVE', min: 0, max: 1 }, { key: 'sub', label: 'SUB', min: 0, max: 1 }, { key: 'sidechain', label: 'PUMP', min: 0, max: 1 } ],
  lead: [ { key: 'cutoff', label: 'CUTOFF', min: 200, max: 6500 }, { key: 'res', label: 'RESO', min: 0, max: 13 }, { key: 'decay', label: 'DECAY', min: 0.1, max: 0.8 }, { key: 'detune', label: 'DETUNE', min: 0, max: 20 }, { key: 'dSend', label: 'DELAY', min: 0, max: 1 } ],
  pad: [ { key: 'cutoff', label: 'CUTOFF', min: 200, max: 5000 }, { key: 'width', label: 'WIDTH', min: 0, max: 1 }, { key: 'bright', label: 'BRIGHT', min: 0.5, max: 1.6 }, { key: 'rSend', label: 'REVERB', min: 0, max: 1 } ],
  kick: [ { key: 'decay', label: 'DECAY', min: 0.1, max: 0.6 }, { key: 'punch', label: 'PUNCH', min: 0, max: 1 }, { key: 'sat', label: 'SAT', min: 0, max: 1 }, { key: 'subk', label: 'SUB', min: 0, max: 1 } ],
  hats: [ { key: 'tone', label: 'TONE', min: 3000, max: 12000 }, { key: 'metal', label: 'METAL', min: 0, max: 1 }, { key: 'decay', label: 'DECAY', min: 0, max: 1 } ],
  open: [ { key: 'tone', label: 'TONE', min: 3000, max: 12000 }, { key: 'metal', label: 'METAL', min: 0, max: 1 } ],
};
const RACK_GROUPS: { name: string; tracks: TrackId[] }[] = [
  { name: 'SYNTHS', tracks: ['bass', 'lead', 'pad'] },
  { name: 'DRUMS', tracks: ['kick', 'hats', 'open'] },
];
function DeviceCard({ id }: { id: TrackId }) {
  const [, force] = useState(0);
  const meta = TRACKS.find((t) => t.id === id)!;
  return (
    <div className="devcard" style={{ borderColor: meta.color + '55' }}>
      <div className="devcard-head" style={{ color: meta.color }}>
        <span>{meta.name}</span>
        <button className="prev-btn" title="preview" onClick={() => engine.preview(id)}>▶</button>
      </div>
      <div className="devcard-knobs">
        {KNOB_CFG[id].map((k) => (
          <Knob key={k.key} label={k.label} value={Number((engine.params[id] as any)[k.key] ?? (k.min + k.max) / 2)} min={k.min} max={k.max} color={meta.color}
            onChange={(v: number) => { engine.setParam(id, k.key, v); force((x) => x + 1); }} />
        ))}
      </div>
    </div>
  );
}
function Rack() {
  return (
    <div className="view rackview">
      {RACK_GROUPS.map((g) => (
        <div key={g.name} className="rack-group">
          <div className="rack-group-head">{g.name}</div>
          <div className="rack-grid">
            {g.tracks.map((id) => <DeviceCard key={id} id={id} />)}
          </div>
        </div>
      ))}
      <div className="hint">Every knob is live — tweak and hear instantly. ▶ previews a device.</div>
    </div>
  );
}

function Library({ onPick }: { onPick: (st: string, sb: string, s: number) => void }) {
  const [q, setQ] = useState('');
  const stats = libraryStats();
  const ql = q.toLowerCase();
  return (
    <div className="view library">
      <div className="lib-head">LIBRARY — {stats.styles} styles • {stats.subs} sub-styles • {stats.sessions} sessions • 46 sounds</div>
      <input className="lib-search" placeholder="search style / sub-style..." value={q} onChange={(e) => setQ(e.target.value)} />
      {FAMILIES.map((fam) => {
        const styles = STYLES.filter((s) => s.family === fam)
          .filter((s) => !ql || s.name.toLowerCase().includes(ql) || s.subs.some((sb) => sb.name.toLowerCase().includes(ql)));
        if (styles.length === 0) return null;
        return (
          <div key={fam} className="lib-family">
            <div className="lib-family-head">{fam}</div>
            {styles.map((st) => (
              <div key={st.id} className="lib-style">
                <div className="lib-style-head" style={{ color: st.color }}>{st.name} <em>{st.desc}</em></div>
                {st.subs.map((sb) => (
                  <div key={sb.id} className="lib-sub">
                    <div className="lib-sub-head">{sb.name} <em>{sb.bpm} BPM • {sb.desc}</em></div>
                    <div className="lib-sessions">
                      {Array.from({ length: 16 }, (_, i) => i + 1).map((v) => (
                        <button key={v} className="lib-session" style={{ borderColor: st.color, color: st.color }} onClick={() => onPick(st.id, sb.id, v)}>S{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}


function MasterMeter({ playing }: { playing: boolean }) {
  const ref = useMeter('master', playing);
  return <div className="t-meter-fill" ref={ref} />;
}
// ---------- APP ----------
const CAT_INFO: Record<string, string> = {
  bass: 'Bass timbres - 5 characters (pluck/flat/acid/sub/growl). Applied to the BASS channel.',
  lead: 'Lead timbres - 3 engines (analog/FM/wavetable). Applied to the LEAD channel.',
  pad: 'Pad/atmosphere timbres. Applied to the PAD channel.',
  kick: 'Kick drum tunings. Applied to the KICK channel.',
  hats: 'Hi-hat tunings. Applied to the HATS channel.',
  fx: 'Global FX - delay feedback/tone, reverb space. Applied to master sends.',
  chords: 'Chord progressions. Sets the harmonic content for pads/bass.',
  grooves: 'Groove feel - swing, humanize, shaker on/off.',
  master: 'Master EQ + compressor shaping.',
  kits: 'Full drum kits - kick+hats+clap+shaker combos.',
  keys: 'Key/root transposition for the whole track.',
  arp: 'Arpeggiator - turns the lead into arp patterns (up/down/updown/random).',
  sidechain: 'Sidechain pump depth for bass/lead/pad.',
  atmos: 'Atmospheric drone layer toggle + level.',
  basspat: 'Bass rhythm patterns (rolling/offbeat/kbb/hypnotic/driving).',
  drumpat: 'Drum/hat patterns (offbeat/busy/sparse/shuffle).',
  hooks: 'Lead melody hooks (rising/falling/wave/jump/anthem).',
  transitions: 'Transition tools - roll length, open-into-drop, roll velocity.',
  form: 'Track structure/form - load a full arrangement.',
};

function Sounds({ setView }: { setView: (v: View) => void }) {
  const [, force] = useState(0);
  const cats = Object.keys(SOUND_LIB);
  const [cat, setCat] = useState('bass');
  const [q, setQ] = useState('');
  const list = SOUND_LIB[cat].filter((pr) => !q || pr.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="view library">
      <div className="lib-head">SOUND CHANNELS — {soundCount()} presets across {cats.length} channels • click a channel, then a preset to HEAR + apply it</div>
      <div className="snd-tabs">
        {cats.map((c) => (
          <button key={c} className={'style-chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c.toUpperCase()} ({SOUND_LIB[c].length})</button>
        ))}
        <input className="lib-search" style={{ marginLeft: 'auto', width: 180 }} placeholder="search..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="hint" style={{ marginTop: 6, color: '#7fd4ff' }}>{CAT_INFO[cat] || ''}</div>
      <div className="snd-grid">
        {list.map((pr) => (
          <button key={pr.name} className="lib-session snd-item" style={{ borderColor: '#00ff88', color: '#00ff88' }}
            onClick={() => { if (cat === 'form' && pr.p.form) { engine.loadArrangement(pr.p.form); setView('arrange'); } else { engine.previewSound(cat, pr.p); } force((x) => x + 1); }}>
            {pr.name}
          </button>
        ))}
      </div>
      <div className="hint">Every channel above is live — nothing runs hidden. AN = analog, FM = frequency modulation, WT = wavetable.</div>
    </div>
  );
}

const ROLE_E: Record<string, number> = { intro: 0.4, build: 0.6, drop: 1, drop2: 1, dropin: 0.9, climax: 1, bridge: 0.55, break: 0.3, ambient: 0.25, acid: 0.5, perc: 0.55, half: 0.45, outro: 0.3 };
function FormView() {
  const forms = SOUND_LIB.form || [];
  const [custom, setCustom] = useState<any[]>([]);
  const all = custom.length ? [...forms, ...custom] : forms;
  return (
    <div className="view formview">
      <div className="lib-head form-head">
        <span>FORM LIBRARY — {all.length} structures. Click to load.</span>
        <button className="compose-btn" onClick={() => { const f = composeForm(Math.floor(Math.random() * 1e9)); setCustom((c) => [...c, { name: 'FORM • Composed ' + (c.length + 1), p: { form: f } }]); }}>⚄ COMPOSE NEW</button>
      </div>
      <div className="form-grid">
        {all.map((f, idx) => {
          const bars = f.p.form.reduce((a: number, s: any) => a + s.bars, 0);
          return (
            <button key={f.name + idx} className="form-card" onClick={() => engine.loadArrangement(f.p.form)}>
              <span className="form-name">{f.name.replace('FORM • ', '')}</span>
              <span className="form-energy">{f.p.form.map((s: any, i: number) => (
                <i key={i} style={{ height: Math.round(4 + (ROLE_E[s.role] ?? 0.5) * 16) + 'px', background: (s.role === 'drop' || s.role === 'climax' || s.role === 'drop2' || s.role === 'dropin') ? 'var(--grn)' : (s.role === 'break' || s.role === 'ambient') ? '#5566aa' : '#8888aa' }} />
              ))}</span>
              <span className="form-meta">{bars} bars • {f.p.form.length} sections</span>
              <span className="form-seq">{f.p.form.map((s: any) => s.name).join(' → ')}</span>
            </button>
          );
        })}
      </div>
      <div className="hint">Green = drop/climax • blue = break/ambient • grey = build/intro/outro. ⚄ COMPOSE builds a fresh professional form (energy arc + DJ rules).</div>
    </div>
  );
}

// ---------- APP ----------
const KEYMAP: Record<string, number> = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15 };
function Keyboard() {
  const [track, setTrack] = useState<'lead' | 'bass' | 'pad'>('lead');
  const [active, setActive] = useState<Set<number>>(new Set());
  const base = track === 'lead' ? 69 : track === 'bass' ? 33 : 57;
  const play = (off: number) => { const m = base + off; engine.playVoice(track, m); setActive((p) => new Set(p).add(off)); window.setTimeout(() => setActive((p) => { const n = new Set(p); n.delete(off); return n; }), 180); };
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.repeat) return; const o = KEYMAP[e.key.toLowerCase()]; if (o !== undefined) play(o); };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [track]);
  return (
    <div className="kb-bar">
      <div className="kb-tracks">
        {(['lead', 'bass', 'pad'] as const).map((t) => (
          <button key={t} className={'kb-track' + (track === t ? ' on' : '')} onClick={() => setTrack(t)}>{t.toUpperCase()}</button>
        ))}
      </div>
      <div className="kb-keys">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className={'kb-key' + (active.has(i) ? ' on' : '') + ([1, 3, 6, 8, 10, 13, 15].includes(i) ? ' black' : '')} onMouseDown={() => play(i)} />
        ))}
      </div>
      <span className="kb-hint">play with A W S E D F T G Y H U J K O L P</span>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('arrange');
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(145);
  const [pos, setPos] = useState({ bar: -1, step: -1 });
  const [audioState, setAudioState] = useState('off');
  useEffect(() => { const iv = setInterval(() => { setAudioState(engine.audioState()); setBpm((b) => (b === engine.bpm ? b : engine.bpm)); }, 400); return () => clearInterval(iv); }, []);
  const [, force] = useState(0);
  const [family, setFamily] = useState('PSY MAIN');
  const [styleId, setStyleId] = useState('fullon');
  const [subId, setSubId] = useState('classic');
  useEffect(() => {
    engine.onTick = (bar, step) => setPos({ bar, step });
    engine.loadSession('fullon', 'classic', 1);
    return () => { engine.onTick = null; };
  }, []);
  const toggle = async () => { if (playing) { engine.stop(); setPlaying(false); } else { await engine.start(); setPlaying(true); } };
  const secName = pos.bar >= 0 ? sectionAtBar(pos.bar).section.name : '—';
  return (
    <div className="app">
      <header className="top">
        <div className="brand"><h1>PSYREASON</h1><span>WEB DAW — psytrance production system</span></div>
        <nav className="tabs">
          {(['arrange', 'form', 'mixer', 'pianoroll', 'rack', 'library', 'sounds'] as View[]).map((v) => (
            <button key={v} className={'tab' + (view === v ? ' on' : '')} onClick={() => setView(v)}>{v === 'pianoroll' ? 'PIANO ROLL' : v.toUpperCase()}</button>
          ))}
        </nav>
      </header>
      <div className="transport">
        <button className={'play' + (playing ? ' on' : '')} onClick={() => { engine.init(); toggle(); }}>{playing ? '■ STOP' : '▶ PLAY'}</button>
        <button className="gen" onClick={() => { engine.newSessionKeepForm(Math.floor(Math.random() * 999)); setBpm(engine.bpm); force((x) => x + 1); }} title="generate new take (keeps form)">⚄ GENERATE</button>
        <div className="t-block"><span>BPM</span><input type="number" value={bpm} min={90} max={200} onChange={(e) => { const v = Number(e.target.value); setBpm(v); engine.setBpm(v); }} /></div>
        <div className="t-block"><span>POS</span><b>{pos.bar >= 0 ? 'BAR ' + (pos.bar + 1) + ' . ' + (pos.step + 1) : '—'}</b></div>
        <div className="t-block"><span>SECTION</span><b className="sec">{secName}</b></div>
        <div className="t-meter"><span>MST</span><div className="t-meter-track"><MasterMeter playing={playing} /></div></div>
      </div>
      <div className="stylebar">
        <span className="sb-label">FAMILY</span>
        {FAMILIES.map((f) => (
          <button key={f} className={'style-chip fam' + (family === f ? ' on' : '')} onClick={() => { setFamily(f); const st = STYLES.find((s) => s.family === f) || STYLES[0]; setStyleId(st.id); setSubId(st.subs[0].id); engine.loadSession(st.id, st.subs[0].id, 1); setBpm(engine.bpm); force((x) => x + 1); }}>{f}</button>
        ))}
      </div>
      <div className="stylebar sub">
        <span className="sb-label">STYLE</span>
        {STYLES.filter((s) => s.family === family).map((st) => (
          <button key={st.id} className={'style-chip' + (styleId === st.id ? ' on' : '')} style={styleId === st.id ? { borderColor: st.color, color: st.color } : undefined} onClick={() => { setStyleId(st.id); setSubId(st.subs[0].id); engine.queueSession(st.id, st.subs[0].id, 1); force((x) => x + 1); }}>{st.name}</button>
        ))}
        <span className="sb-label">SUB</span>
        {(STYLES.find((s) => s.id === styleId) || STYLES[0]).subs.map((sb) => (
          <button key={sb.id} className={'style-chip subchip' + (subId === sb.id ? ' on' : '')} style={subId === sb.id ? { borderColor: '#fff', color: '#fff' } : undefined} onClick={() => { setSubId(sb.id); engine.queueSession(styleId, sb.id, 1); force((x) => x + 1); }}>{sb.name}</button>
        ))}
      </div>
      <div className="stylebar sub">
        <span className="sb-label">SESSION</span>
        {Array.from({ length: 16 }, (_, i) => i + 1).map((v) => (
          <button key={v} className="var-btn" onClick={() => { engine.queueSession(styleId, subId, v); force((x) => x + 1); }}>S{v}</button>
        ))}
      </div>
      <main className="content">
        {view === 'arrange' && <Arrange pos={pos} playing={playing} />}
        {view === 'form' && <FormView />}
        {view === 'mixer' && <Mixer playing={playing} />}
        {view === 'pianoroll' && <PianoRoll pos={pos} playing={playing} />}
        {view === 'rack' && <Rack />}
        {view === 'sounds' && <Sounds setView={setView} />}
        {view === 'library' && <Library onPick={(st, sb, s) => { setStyleId(st); setSubId(sb); engine.loadSession(st, sb, s); setBpm(engine.bpm); force((x) => x + 1); setView('arrange'); }} />}
      </main>
      <Keyboard />
      <footer className="foot">
        <span>PsyReason v7 — pro console mixer • rich spread pads • smooth transitions • seeded sound variety | build 2025-m1</span>
        <span>{playing ? 'RUNNING' : 'IDLE'} • AUDIO: {audioState} • {bpm} BPM • {engine.totalBars()}-bar arrangement • seed {engine.seed}</span>
      </footer>
    </div>
  );
}


export class ErrorBoundary extends React.Component<{ children?: any }, { err: string | null }> {
  constructor(props: any) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e: any) { return { err: String(e && e.message ? e.message : e) }; }
  render() {
    if (this.state.err) {
      return <div style={{ padding: 24, color: '#ff6666', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2>Something went wrong (caught, not blank):</h2>
        <div>{this.state.err}</div>
        <button style={{ marginTop: 12 }} onClick={() => location.reload()}>Reload</button>
      </div>;
    }
    return this.props.children;
  }
}
