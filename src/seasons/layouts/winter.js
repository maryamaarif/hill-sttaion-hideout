// Winter stage layout (pixels). x = left edge, y = top edge unless noted.
// About 6.3 screens wide. Starts high on the mountain and skis down to the guest house.
//
//   0–2000     Ski slope: auto-run downhill on skis; hop rocks and young pines; outrun
//              the police skiers (→ faster, ← slower)
//   2000–3440  Ski jump: a clear run-up, the ramp, a deep gap. Hit the lip at full
//              speed and HOLD jump to glide across to the landing slope
//   3440–5400  Blizzard: fog shrinks your view to a circle (and police cones too).
//              Your footprints show in the snow, and police follow fresh trails.
//              Hide in huts and snowdrifts. The lit guest house waits at the end.

const groundY = 450;

export default {
  width: 6000,
  groundY,
  spawn: { x: 70, y: 220 },

  ground: [
    { x: 0, w: 420, y: 280 }, // mountain top
    { x: 3400, w: 2600 }, // valley floor: blizzard and the guest house
  ],

  slopes: [
    { x: 420, w: 1580, y1: 280, y2: 400 }, // ski slope
    { x: 2000, w: 520, y1: 400, y2: 440 }, // run-up
    { x: 2520, w: 110, y1: 440, y2: 415, launch: 1.1 }, // ski-jump ramp
    { x: 3080, w: 320, y1: 425, y2: 450 }, // landing slope
  ],

  // The gap under the ski jump.
  pits: [{ x: 2630, w: 450 }],

  // On skis from the top of the slope until after the landing.
  skiZones: [{ x: 430, w: 3000 }],

  // Jump these on the ski slope. ~375px apart: a full-speed jump (about 320px)
  // over one always lands clear of the next.
  obstacles: [
    { x: 660, kind: 'rock' },
    { x: 1035, kind: 'pine' },
    { x: 1410, kind: 'rock' },
    { x: 1785, kind: 'pine' },
  ],

  blizzardZones: [{ x: 3500, w: 1900 }],
  footprintZones: [{ x: 3440, w: 2000 }],

  hidingSpots: [
    { x: 3760, kind: 'hut' },
    { x: 4100, kind: 'drift' },
    { x: 4480, kind: 'hut' },
    { x: 4820, kind: 'drift' },
    { x: 5150, kind: 'hut' },
  ],

  police: [
    // Ski patrol on the slope: one coming up toward you, one ahead going your way.
    { from: 1000, to: 1350, startAt: 'to', skis: true, speedScale: 1.8, lengthScale: 1.1 },
    { from: 1450, to: 1850, skis: true, speedScale: 1.8, lengthScale: 1.1 },
    // Blizzard patrols: they follow footprints.
    { from: 3950, to: 4300, startAt: 'to' },
    { from: 4650, to: 5000 },
  ],

  // Added from level 2 on (one per DifficultySystem policeCountBonus).
  extraPolice: [{ from: 5200, to: 5450, startAt: 'to' }],

  trees: [140, 360, 1100, 1700, 2300, 3460, 3620, 4300, 5420, 5900],

  signs: [
    { x: 220, text: 'On skis: → faster, ← slower' },
    { x: 2070, text: 'Full speed, then HOLD jump!' },
  ],

  hurdles: {
    'ski-slope': { startX: 440, endX: 2000 },
    'ski-jump': { startX: 2040, endX: 3440 },
    blizzard: { startX: 3560, endX: 5300 },
  },

  goal: { x: 5650, kind: 'house', label: 'Guest House' },
};
