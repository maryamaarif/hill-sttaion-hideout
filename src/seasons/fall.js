// Fall: vintage train, track crossing, leaf piles (pitfall or hiding spot).
export default {
  key: 'fall',
  name: 'Fall',
  tagline: 'All aboard the vintage train',
  palette: { skyTop: 0xf4d6a0, grass: 0x8a5a2b, accent: 0xd9531e },
  physics: { gravity: 900, runSpeed: 200, jumpVelocity: 430, friction: 1.0 },
  visibility: 1.0,
  police: { count: 3, patrolSpeed: 65, visionLength: 190, detectionTime: 1.7 },
  hidingSpots: ['carriage', 'leaf-pile'],
  trainSpeed: 120,
  hurdles: [
    { key: 'carriages', name: 'Moving Carriages' },
    { key: 'track-crossing', name: 'Track Crossing' },
    { key: 'leaf-path', name: 'Leaf Path' },
  ],
};
