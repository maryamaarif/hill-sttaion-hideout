import { LEVELS, LEVEL_SCALING_STEP, MIN_HURDLE_TIMING_MULTIPLIER } from '../config/levels.js';

// Combines a season's base police settings with the current level's difficulty.
export default class DifficultySystem {
  static forLevel(level) {
    const defined = LEVELS.find((l) => l.level === level);
    if (defined) return defined;

    const last = LEVELS[LEVELS.length - 1];
    const extra = level - last.level;
    const s = LEVEL_SCALING_STEP;
    return {
      level,
      policeCountBonus: last.policeCountBonus + s.policeCountBonus * extra,
      patrolSpeedMultiplier: last.patrolSpeedMultiplier + s.patrolSpeedMultiplier * extra,
      visionLengthMultiplier: last.visionLengthMultiplier + s.visionLengthMultiplier * extra,
      detectionSpeedMultiplier: last.detectionSpeedMultiplier + s.detectionSpeedMultiplier * extra,
      hurdleTimingMultiplier: Math.max(
        MIN_HURDLE_TIMING_MULTIPLIER,
        last.hurdleTimingMultiplier + s.hurdleTimingMultiplier * extra,
      ),
    };
  }

  static policeSettings(seasonPolice, level) {
    const d = DifficultySystem.forLevel(level);
    return {
      count: seasonPolice.count + d.policeCountBonus,
      patrolSpeed: seasonPolice.patrolSpeed * d.patrolSpeedMultiplier,
      visionLength: seasonPolice.visionLength * d.visionLengthMultiplier,
      detectionTime: seasonPolice.detectionTime / d.detectionSpeedMultiplier,
    };
  }
}
