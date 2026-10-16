// Spring stage layout (pixels). x = left edge, y = top edge unless noted.
// About 4.6 screens wide. Ground top is groundY; the world is one screen tall.

const groundY = 470;

export default {
  width: 4400,
  groundY,
  spawn: { x: 70, y: groundY - 60 },

  ground: [
    { x: 0, w: 1600 },
    { x: 2230, w: 2170 },
  ],

  platforms: [
    // Meadow walk: a fence, a few optional wooden ledges, a hedge-high fence.
    { x: 500, y: groundY - 30, w: 40, h: 30, kind: 'fence' },
    { x: 700, y: 405, w: 130, h: 16, kind: 'wood' },
    { x: 880, y: 345, w: 130, h: 16, kind: 'wood' },
    { x: 1150, y: groundY - 44, w: 40, h: 44, kind: 'fence' },

    // Stepping stones over the stream. Pitch (180) matches a full running jump,
    // so jumping from anywhere on a stone while holding right lands on the next.
    { x: 1690, y: 456, w: 90, h: 14, kind: 'stone' },
    { x: 1870, y: 450, w: 90, h: 14, kind: 'stone' },
    { x: 2050, y: 456, w: 90, h: 14, kind: 'stone' },

    // Flower garden: raised planters and a trellis ledge.
    { x: 2830, y: groundY - 40, w: 140, h: 40, kind: 'planter' },
    { x: 3200, y: groundY - 52, w: 120, h: 52, kind: 'planter' },
    { x: 3390, y: 362, w: 120, h: 16, kind: 'wood' },
    { x: 3580, y: groundY - 40, w: 140, h: 40, kind: 'planter' },
  ],

  water: [{ x: 1600, w: 630 }],

  hidingSpots: [
    { x: 2690, kind: 'bush' },
    { x: 3080, kind: 'bush' },
    { x: 3800, kind: 'bush' },
  ],

  trees: [140, 390, 1010, 1390, 2360, 2520, 3960, 4320],

  flowerBeds: [
    { x: 200, w: 220 },
    { x: 600, w: 90 },
    { x: 1220, w: 150 },
    { x: 2280, w: 120 },
    { x: 2600, w: 200 },
    { x: 2990, w: 190 },
    { x: 3340, w: 220 },
    { x: 3740, w: 260 },
    { x: 4060, w: 300 },
  ],

  signs: [
    { x: 150, text: '← → or A D to move' },
    { x: 420, text: 'SPACE or ↑ to jump' },
    { x: 1520, text: "Hop the stones. Don't fall in!" },
    { x: 2590, text: 'Hold ↓ in a bush to hide' },
  ],

  // Trigger lines for each hurdle, keyed by the hurdle key in the season config.
  hurdles: {
    meadow: { startX: 200, endX: 1300 },
    'stepping-stones': { startX: 1450, endX: 2350 },
    'flower-garden': { startX: 2560, endX: 3960 },
  },

  goal: { x: 4180, label: 'Garden Gate' },
};
