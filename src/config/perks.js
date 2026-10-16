// Season perks: chosen on the transition screen before a season, applied to that
// season only. Each effect multiplies (`mul`) or adds to (`add`) a number in the
// season config, addressed by a dotted path (e.g. 'physics.runSpeed').
// Keyed by the season the perk is for. Spring has none (the level starts there).

export const PERKS = {
  summer: [
    {
      key: 'light-shoes',
      name: 'Light shoes',
      desc: 'Run faster in Summer',
      icon: '👟',
      effects: [{ path: 'physics.runSpeed', mul: 1.12 }],
    },
    {
      key: 'sun-hat',
      name: 'Sun hat',
      desc: 'Stamina lasts 50% longer in the sun',
      icon: '👒',
      effects: [{ path: 'heat.staminaSeconds', mul: 1.5 }],
    },
    {
      key: 'deep-lungs',
      name: 'Deep lungs',
      desc: 'Hold your breath 40% longer',
      icon: '🫧',
      effects: [{ path: 'swim.breathSeconds', mul: 1.4 }],
    },
  ],
  fall: [
    {
      key: 'rail-pass',
      name: 'Rail pass',
      desc: 'The train runs 25% faster',
      icon: '🎫',
      effects: [{ path: 'moverSpeedScale', mul: 1.25 }],
    },
    {
      key: 'quiet-steps',
      name: 'Quiet steps',
      desc: 'Police take 25% longer to spot you',
      icon: '🤫',
      effects: [{ path: 'police.detectionTime', mul: 1.25 }],
    },
    {
      key: 'leaf-sense',
      name: 'Leaf sense',
      desc: 'Wind gusts come more often',
      icon: '🍂',
      effects: [{ path: 'wind.intervalMs', mul: 0.7 }],
    },
  ],
  winter: [
    {
      key: 'warm-coat',
      name: 'Warm coat',
      desc: 'Less slip on the snow',
      icon: '🧥',
      effects: [{ path: 'physics.friction', mul: 2 }],
    },
    {
      key: 'waxed-skis',
      name: 'Waxed skis',
      desc: 'Faster skis, longer glide',
      icon: '🎿',
      effects: [
        { path: 'ski.maxSpeed', mul: 1.08 },
        { path: 'ski.glideGravity', mul: 0.85 },
      ],
    },
    {
      key: 'lantern',
      name: 'Lantern',
      desc: 'See further in the blizzard',
      icon: '🏮',
      effects: [{ path: 'blizzard.radius', mul: 1.35 }],
    },
  ],
};
