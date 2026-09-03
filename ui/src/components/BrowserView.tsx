import { useState } from 'react';

type BrowserTab = 'devices' | 'patches' | 'samples' | 'refills';

interface BrowserItem {
  name: string;
  category: string;
  size: string;
}

const DEVICES: BrowserItem[] = [
  { name: 'Subtractor', category: 'Synthesizers', size: 'Subtractive Synth' },
  { name: 'Thor', category: 'Synthesizers', size: 'Modular Synth' },
  { name: 'Malstrom', category: 'Synthesizers', size: 'Graintable Synth' },
  { name: 'Europa', category: 'Synthesizers', size: 'Wavetable Synth' },
  { name: 'NN-XT', category: 'Samplers', size: 'Advanced Sampler' },
  { name: 'Grain', category: 'Samplers', size: 'Granular Sampler' },
  { name: 'Redrum', category: 'Drums', size: 'Classic Drum Machine' },
  { name: 'Kong', category: 'Drums', size: 'Drum Designer (16 pads)' },
  { name: 'Mixer 14:2', category: 'Mixing', size: '14-Channel Mixer' },
  { name: 'Combinator', category: 'Mixing', size: 'Device Combiner' },
  { name: 'Synchronous', category: 'Effects', size: 'Step FX' },
  { name: 'Pulsar Vocoder', category: 'Effects', size: 'Vocoder' },
  { name: 'RV-7 Reverb', category: 'Effects', size: 'Digital Reverb' },
  { name: 'DDL-1 Delay', category: 'Effects', size: 'Digital Delay' },
  { name: 'CF-100 Chorus', category: 'Effects', size: 'Chorus/Flanger' },
  { name: 'ECF-42 Filter', category: 'Effects', size: 'Envelope Filter' },
  { name: 'Scream 4', category: 'Effects', size: 'Distortion' },
  { name: 'Phaser', category: 'Effects', size: 'Phaser/Flanger' },
  { name: 'MClass Compressor', category: 'Mastering', size: 'Compressor' },
  { name: 'MClass EQ', category: 'Mastering', size: 'Parametric EQ' },
  { name: 'MClass Imager', category: 'Mastering', size: 'Stereo Imager' },
  { name: 'RPG-8', category: 'Tools', size: 'Arpeggiator' },
  { name: 'Matrix', category: 'Tools', size: 'Pattern Sequencer' },
];

const PATCHES: BrowserItem[] = [
  { name: 'Psy Lead Screamer', category: 'Thor', size: '2.1 KB' },
  { name: 'Rolling Bass 145', category: 'Thor', size: '1.8 KB' },
  { name: 'Acid 303 Style', category: 'Thor', size: '1.6 KB' },
  { name: 'Full-On Pad', category: 'Thor', size: '2.4 KB' },
  { name: 'Graintable Sweep', category: 'Malstrom', size: '1.9 KB' },
  { name: 'Vocal Formant', category: 'Malstrom', size: '2.2 KB' },
  { name: 'Wavetable Psy', category: 'Europa', size: '2.0 KB' },
  { name: 'Granular Texture', category: 'Grain', size: '1.5 KB' },
  { name: 'Full-On Kit', category: 'Kong', size: '8.4 KB' },
  { name: 'Psy Trance Kit', category: 'Kong', size: '7.2 KB' },
  { name: 'Acid Bass Station', category: 'Combinator', size: '4.2 KB' },
  { name: 'Psy Lead Machine', category: 'Combinator', size: '3.8 KB' },
  { name: 'Rolling Filter', category: 'Synchronous', size: '1.1 KB' },
  { name: 'Acid Sweep', category: 'Synchronous', size: '1.2 KB' },
  { name: 'Robot Voice', category: 'Pulsar', size: '0.9 KB' },
];

export default function BrowserView() {
  const [activeTab, setActiveTab] = useState<BrowserTab>('devices');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const items = activeTab === 'devices' ? DEVICES : PATCHES;
  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="browser-view">
      <div className="browser-tabs">
        <button className={activeTab === 'devices' ? 'active' : ''} onClick={() => setActiveTab('devices')}>DEVICES ({DEVICES.length})</button>
        <button className={activeTab === 'patches' ? 'active' : ''} onClick={() => setActiveTab('patches')}>PATCHES ({PATCHES.length})</button>
        <button className={activeTab === 'samples' ? 'active' : ''} onClick={() => setActiveTab('samples')}>SAMPLES</button>
        <button className={activeTab === 'refills' ? 'active' : ''} onClick={() => setActiveTab('refills')}>REFILLS</button>
      </div>
      <div className="browser-search">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="browser-list">
        {filtered.map((item) => (
          <div
            key={item.name}
            className={'browser-item ' + (selectedItem === item.name ? 'selected' : '')}
            onClick={() => setSelectedItem(item.name)}
          >
            <span className="item-name">{item.name}</span>
            <span className="item-category">{item.category}</span>
            <span className="item-size">{item.size}</span>
          </div>
        ))}
        {filtered.length === 0 && <div className="browser-empty">No items found</div>}
      </div>
      <div className="browser-footer">
        <span>{filtered.length} items</span>
        {selectedItem && <span>Selected: {selectedItem}</span>}
      </div>
    </div>
  );
}
