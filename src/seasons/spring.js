import layout from './layouts/spring.js';

// Spring: chill tutorial. Few police, slow patrols, normal footing. It teaches
// without written instructions (tutorial: no hint sentences, only key icons).
export default {
  key: 'spring',
  tutorial: true,
  name: 'Spring',
  tagline: 'A calm walk through the blossoms',
  layout,
  physics: { gravity: 1250, runSpeed: 220, jumpVelocity: 530, friction: 1.0 },
  visibility: 1.0,
  police: {
    patrolSpeed: 58, visionLength: 170, visionAngleDeg: 40, detectionTime: 2.0, pauseMs: 1500,
    disguise: 'tourist', // tourists with cameras
  },
  // Rain showers: police can't see as far while it rains.
  wardrobe: {
    // Umbrella: hold the glide key (↑) in the air to float down slowly.
    outfit: {
      id: 'spring',
      name: 'Raincoat & boots',
      blurb: 'Umbrella: hold ↑ in the air to float',
      ability: 'umbrella',
      layers: {
        top: { style: 'raincoat', color: 0xf2c14e, trim: 0x3b6ea5 },
        bottom: { style: 'jeans', color: 0x4a6fa5 },
        shoes: { style: 'boots', color: 0x2f8a3a },
        hat: null,
        accessories: [{ style: 'umbrella', color: 0xd94f4a }],
      },
    },
    variants: [
      { id: 'spring-sky', name: 'Sky-blue raincoat', cost: 80, layers: { top: { color: 0x6ec6ff, trim: 0xf2c14e }, accessories: [{ style: 'umbrella', color: 0xf6b3cc }] } },
      {
        id: 'spring-camo',
        name: 'Hedge camouflage',
        camo: true,
        cost: 150,
        layers: { top: { color: 0x5fae5e, trim: 0x37702a }, bottom: { color: 0x4a6a3a }, shoes: { color: 0x37702a }, accessories: [{ style: 'umbrella', color: 0x5fae5e }] },
        effects: [{ path: 'police.detectionTime', mul: 1.12 }],
      },
    ],
    puff: { texture: 'petal' },
  },
  hidingSpots: ['bush', 'flowers'],
  hurdles: [
    { key: 'meadow', name: 'Meadow Walk' },
    { key: 'stepping-stones', name: 'Stepping Stones' },
    { key: 'flower-garden', name: 'Flower Garden' },
  ],
  ambient: {
    texture: 'petal',
    frequency: 260,
    lifespan: 9000,
    speedX: { min: -25, max: 15 },
    speedY: { min: 25, max: 55 },
    rotate: { min: 0, max: 360 },
    scale: { min: 0.7, max: 1.3 },
    alpha: { start: 0.95, end: 0.4 },
  },
  // ----- season rules you can see and hear (shared engine features) -----
  // Footsteps splash in the puddles: a medium noise ring; officers inside it turn to look.
  noise: { radius: 95, color: 0x9fd3ff, sound: 'stepSplash', particle: 'droplet', particleCount: 4, stepPx: 34 },
  // Wet footprints that dry within moments (a trail for you, police ignore them).
  traces: { texture: 'footprint', tint: 0x4f6478, alpha: 0.65, spacing: 24, lifeMs: 1600 },
  // Spring shower: officers open umbrellas and can't see as far for 10 s.
  weatherEvent: {
    kind: 'shower', name: 'Spring shower', icon: '☔',
    firstMs: 9000, everyMs: 30000, durationMs: 10000, warnMs: 1500,
    policeVisibility: 0.7, umbrellas: true,
  },
  // The guest house in the background: window boxes full of flowers.
  guestHouse: { flowerBoxes: true },
  // Picnickers strolling the meadow and garden (walk beside them to blend in).
  guests: {
    spacing: 18,
    margin: 16,
    looks: [
      { id: 'picnic-1', skin: 0xe8b98f, hair: 0x2b2018, layers: { top: { style: 'shirt', color: 0xf6b3cc, trim: 0xffffff }, bottom: { style: 'trousers', color: 0xe8e0cc }, shoes: { style: 'shoes', color: 0x8a5a3c }, hat: { style: 'sunHat', color: 0xf3e3c3, trim: 0xd94f4a } } },
      { id: 'picnic-2', skin: 0xc68c62, hair: 0x1a1410, layers: { top: { style: 'polo', color: 0x82c86f }, bottom: { style: 'jeans', color: 0x4a6a9a }, shoes: { style: 'sneakers', color: 0xffffff, trim: 0x2f6fd8 } } },
      { id: 'picnic-3', skin: 0xf2c9a0, hair: 0xb07a3a, layers: { top: { style: 'sweater', color: 0xfff176, trim: 0xffffff }, bottom: { style: 'trousers', color: 0x7a8a5a }, shoes: { style: 'shoes', color: 0x5a3a28 }, accessories: [{ style: 'camera' }] } },
    ],
  },
  // Lighting pass (art/Lighting.js): soft and fresh.
  lighting: { vignette: 0.22, bloom: 0.25, light: 0xfff2e0, lightAlpha: 0.22, tint: 0xffe4f0, tintAlpha: 0.06 },
  palette: {
    // Painterly pass: ground style, distant mountains, sun placement, lamps.
    groundStyle: 'grass',
    skyMid: 0xcfe6f4,
    sunX: 0.78,
    sunY: 86,
    mountain: 0x8fa7bf,
    mountainSnow: 0xf6f9fc,
    haze: 0xf4e4ee,
    rock: 0xa8a39a,
    rockLight: 0xcfcac0,
    rockDark: 0x7a756d,
    pit: 0x4a3426,
    lamp: 0xffe2a8,
    lampsLit: false,
    skyTop: 0xa9d8f2,
    skyBottom: 0xfde6ef,
    sun: 0xfff5d6,
    cloud: 0xffffff,
    farHill: 0xc9e6cc,
    farTree: 0xa9d2b0,
    midHill: 0xaedaa8,
    midTree: 0x8cc493,
    nearHill: 0x93cb8c,
    nearTree: 0xf3b9cf,
    grass: 0x82c86f,
    grassDark: 0x62ad59,
    dirt: 0xae835f,
    dirtDark: 0x92694b,
    water: 0x82cbe9,
    waterLight: 0xd2f0fb,
    stone: 0xb9b6ad,
    stoneLight: 0xdedbd2,
    wood: 0xc08a5c,
    woodDark: 0x8a5c3c,
    trunk: 0x8a5a44,
    blossom: 0xf6b3cc,
    blossomLight: 0xfdd7e5,
    blossomDark: 0xe48eb0,
    bush: 0x5fae5e,
    bushDark: 0x438f4b,
    bushLight: 0x86c97b,
    flowers: [0xf48fb1, 0xfff176, 0xce93d8, 0xffffff, 0xff8a80],
    house: { wall: 0xfff1de, roof: 0xd7716b, window: 0xffd889, trim: 0x9a6a52 },
  },
};
