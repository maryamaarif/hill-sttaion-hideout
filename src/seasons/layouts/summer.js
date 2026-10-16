// Summer stage layout (pixels). x = left edge, y = top edge unless noted.
// About 5.8 screens wide. Lower ground than Spring so the river and lake are deep.
//
//   0–1790     Quarry: rock steps and pits under a hot sun (heat zone), rock overhangs for shade
//   1790–3760  River: ride the canoe, jump the snags, hide in the reeds under the bridge
//              lookout, then hop logs to the far bank
//   3760–5120  Lake: swim, dive under the jetty officer's gaze, climb out on the far bank

const groundY = 430;

export default {
  width: 5600,
  groundY,
  spawn: { x: 70, y: groundY - 60 },

  ground: [
    { x: 0, w: 300 },
    { x: 300, w: 260, kind: 'rock' },
    { x: 660, w: 240, y: 400, kind: 'rock' },
    { x: 990, w: 260, y: 360, kind: 'rock' },
    { x: 1250, w: 420, kind: 'rock' },
    { x: 1760, w: 240 }, // river bank, canoe dock
    { x: 3700, w: 450 }, // far river bank / lake shore
    { x: 5050, w: 550 }, // far lake shore
  ],

  pits: [
    { x: 560, w: 100 },
    { x: 900, w: 90 },
    { x: 1670, w: 90 },
  ],

  cliffs: [{ x: 280, w: 1420, h: 190 }],

  platforms: [
    // Rock island where the canoe ends; logs carry on from here.
    { x: 3120, y: groundY, w: 120, h: 110, kind: 'rock' },
    // Footbridge over the river: the lookout stands here, too high to reach.
    { x: 2690, y: 330, w: 120, h: 14, kind: 'bridge' },
    // Jetty out over the lake, patrolled by an officer.
    { x: 4470, y: 392, w: 260, h: 12, kind: 'jetty' },
  ],

  water: [
    { x: 2000, w: 1700 }, // river: falling in fails the hurdle
    { x: 4150, w: 900, swim: true }, // lake: swim and dive
  ],

  // Snags sticking out of the river at deck height: jump them from the canoe.
  obstacles: [
    { x: 2200, top: 402, kind: 'snag' },
    { x: 2400, top: 402, kind: 'snag' },
  ],

  movers: [
    // Decks sit level with the banks so the player can step on and off.
    // Waits at the dock until the player steps in, then drifts to the island.
    { kind: 'canoe', mode: 'ferry', from: 2005, to: 2995, y: groundY, w: 120, speed: 95 },
    // Two logs drifting from the island to the far bank, half a cycle apart.
    { kind: 'log', mode: 'loop', from: 3245, to: 3590, y: groundY, w: 105, speed: 60, phase: 0 },
    { kind: 'log', mode: 'loop', from: 3245, to: 3590, y: groundY, w: 105, speed: 60, phase: 0.5 },
  ],

  // Standing still in the sun here drains stamina.
  heatZones: [{ x: 300, w: 1370 }],

  hidingSpots: [
    // Quarry overhangs: shade from the sun and cover from the quarry officer.
    { x: 440, kind: 'overhang' },
    { x: 1110, kind: 'overhang' },
    { x: 1520, kind: 'overhang' },
    // Reeds either side of the bridge, where the lookout's cone reaches the river.
    { x: 2590, w: 240, y: groundY + 22, kind: 'reeds' },
    { x: 2875, w: 170, y: groundY + 22, kind: 'reeds' },
  ],

  police: [
    { from: 1300, to: 1600, startAt: 'to' }, // quarry floor
    { from: 2750, to: 2750, y: 330, tiltDeg: 38, pauseMs: 2600, startAt: 'to' }, // bridge lookout
    { from: 4490, to: 4710, y: 392, tiltDeg: 24 }, // jetty
  ],

  // Added from level 2 on (one per DifficultySystem policeCountBonus).
  extraPolice: [{ from: 3740, to: 4080, startAt: 'to' }],

  trees: [90, 1830, 3780, 4100, 5120, 5480],

  flowerBeds: [
    { x: 10, w: 260 },
    { x: 1770, w: 200 },
    { x: 3720, w: 380 },
    { x: 5080, w: 420 },
  ],

  signs: [
    { x: 200, text: "Don't stand still in the sun!" },
    { x: 1900, text: 'Hop in the canoe →' },
    { x: 4060, text: 'Hold ↓ to dive under' },
  ],

  hurdles: {
    quarry: { startX: 320, endX: 1790 },
    canoe: { startX: 1880, endX: 3760 },
    swim: { startX: 3900, endX: 5120 },
  },

  goal: { x: 5380, label: 'Boathouse' },
};
