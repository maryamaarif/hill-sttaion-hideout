// Fall stage layout (pixels). x = left edge, y = top edge unless noted.
// About 6.7 screens wide.
//
//   0–3560     Ride the train: climb aboard at the station, ride over the gorge past
//              the halt where two officers scan the roofs (hide between carriages),
//              duck under a footbridge and through a low tunnel, get off at the far end
//   3560–4460  Cross the tracks: three level crossings on a timetable. A train passing
//              the middle crossing blocks the signal-box officer's view
//   4560–5900  Leaf path: identical leaf piles hide pits or hiding places; wind gusts
//              reveal what is under them (and expose anyone hiding in a pile)

const groundY = 440;

export default {
  width: 6400,
  groundY,
  spawn: { x: 70, y: groundY - 60 },

  ground: [
    { x: 0, w: 1200 }, // departure station
    { x: 2250, w: 2650 }, // arrival station, track yard, start of the leaf path
    { x: 4970, w: 230 },
    { x: 5270, w: 330 },
    { x: 5670, w: 730 },
  ],

  // The gorge under the train, and the holes hidden under leaf piles.
  pits: [
    { x: 1200, w: 1050 },
    { x: 4900, w: 70 },
    { x: 5200, w: 70 },
    { x: 5600, w: 70 },
  ],

  structures: [
    { kind: 'rails', x: 0, w: 1200 },
    { kind: 'trestle', x: 1200, w: 1050 },
    { kind: 'rails', x: 2250, w: 1300 },
    { kind: 'signalBox', x: 4090 },
  ],

  platforms: [
    { x: 216, y: groundY - 44, w: 56, h: 44, kind: 'crate' }, // step up onto the train
    // Maple Halt: scenery only, so falling off the train still drops into the gorge.
    { x: 1480, y: groundY, w: 280, h: 12, kind: 'halt', solid: false },
  ],

  movers: [
    // Waits at the station until the player climbs on, then runs to the far station.
    { kind: 'train', mode: 'ferry', from: 300, to: 2640, y: groundY, speed: 150, carriages: 4 },
  ],

  // Duck (↓) on the roof to pass under these. Roof = groundY - 90.
  obstacles: [
    { x: 1950, y: groundY - 136, w: 60, h: 18, kind: 'footbridge' },
    { x: 2320, y: 0, w: 240, h: groundY - 118, kind: 'tunnel' },
  ],

  crossings: [
    { x: 3650, w: 90, periodMs: 5200, offsetMs: 0, warnMs: 1300, passMs: 1500 },
    { x: 3960, w: 90, periodMs: 6400, offsetMs: 2200, warnMs: 1300, passMs: 1700 },
    { x: 4270, w: 90, periodMs: 5600, offsetMs: 4000, warnMs: 1300, passMs: 1500 },
  ],

  leafPiles: [
    { x: 4740, w: 90, kind: 'plain' },
    { x: 4935, w: 96, kind: 'pit' },
    { x: 5090, w: 100, kind: 'hide' },
    { x: 5235, w: 96, kind: 'pit' },
    { x: 5340, w: 80, kind: 'plain' },
    { x: 5470, w: 100, kind: 'hide' },
    { x: 5635, w: 96, kind: 'pit' },
    { x: 5800, w: 100, kind: 'hide' },
    { x: 5990, w: 90, kind: 'plain' },
  ],

  hidingSpots: [
    // Luggage on the first island, right where the signal-box officer can see.
    { x: 3880, kind: 'crates' },
  ],

  police: [
    // Maple Halt: two officers scanning the train roofs as it passes.
    // Long cones: at train speed a player on the roof stays in view long enough to be
    // caught, so hiding between carriages matters.
    { from: 1560, to: 1560, fixed: true, facing: -1, tiltDeg: -28, lengthScale: 1.8 },
    { from: 1700, to: 1700, fixed: true, facing: 1, tiltDeg: -28, lengthScale: 1.8 },
    // Signal box over the track yard, watching the first island.
    { from: 4090, to: 4090, y: groundY - 90, fixed: true, facing: -1, tiltDeg: 30, lengthScale: 1.4 },
    // Leaf path patrol.
    { from: 5290, to: 5580, startAt: 'to' },
  ],

  // Added from level 2 on (one per DifficultySystem policeCountBonus).
  extraPolice: [
    { from: 2700, to: 3400, startAt: 'to' },
    { from: 5700, to: 6000, startAt: 'to' }, // end of the leaf path (level 3+)
  ],

  trees: [80, 540, 1120, 2700, 3540, 4520, 6080, 6320],

  flowerBeds: [
    { x: 10, w: 180 },
    { x: 2620, w: 300 },
    { x: 4560, w: 120 },
    { x: 6000, w: 320 },
  ],

  signs: [
    { x: 130, text: 'Hop on the train →' },
    { x: 3580, text: 'Trains block their view!' },
    { x: 4620, text: "Wind shows what's under the leaves" },
  ],

  hurdles: {
    train: { startX: 260, endX: 3560 },
    tracks: { startX: 3600, endX: 4460 },
    leaves: { startX: 4560, endX: 5900 },
  },

  goal: { x: 6180, label: 'Old Station' },
};
