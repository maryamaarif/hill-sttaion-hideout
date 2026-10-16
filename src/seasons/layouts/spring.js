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

    // Flower garden: one raised planter between the two patrols.
    { x: 3290, y: groundY - 44, w: 120, h: 44, kind: 'planter' },
  ],

  water: [{ x: 1600, w: 630 }],

  // Garden teaches hiding without text: officer 1 waits facing away, then turns
  // and walks toward the player as they enter, his cone reaching the first bush.
  // The flower bed halfway along his route lets the player let him walk past.
  hidingSpots: [
    { x: 2700, kind: 'bush' },
    { x: 2990, kind: 'flowers' },
    { x: 3520, kind: 'flowers' },
    { x: 3800, kind: 'bush' },
  ],

  police: [
    { from: 2800, to: 3150, startAt: 'to', waitFacing: 1, activateX: 2560 },
    { from: 3580, to: 3880, startAt: 'to' },
  ],

  // Added from level 2 on (one per DifficultySystem policeCountBonus).
  extraPolice: [
    { from: 3150, to: 3470, startAt: 'from' },
    { from: 900, to: 1250, startAt: 'to' }, // meadow (level 3+)
  ],

  trees: [140, 390, 1010, 1390, 2360, 2520, 3960, 4320],

  flowerBeds: [
    { x: 200, w: 220 },
    { x: 600, w: 90 },
    { x: 1220, w: 150 },
    { x: 2280, w: 120 },
    { x: 2580, w: 60 },
    { x: 2790, w: 140 },
    { x: 3090, w: 160 },
    { x: 3600, w: 150 },
    { x: 4060, w: 300 },
  ],

  signs: [
    { x: 150, text: '← → or A D to move' },
    { x: 420, text: 'SPACE or ↑ to jump' },
    { x: 1520, text: "Hop the stones. Don't fall in!" },
  ],

  // Trigger lines for each hurdle, keyed by the hurdle key in the season config.
  hurdles: {
    meadow: { startX: 200, endX: 1300 },
    'stepping-stones': { startX: 1450, endX: 2350 },
    'flower-garden': { startX: 2560, endX: 3960 },
  },

  goal: { x: 4180, label: 'Garden Gate' },
};
