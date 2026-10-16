import layout from './layouts/summer.js';

// Summer: the rules change, not just the colours.
//   Quarry   heat: standing still in the sun drains stamina; overhangs give shade
//   Canoe    moving platforms carry the player; snags must be jumped; reeds hide
//   Lake     water is swimmable; Down dives (hidden) at the cost of breath
// Police are a little faster and more alert than in Spring.
export default {
  key: 'summer',
  name: 'Summer',
  tagline: 'Quarry, canoe and lake',
  layout,
  physics: { gravity: 1250, runSpeed: 225, jumpVelocity: 540, friction: 1.0 },
  visibility: 1.0,
  police: {
    patrolSpeed: 62, visionLength: 190, visionAngleDeg: 40, detectionTime: 1.8, pauseMs: 1300,
    disguise: 'beach', // beachgoers with towels
  },
  wardrobe: {
    // Light clothes: the fastest run of the year.
    outfit: {
      id: 'summer',
      name: 'Tee, shorts & sun hat',
      blurb: 'Light clothes: fastest run of the year',
      effects: [{ path: 'physics.runSpeed', mul: 1.1 }],
      layers: {
        top: { style: 'tshirt', color: 0xff8c42, trim: 0xffffff },
        bottom: { style: 'shorts', color: 0x2f8fd8 },
        shoes: { style: 'sneakers', color: 0xffffff, trim: 0xd94f4a },
        hat: { style: 'sunHat', color: 0xf2d77e, trim: 0xd94f4a },
        accessories: [{ style: 'sunglasses', color: 0x1e1e22 }],
      },
    },
    variants: [
      { id: 'summer-tropical', name: 'Tropical tee', cost: 80, layers: { top: { color: 0x37c4b0, trim: 0xffd23f }, bottom: { color: 0xf2b234 } } },
      {
        id: 'summer-camo',
        name: 'Sand camouflage',
        camo: true,
        cost: 150,
        layers: { top: { color: 0xdcb46a, trim: 0xa98140 }, bottom: { color: 0xa98140 }, hat: { color: 0xecc987, trim: 0xa98140 } },
        effects: [{ path: 'police.detectionTime', mul: 1.12 }],
      },
    ],
    // Automatic changes for the water hurdles.
    swaps: {
      canoe: { layers: { top: { style: 'lifejacket', color: 0xff6a00, trim: 0x3b2a20 } } },
      swim: {
        layers: {
          top: { style: 'swimsuit', color: 0x2f8fd8 },
          bottom: { style: 'swim', color: 0x2f8fd8 },
          shoes: { style: 'bare' },
          hat: null,
          accessories: [{ style: 'goggles', color: 0x6ec6ff }],
        },
      },
    },
    puff: { texture: 'sparkle' },
  },
  heat: { staminaSeconds: 6, regenPerSec: 0.45, warnAt: 0.45, glareAlpha: 0.07 },
  swim: {
    breathSeconds: 6,
    refillPerSec: 0.5,
    speedMultiplier: 0.6,
    diveSpeedMultiplier: 0.5,
    diveDepth: 72, // body bottom this far below the surface when diving
    relockAt: 0.35, // after running out, can dive again once breath is back to this
  },
  hidingSpots: ['overhang', 'reeds'],
  hurdles: [
    { key: 'quarry', name: 'Quarry Hurdles', hint: 'Keep moving. Rest in the shade.' },
    { key: 'canoe', name: 'Canoe Run', hint: 'Jump the snags. Reeds hide you.' },
    { key: 'swim', name: 'Lake Swim', hint: 'Hold ↓ to dive. Watch your breath!' },
  ],
  // Sunlit dust motes drifting low over the ground.
  ambientExtra: [{
    texture: 'dust',
    frequency: 140,
    lifespan: 5000,
    y: { min: 300, max: 500 },
    speedX: { min: 6, max: 24 },
    speedY: { min: -10, max: 4 },
    scale: { min: 0.5, max: 1.3 },
    alpha: { values: [0, 0.75, 0] },
    tint: 0xfff2c4,
  }],
  ambient: {
    texture: 'seed',
    frequency: 380,
    lifespan: 7000,
    y: { min: 40, max: 360 },
    speedX: { min: 15, max: 45 },
    speedY: { min: -12, max: 8 },
    rotate: { min: 0, max: 360 },
    scale: { min: 0.7, max: 1.2 },
    alpha: { start: 0.9, end: 0 },
  },
  // ----- season rules you can see and hear (shared engine features) -----
  // Gravel crunches: a noise ring a little bigger than Spring's.
  noise: { radius: 105, color: 0xffe6a0, particle: 'dust', tint: 0xe8c890, particleCount: 4, stepPx: 30 },
  // No traces on dry rock and sand.
  traces: null,
  // Heatwave: for 10 s stamina drains twice as fast standing in the sun, and even
  // moving in the sun drains it. Shade matters.
  weatherEvent: {
    kind: 'heatwave', name: 'Heatwave', icon: '🌡️',
    startX: 520, everyMs: 30000, durationMs: 10000, warnMs: 1500,
    heatDrain: 2, movingDrain: 0.35, overlay: { color: 0xff9a3a, alpha: 0.12 },
  },
  // The guest house in the background: windows thrown open and a parasol out.
  guestHouse: { openWindows: true, parasol: true },
  // Swimmers in the lake and sunbathers on the shore (swim or walk beside them).
  guests: {
    spacing: 22,
    margin: 18,
    swimDepth: 30,
    looks: [
      { id: 'swim-1', skin: 0xe8b98f, hair: 0x2b2018, layers: { top: { style: 'swimsuit', color: 0xff5e78 }, bottom: { style: 'swim', color: 0xff5e78 }, shoes: { style: 'bare' } } },
      { id: 'swim-2', skin: 0xb07a52, hair: 0x1a1410, layers: { bottom: { style: 'swim', color: 0x2f6fd8 }, shoes: { style: 'bare' }, hat: { style: 'cap', color: 0xffffff } } },
      { id: 'swim-3', skin: 0xf2c9a0, hair: 0xd9a441, layers: { top: { style: 'tshirt', color: 0x6ec6ff }, bottom: { style: 'shorts', color: 0xffd23f }, shoes: { style: 'flipflops' }, hat: { style: 'sunHat', color: 0xf6e7c1, trim: 0x2f6fd8 } } },
    ],
  },
  // Footstep sound on this season's ground (config/audio.js STEPS); quarry rock,
  // platforms and moving platforms have their own surfaces.
  footsteps: 'grass',
  // Ambience (generated): cicadas (louder in the heatwave) and water lapping.
  ambience: {
    layers: [
      { kind: 'cicadas', gain: 0.035, eventGain: 0.1, freq: 5200, pulse: 38, swellSec: 9 },
      { kind: 'water', gain: 0.07, cutoff: 500, rate: 0.22 },
      { kind: 'laps', gain: 0.05, every: [2, 4.5] },
      { kind: 'birds', gain: 0.12, every: [4, 9], species: ['chirp'], reverb: 0.3 },
    ],
  },
  // Lighting pass (art/Lighting.js): bright and saturated.
  lighting: { vignette: 0.22, bloom: 0.16, light: 0xfff6c0, lightAlpha: 0.2 },
  palette: {
    groundStyle: 'grass',
    skyMid: 0x6cc0f4,
    sunX: 0.82,
    sunY: 70,
    mountain: 0x7f9fc0,
    mountainSnow: 0xf2f7fb,
    haze: 0xd8f1ff,
    lamp: 0xfff0b0,
    lampsLit: false,
    skyTop: 0x1f93ec,
    skyBottom: 0xc4ecff,
    sun: 0xfff27a,
    sunRadius: 48,
    cloud: 0xffffff,
    farHill: 0xf2d77e,
    farTree: 0xd9b95a,
    midHill: 0xe8c24e,
    midTree: 0x8cbf3f,
    nearHill: 0xb5d64e,
    nearTree: 0x4f9f34,
    grass: 0x78c43c,
    grassDark: 0x56992a,
    dirt: 0xc99a5b,
    dirtDark: 0xa87a42,
    rock: 0xdcb46a,
    rockLight: 0xf6dc9c,
    rockDark: 0xa98140,
    cliff: 0xecc987,
    cliffLight: 0xfbe6b4,
    cliffDark: 0xd2ad68,
    pit: 0x5a3d22,
    water: 0x1d8fe3,
    waterDeep: 0x0f6fc6,
    waterLight: 0xa6e6ff,
    stone: 0xc9c3b4,
    stoneLight: 0xeae4d5,
    wood: 0xc68a4c,
    woodDark: 0x8a5a2e,
    trunk: 0x8a5a34,
    blossom: 0x5fb33a,
    blossomLight: 0x9ad65c,
    blossomDark: 0x3f8c2a,
    treeSpeckle: 0xfff3a0,
    bush: 0x5fae4a,
    bushDark: 0x3f8a3a,
    bushLight: 0x8fd062,
    reed: 0x9cc94f,
    reedDark: 0x5f9230,
    reedTip: 0x7a4a24,
    flowers: [0xffd23f, 0xff8c42, 0xffffff, 0xff5e78, 0x6ec6ff],
    house: { wall: 0xfff6e0, roof: 0xe0573f, window: 0x7fd3ff, trim: 0x9a6a42 },
    cone: 0xffffff, // white cones read better than yellow against golden hills
    coneEdge: 0xff6a00,
  },
};
