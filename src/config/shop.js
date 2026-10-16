// The guest-house shop (HubScene). Prices in coins.
//
// ROOM_UPGRADES  cosmetic; each one visibly changes the room (src/art/Room.js).
// ITEMS          bought for the next level and used up when it starts. `effects`
//                change season config numbers by dotted path, like perks (applied
//                to every season); `map` shows police routes at each season start.
// HIDING_PLACES  permanent unlocks: an extra hiding spot added to one season's layout.

export const ROOM_UPGRADES = [
  { key: 'bed', name: 'Patchwork quilt', icon: '🛏️', cost: 120, desc: 'A warm quilt and soft pillows on the bare bed.' },
  { key: 'rug', name: 'Woven rug', icon: '🧶', cost: 80, desc: 'A round rug for the cold floorboards.' },
  { key: 'plants', name: 'House plants', icon: '🪴', cost: 100, desc: 'A little green in every corner.' },
  { key: 'painting', name: 'Four Seasons painting', icon: '🖼️', cost: 150, desc: 'A painting of the hills in all four seasons.' },
  { key: 'window', name: 'Window view', icon: '🪟', cost: 180, desc: 'Curtains open onto a view of the hills.' },
  { key: 'fireplace', name: 'Fireplace', icon: '🔥', cost: 220, desc: 'Light the fire. The whole room warms up.' },
];

export const ITEMS = [
  {
    key: 'disguise-hat',
    name: 'Disguise hat',
    icon: '🎩',
    cost: 120,
    desc: 'Police take 30% longer to recognise you.',
    effects: [{ path: 'police.detectionTime', mul: 1.3 }],
  },
  {
    key: 'running-shoes',
    name: 'Running shoes',
    icon: '👟',
    cost: 100,
    desc: 'Run 10% faster in every season.',
    effects: [
      { path: 'physics.runSpeed', mul: 1.1 },
      { path: 'ski.maxSpeed', mul: 1.05 },
    ],
  },
  {
    key: 'thermos',
    name: 'Thermos',
    icon: '🧉',
    cost: 80,
    desc: 'Stamina and breath last 40% longer.',
    effects: [
      { path: 'heat.staminaSeconds', mul: 1.4 },
      { path: 'swim.breathSeconds', mul: 1.4 },
    ],
  },
  {
    key: 'map',
    name: 'Map',
    icon: '🗺️',
    cost: 60,
    desc: 'Shows every police route for a few seconds at the start of each season.',
    map: true,
  },
];

// How long the Map shows police routes (ms).
export const MAP_SHOW_MS = 6000;

export const HIDING_PLACES = [
  {
    key: 'garden-shed',
    season: 'spring',
    name: 'Garden shed (Spring)',
    icon: '🌸',
    cost: 120,
    desc: 'A potting shed at the edge of the flower garden.',
    spot: { x: 3290, kind: 'shed' },
  },
  {
    key: 'boathouse',
    season: 'summer',
    name: 'Lakeside hut (Summer)',
    icon: '☀️',
    cost: 150,
    desc: 'A little boat hut on the lake shore, before the swim.',
    spot: { x: 3870, kind: 'boathouse' },
  },
  {
    key: 'hollow-tree',
    season: 'fall',
    name: 'Hollow tree (Fall)',
    icon: '🍂',
    cost: 150,
    desc: 'An old hollow oak between the tracks and the leaf path.',
    spot: { x: 4400, kind: 'hollowTree' },
  },
  {
    key: 'ice-cave',
    season: 'winter',
    name: 'Ice cave (Winter)',
    icon: '❄️',
    cost: 150,
    desc: 'A small ice cave in the middle of the blizzard.',
    spot: { x: 4290, kind: 'iceCave' },
  },
];
