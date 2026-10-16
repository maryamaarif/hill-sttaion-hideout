import layout from './layouts/fall.js';

// Fall: the vintage train around the guest house. The rules change again:
//   Train    a multi-carriage moving platform: ride the roofs, duck under bridges and
//            through a tunnel, hide in the gaps between carriages from platform officers
//   Tracks   level crossings on a timetable; a passing train is deadly but blocks
//            police vision, so move while it passes
//   Leaves   piles hide pits or hiding places; wind gusts reveal (and expose) them
export default {
  key: 'fall',
  name: 'Fall',
  tagline: 'All aboard the vintage train',
  layout,
  physics: { gravity: 1250, runSpeed: 220, jumpVelocity: 530, friction: 1.0 },
  visibility: 1.0,
  police: {
    patrolSpeed: 62, visionLength: 200, visionAngleDeg: 40, detectionTime: 1.7, pauseMs: 1300,
    disguise: 'passenger', // train passengers with newspapers
  },
  wardrobe: {
    // Earthy colours blend into autumn foliage: police notice you more slowly in
    // front of trees and leaf piles.
    outfit: {
      id: 'fall',
      name: 'Knit sweater & corduroy',
      blurb: 'Earthy colours: blend in by autumn trees',
      ability: 'foliage',
      foliage: { range: 70, detectionRate: 0.8 },
      layers: {
        top: { style: 'sweater', color: 0xb5532a, trim: 0xf2b234 },
        bottom: { style: 'corduroy', color: 0x6e4a2a },
        shoes: { style: 'ankleBoots', color: 0x3a2416 },
        hat: null,
        accessories: [{ style: 'scarf', color: 0xd9a441 }],
      },
    },
    variants: [
      { id: 'fall-plum', name: 'Plum sweater', cost: 80, layers: { top: { color: 0x7a3a5a, trim: 0xe8a868 }, accessories: [{ style: 'scarf', color: 0xe8692a }] } },
      {
        id: 'fall-camo',
        name: 'Leaf camouflage',
        camo: true,
        cost: 150,
        layers: { top: { color: 0xd9782a, trim: 0x9e2f1a }, bottom: { color: 0x8a5a2b }, accessories: [{ style: 'scarf', color: 0xc8401e }] },
        effects: [{ path: 'police.detectionTime', mul: 1.12 }],
      },
    ],
    puff: { texture: 'leaf', tint: [0xe8692a, 0xc8401e, 0xf2b234, 0xd98a2b] },
  },
  wind: { intervalMs: 5200, warnMs: 900, gustMs: 1300, firstGustMs: 1800 },
  hidingSpots: ['crates'],
  hurdles: [
    { key: 'train', name: 'Ride the Train', hint: 'Duck (↓) under bridges. Hide between carriages.' },
    { key: 'tracks', name: 'Cross the Tracks', hint: 'Red light = train coming. Move while it blocks the view.' },
    { key: 'leaves', name: 'Leaf Path', hint: 'Some piles hide holes. Watch the wind.' },
  ],
  ambient: {
    texture: 'leaf',
    frequency: 220,
    lifespan: 9000,
    speedX: { min: -30, max: 25 },
    speedY: { min: 30, max: 70 },
    rotate: { start: 0, end: 540 },
    scale: { min: 0.8, max: 1.4 },
    tint: [0xe8692a, 0xc8401e, 0xf2b234, 0xd98a2b, 0x9e2f1a],
    alpha: { start: 1, end: 0.5 },
  },
  // ----- season rules you can see and hear (shared engine features) -----
  // Dry leaves rustle loudly: the biggest noise ring of the year.
  noise: { radius: 165, color: 0xffb060, sound: 'stepRustle', particle: 'leaf', tint: [0xe8692a, 0xc8401e, 0xf2b234], particleCount: 5, particleScale: 1, stepPx: 30 },
  // Leaves scattered behind you as you walk.
  traces: { texture: 'leaf', tint: [0xe8692a, 0xc8401e, 0xf2b234, 0xd98a2b], alpha: 0.95, spacing: 26, lifeMs: 4000, scatter: true },
  // Wind gust (timing in `wind`): leaves blow off the piles, revealing hidden pits
  // and anyone hiding in them.
  weatherEvent: { kind: 'gust', name: 'Wind gust', icon: '🍃' },
  // The guest house in the background: pumpkins on the step, firewood stacked.
  guestHouse: { pumpkins: true, firewood: true },
  // Train passengers off for a walk (walk beside them to blend in).
  guests: {
    spacing: 18,
    margin: 16,
    looks: [
      { id: 'passenger-1', skin: 0xe8b98f, hair: 0x5a3a28, layers: { top: { style: 'coat', color: 0x6e4a2a, trim: 0xd9a441 }, bottom: { style: 'trousers', color: 0x3a2e28 }, shoes: { style: 'shoes', color: 0x1c1410 }, hat: { style: 'fedora', color: 0x3a2e28, trim: 0x1c1410 } } },
      { id: 'passenger-2', skin: 0xc68c62, hair: 0x1a1410, layers: { top: { style: 'sweater', color: 0x7a1f2b, trim: 0xf2b234 }, bottom: { style: 'corduroy', color: 0x5a4636 }, shoes: { style: 'ankleBoots', color: 0x2a1c14 }, accessories: [{ style: 'scarf', color: 0xf2b234 }] } },
      { id: 'passenger-3', skin: 0xf2c9a0, hair: 0x8a5a34, layers: { top: { style: 'trench', color: 0x9a8a6a }, bottom: { style: 'trousers', color: 0x4a4a52 }, shoes: { style: 'shoes', color: 0x2a2a2e }, hat: { style: 'beanie', color: 0xc8401e, trim: 0xf2b234 } } },
    ],
  },
  // Lighting pass (art/Lighting.js): warm golden hour.
  lighting: { vignette: 0.32, bloom: 0.16, light: 0xffc46a, lightAlpha: 0.26, tint: 0xffb060, tintAlpha: 0.1 },
  palette: {
    groundStyle: 'dry',
    skyMid: 0xc6c8c4,
    sunX: 0.24,
    sunY: 104,
    mountain: 0x9a8aa0,
    mountainSnow: 0xfbeee0,
    haze: 0xf8d6ac,
    lamp: 0xffcf7a,
    lampsLit: true,
    skyTop: 0x7fb6dc,
    skyBottom: 0xfbd7a6,
    sun: 0xffe2a0,
    sunRadius: 34,
    cloud: 0xfff4e6,
    farHill: 0xe9b47a,
    farTree: 0xd8894a,
    midHill: 0xd98a4a,
    midTree: 0xb0502a,
    nearHill: 0xb9683a,
    nearTree: 0xd9452a,
    grass: 0xc2a04a,
    grassDark: 0x93752f,
    dirt: 0x8f6340,
    dirtDark: 0x6f4a2e,
    rock: 0x9c8a78,
    rockLight: 0xc2b29e,
    rockDark: 0x6e5f52,
    pit: 0x3a2416,
    stone: 0xb8ada0,
    stoneLight: 0xdcd2c4,
    wood: 0xb07a48,
    woodDark: 0x6e4a2a,
    roof: 0x7a1f2b,
    trunk: 0x5e3b26,
    blossom: 0xe8692a,
    blossomLight: 0xf6b13c,
    blossomDark: 0xb53a1f,
    treeSpeckle: 0xffe08a,
    bush: 0xc8401e,
    bushDark: 0x9e2f1a,
    bushLight: 0xf2b234,
    leaves: [0xe8692a, 0xc8401e, 0xf2b234, 0xd98a2b, 0x9e2f1a],
    flowers: [0xe8692a, 0xc8401e, 0xf2b234, 0xd98a2b, 0x9e2f1a],
    house: { wall: 0xfff1de, roof: 0x9e2f1a, window: 0xffd889, trim: 0x6e4a2a },
    // Cream cones with a blue edge stand out against orange and red scenery.
    cone: 0xfff6d8,
    coneEdge: 0x2f6fd8,
  },
};
