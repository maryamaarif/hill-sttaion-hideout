// Winter: ski run. Low friction, speed builds, blizzard cuts visibility for everyone.
export default {
  key: 'winter',
  name: 'Winter',
  tagline: 'Down the ski run',
  palette: { skyTop: 0xdfe9f3, grass: 0xffffff, accent: 0x4a6fa5 },
  physics: { gravity: 900, runSpeed: 240, jumpVelocity: 420, friction: 0.15 },
  visibility: 1.0,
  blizzardVisibility: 0.35,
  police: { patrolSpeed: 55, visionLength: 200, visionAngleDeg: 40, detectionTime: 1.8, pauseMs: 1200 },
  hidingSpots: ['snow-hut'],
  hurdles: [
    { key: 'slalom', name: 'Slalom' },
    { key: 'ski-jump', name: 'Ski Jump' },
    { key: 'blizzard', name: 'Blizzard' },
  ],
};
