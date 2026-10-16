// Spring stage layout (pixels). x = left edge, y = top edge unless noted.
// About 5.5 screens wide. Spring teaches the game WITHOUT written instructions:
//
//   0–1000     First screen: walk (← → icons), jump a small log (jump icon), then a bush
//              (hide icon) right before the first officer turns and walks toward you,
//              his cone sweeping over the bush. Let him pass, then carry on.
//   1050–2150  Hurdle 1, Meadow Walk: fences and ledges
//   2300–3200  Hurdle 2, Stepping Stones: falling in the stream costs a life
//   3410–4810  Hurdle 3, Flower Garden: two patrols, bushes and flower beds to hide in

const groundY = 470;

export default {
  width: 5250,
  groundY,
  spawn: { x: 70, y: groundY - 60 },

  ground: [
    { x: 0, w: 2450 },
    { x: 3080, w: 2170 },
  ],

  platforms: [
    // First screen: a small log to hop.
    { x: 300, y: groundY - 22, w: 56, h: 22, kind: 'log' },

    // Meadow walk: a fence, a few optional wooden ledges, a hedge-high fence.
    { x: 1350, y: groundY - 30, w: 40, h: 30, kind: 'fence' },
    { x: 1550, y: 405, w: 130, h: 16, kind: 'wood' },
    { x: 1730, y: 345, w: 130, h: 16, kind: 'wood' },
    { x: 2000, y: groundY - 44, w: 40, h: 44, kind: 'fence' },

    // Stepping stones over the stream. Pitch (180) matches a full running jump,
    // so jumping from anywhere on a stone while holding right lands on the next.
    { x: 2540, y: 456, w: 90, h: 14, kind: 'stone' },
    { x: 2720, y: 450, w: 90, h: 14, kind: 'stone' },
    { x: 2900, y: 456, w: 90, h: 14, kind: 'stone' },

    // Flower garden: one raised planter between the two patrols.
    { x: 4140, y: groundY - 44, w: 120, h: 44, kind: 'planter' },
  ],

  water: [{ x: 2450, w: 630 }],

  hidingSpots: [
    { x: 640, kind: 'bush' }, // first screen: the hiding lesson
    // Garden: officer 1 waits facing away, then turns and walks toward the player,
    // his cone reaching the first bush. The flower bed lets the player let him pass.
    { x: 3550, kind: 'bush' },
    { x: 3840, kind: 'flowers' },
    { x: 4370, kind: 'flowers' },
    { x: 4650, kind: 'bush' },
  ],

  police: [
    // First screen: stands with his back turned until the player hops the log, then
    // walks left past the bush (and on toward the start), so the player learns to
    // hide and let him pass.
    { from: 160, to: 900, startAt: 'to', waitFacing: 1, activateX: 380 },
    { from: 3650, to: 4000, startAt: 'to', waitFacing: 1, activateX: 3410 },
    { from: 4430, to: 4730, startAt: 'to' },
  ],

  // Added from level 2 on (one per DifficultySystem policeCountBonus).
  extraPolice: [
    { from: 4000, to: 4320, startAt: 'from' },
    { from: 1750, to: 2100, startAt: 'to' }, // meadow (level 3+)
  ],

  // Key icons next to the action (no sentences). They fade once the action is used.
  keyHints: [
    { x: 120, y: groundY - 70, actions: ['left', 'right'] },
    { x: 328, y: groundY - 74, actions: ['jump'] },
    { x: 640, y: groundY - 100, actions: ['hide'] },
    { x: 2585, y: groundY - 110, actions: ['glide'] }, // umbrella over the stream
  ],

  trees: [140, 480, 980, 1240, 1860, 2240, 3210, 3370, 4810, 5170],

  flowerBeds: [
    { x: 180, w: 90 },
    { x: 1050, w: 220 },
    { x: 1450, w: 90 },
    { x: 2070, w: 150 },
    { x: 3130, w: 120 },
    { x: 3430, w: 60 },
    { x: 3640, w: 140 },
    { x: 3940, w: 160 },
    { x: 4450, w: 150 },
    { x: 4910, w: 300 },
  ],

  // Trigger lines for each hurdle, keyed by the hurdle key in the season config.
  hurdles: {
    meadow: { startX: 1050, endX: 2150 },
    'stepping-stones': { startX: 2300, endX: 3200 },
    'flower-garden': { startX: 3410, endX: 4810 },
  },

  goal: { x: 5030, label: 'Garden Gate' },
};
