// Difficulty numbers per level. Level 1 is deliberately easy (judges play only Level 1).
// Values are multipliers applied on top of each season's base police/hurdle settings.

export const LEVELS = [
  {
    level: 1,
    policeCountBonus: 0,
    patrolSpeedMultiplier: 1.0,
    visionLengthMultiplier: 1.0,
    detectionSpeedMultiplier: 1.0,
    hurdleTimingMultiplier: 1.0, // < 1 = tighter windows
  },
  {
    level: 2,
    policeCountBonus: 1,
    patrolSpeedMultiplier: 1.2,
    visionLengthMultiplier: 1.15,
    detectionSpeedMultiplier: 1.25,
    hurdleTimingMultiplier: 0.9,
  },
  {
    level: 3,
    policeCountBonus: 2,
    patrolSpeedMultiplier: 1.4,
    visionLengthMultiplier: 1.3,
    detectionSpeedMultiplier: 1.5,
    hurdleTimingMultiplier: 0.8,
  },
];

// Beyond the last defined level, keep scaling by this step per extra level.
export const LEVEL_SCALING_STEP = {
  policeCountBonus: 1,
  patrolSpeedMultiplier: 0.1,
  visionLengthMultiplier: 0.1,
  detectionSpeedMultiplier: 0.15,
  hurdleTimingMultiplier: -0.05,
};

export const MIN_HURDLE_TIMING_MULTIPLIER = 0.5;
