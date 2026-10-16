import layout from './layouts/winter.js';

// Winter: movement and visibility change.
//   Everywhere  low friction: the player slides and takes longer to stop
//   Ski slope   on skis: auto-run downhill (→ faster, ← slower), hop rocks and pines,
//               outrun the ski patrol
//   Ski jump    speed off the ramp sets the launch; hold Jump to glide over the gap
//   Blizzard    fog cuts view to a circle; police cones shrink; footprints show where
//               you walked and police follow them; huts and drifts hide you
// Finishing Winter completes the level.
export default {
  key: 'winter',
  name: 'Winter',
  tagline: 'Down the mountain to the guest house',
  layout,
  physics: { gravity: 1250, runSpeed: 210, jumpVelocity: 530, friction: 0.22 },
  visibility: 1.0,
  police: { patrolSpeed: 55, visionLength: 200, visionAngleDeg: 40, detectionTime: 1.6, pauseMs: 1300 },
  ski: {
    cruiseSpeed: 260,
    minSpeed: 150,
    maxSpeed: 380,
    acceleration: 420, // on the snow
    airAcceleration: 120, // speed barely changes in the air
    glideGravity: 0.4, // gravity while gliding (holding Jump after a launch)
  },
  blizzard: { radius: 170, fogColor: 0xcfdbe6, fogAlpha: 0.95, policeVisibility: 0.7, fadeDistance: 220 },
  footprints: { spacing: 26, lifeMs: 7000 },
  hidingSpots: ['hut', 'drift'],
  hurdles: [
    { key: 'ski-slope', name: 'Ski Slope', hint: '→ faster, ← slower, jump the rocks and trees' },
    { key: 'ski-jump', name: 'Ski Jump', hint: 'Full speed off the ramp, then HOLD jump!' },
    { key: 'blizzard', name: 'Blizzard', hint: 'They follow footprints. Hide in huts and drifts.' },
  ],
  ambient: {
    texture: 'snowflake',
    frequency: 90,
    lifespan: 8000,
    speedX: { min: -30, max: 10 },
    speedY: { min: 40, max: 90 },
    scale: { min: 0.5, max: 1.3 },
    alpha: { min: 0.6, max: 1 },
  },
  palette: {
    skyTop: 0x9fb6c9,
    skyBottom: 0xe8eff5,
    sun: 0xf6f8fb,
    sunRadius: 28,
    cloud: 0xf4f7fa,
    farHill: 0xdde7ef,
    farTree: 0xb4c4d1,
    midHill: 0xcddbe6,
    midTree: 0x8ea5b7,
    nearHill: 0xbccede,
    nearTree: 0x7b93a8,
    grass: 0xffffff, // snow cap
    grassDark: 0xd3dfea,
    dirt: 0xeaf1f7, // packed snow
    dirtDark: 0xc8d6e3,
    rock: 0x8c97a3,
    rockLight: 0xb8c2cc,
    rockDark: 0x626d79,
    pit: 0x4f5f70,
    stone: 0xa9b3bd,
    stoneLight: 0xd6dde4,
    wood: 0x8d6b4e,
    woodDark: 0x5e4634,
    trunk: 0x5e4a3a,
    treeStyle: 'pine',
    blossom: 0x45685c, // pine needles
    blossomLight: 0xffffff, // snow on the branches
    blossomDark: 0x2f4d44,
    bush: 0xffffff,
    bushDark: 0xd3dfea,
    bushLight: 0xffffff,
    flowers: [0xffffff, 0xdde7ef, 0xd94f4a],
    house: { wall: 0xf3e6d0, roof: 0x8a3a2e, window: 0xffc861, trim: 0x5e4634 },
    cone: 0xffe873,
    coneEdge: 0xd98a1f,
  },
};
