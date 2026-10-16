// Spring: chill tutorial. Few police, slow patrols, normal footing.
export default {
  key: 'spring',
  name: 'Spring',
  tagline: 'A calm walk through the meadow',
  colors: { sky: 0xbfe8ff, ground: 0x6cbf4a, accent: 0xf7a8c8 },
  physics: { gravity: 900, runSpeed: 200, jumpVelocity: 420, friction: 1.0 },
  visibility: 1.0,
  police: { count: 2, patrolSpeed: 50, visionLength: 160, detectionTime: 2.0 },
  hidingSpots: ['bush'],
  hurdles: [
    { key: 'meadow', name: 'Meadow Walk' },
    { key: 'stepping-stones', name: 'Stepping Stones' },
    { key: 'flower-garden', name: 'Flower Garden' },
  ],
};
