// Difficulty numbers per level. Level 1 is deliberately easy (judges play only Level 1).
// Values are multipliers applied on top of each season's base police/hurdle settings.

export const LEVELS = [
  {
    // Judges play this one: deliberately easy.
    level: 1,
    policeCountBonus: 0,
    patrolSpeedMultiplier: 1.0,
    visionLengthMultiplier: 1.0,
    detectionSpeedMultiplier: 1.0,
    hurdleTimingMultiplier: 1.0, // < 1 = tighter windows
  },
  {
    // Noticeably harder: an extra officer per season, quicker eyes, tighter timing.
    level: 2,
    policeCountBonus: 1,
    patrolSpeedMultiplier: 1.3,
    visionLengthMultiplier: 1.25,
    detectionSpeedMultiplier: 1.45,
    hurdleTimingMultiplier: 0.85,
  },
  {
    level: 3,
    policeCountBonus: 2,
    patrolSpeedMultiplier: 1.5,
    visionLengthMultiplier: 1.4,
    detectionSpeedMultiplier: 1.8,
    hurdleTimingMultiplier: 0.75,
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
