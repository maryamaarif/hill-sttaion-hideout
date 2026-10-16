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
  weather: { rain: { firstMs: 9000, everyMs: 22000, durationMs: 8000, policeVisibility: 0.85 } },
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
  palette: {
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
