// PsyReason Sound Library - 46 timbre presets applied live to the engines
export interface SoundPreset { name: string; p: Record<string, any>; }

export const SOUND_LIB: Record<string, SoundPreset[]> = {
  bass: [
    { name: 'Rolling Classic', p: { wave: 'sawtooth', cutoff: 900, res: 6, drive: 0.4 } },
    { name: 'Night Drive', p: { wave: 'sawtooth', cutoff: 700, res: 8, drive: 0.6 } },
    { name: 'Acid Squelch', p: { wave: 'sawtooth', cutoff: 1200, res: 14, drive: 0.7 } },
    { name: 'Sub Heavy', p: { wave: 'square', cutoff: 500, res: 4, drive: 0.3 } },
    { name: 'Square Pusher', p: { wave: 'square', cutoff: 800, res: 7, drive: 0.5 } },
    { name: 'Hypnotic 16ths', p: { wave: 'sawtooth', cutoff: 750, res: 5, drive: 0.45 } },
    { name: 'Dark Growl', p: { wave: 'sawtooth', cutoff: 600, res: 10, drive: 0.8 } },
    { name: 'Prog Bounce', p: { wave: 'sawtooth', cutoff: 850, res: 4, drive: 0.35 } },
    { name: 'KBB Punch', p: { wave: 'sawtooth', cutoff: 950, res: 6, drive: 0.55 } },
    { name: 'Forest Twang', p: { wave: 'sawtooth', cutoff: 1100, res: 9, drive: 0.6 } },
    { name: 'Zenone Pulse', p: { wave: 'square', cutoff: 650, res: 6, drive: 0.5 } },
    { name: 'Chill Sub', p: { wave: 'square', cutoff: 400, res: 3, drive: 0.2 } },
  ],
  lead: [
    { name: 'Acid 303', p: { wave: 'sawtooth', cutoff: 3000, res: 14, decay: 0.25 } },
    { name: 'Supersaw Anthem', p: { wave: 'sawtooth', cutoff: 5600, res: 4, decay: 0.4 } },
    { name: 'Pluck Hook', p: { wave: 'sawtooth', cutoff: 4200, res: 6, decay: 0.15 } },
    { name: 'Twisted Dark', p: { wave: 'sawtooth', cutoff: 2600, res: 10, decay: 0.3 } },
    { name: 'Goa Air', p: { wave: 'triangle', cutoff: 3800, res: 5, decay: 0.35 } },
    { name: 'Morning Rise', p: { wave: 'square', cutoff: 5200, res: 4, decay: 0.45 } },
    { name: 'Hi-Tech Squiggle', p: { wave: 'sawtooth', cutoff: 4800, res: 9, decay: 0.12 } },
    { name: 'Forest Echo', p: { wave: 'sawtooth', cutoff: 3200, res: 8, decay: 0.28 } },
    { name: 'Prog Stab', p: { wave: 'sawtooth', cutoff: 2800, res: 4, decay: 0.2 } },
    { name: 'Trance Anthem', p: { wave: 'triangle', cutoff: 4600, res: 3, decay: 0.5 } },
    { name: 'Psychill Air', p: { wave: 'triangle', cutoff: 3000, res: 2, decay: 0.6 } },
    { name: 'Suomi Weird', p: { wave: 'square', cutoff: 3600, res: 7, decay: 0.22 } },
  ],
  pad: [
    { name: 'Warm Blanket', p: { cutoff: 1200, rSend: 0.5 } },
    { name: 'Dark Atmosphere', p: { cutoff: 700, rSend: 0.6 } },
    { name: 'Sunrise Walls', p: { cutoff: 2200, rSend: 0.5 } },
    { name: 'Forest Fog', p: { cutoff: 900, rSend: 0.7 } },
    { name: 'Anthem Stack', p: { cutoff: 2600, rSend: 0.4 } },
    { name: 'Chill Space', p: { cutoff: 1600, rSend: 0.8 } },
    { name: 'Twilight Shimmer', p: { cutoff: 1900, rSend: 0.6 } },
    { name: 'Abyss Drone', p: { cutoff: 500, rSend: 0.7 } },
  ],
  kick: [
    { name: 'Full-On Thump', p: { decay: 0.28, punch: 0.5 } },
    { name: 'Psycore Punch', p: { decay: 0.2, punch: 0.8 } },
    { name: 'Soft Psychill', p: { decay: 0.4, punch: 0.25 } },
    { name: 'Goa Round', p: { decay: 0.32, punch: 0.4 } },
    { name: 'Dark Click', p: { decay: 0.24, punch: 0.7 } },
    { name: 'Tech Tight', p: { decay: 0.22, punch: 0.6 } },
    { name: 'Forest Deep', p: { decay: 0.3, punch: 0.55 } },
    { name: 'Morning Big', p: { decay: 0.34, punch: 0.6 } },
  ],
  hats: [
    { name: 'Classic Offbeat', p: { tone: 7500 } },
    { name: 'Busy Hi-Tech', p: { tone: 9000 } },
    { name: 'Sparse Prog', p: { tone: 7000 } },
    { name: 'Dark Tight', p: { tone: 8200 } },
    { name: 'Suomi Loose', p: { tone: 6500 } },
    { name: 'Chill Soft', p: { tone: 5800 } },
  ],
};

export function soundCount(): number {
  return Object.values(SOUND_LIB).reduce((a, l) => a + l.length, 0);
}
