// Summer: quarry, river canoe, lake swim (breath meter, dive to hide).
export default {
  key: 'summer',
  name: 'Summer',
  tagline: 'Quarry, canoe and lake',
  colors: { sky: 0x8fd3ff, ground: 0xc9a46b, accent: 0x2f8fd8 },
  physics: { gravity: 900, runSpeed: 210, jumpVelocity: 440, friction: 1.0 },
  visibility: 1.0,
  police: { count: 3, patrolSpeed: 60, visionLength: 180, detectionTime: 1.8 },
  hidingSpots: ['rock', 'underwater'],
  breathSeconds: 6,
  hurdles: [
    { key: 'quarry', name: 'Quarry Gaps' },
    { key: 'canoe', name: 'Canoe Run' },
    { key: 'swim', name: 'Lake Swim' },
  ],
};
