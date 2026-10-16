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

  // Season base settings × level multipliers. visionAngleDeg and pauseMs are not scaled.
  static policeSettings(seasonPolice, level) {
    const d = DifficultySystem.forLevel(level);
    return {
      ...seasonPolice,
      patrolSpeed: seasonPolice.patrolSpeed * d.patrolSpeedMultiplier,
      visionLength: seasonPolice.visionLength * d.visionLengthMultiplier,
      detectionTime: seasonPolice.detectionTime / d.detectionSpeedMultiplier,
    };
  }

  // Season config with hurdle timing tightened for the level: less breath and
  // stamina, faster moving platforms, shorter crossing warnings
  // (hurdleTimingMultiplier < 1 = harder).
  static tuneSeason(season, level) {
    const m = DifficultySystem.forLevel(level).hurdleTimingMultiplier;
    return {
      ...season,
      swim: season.swim && { ...season.swim, breathSeconds: season.swim.breathSeconds * m },
      heat: season.heat && { ...season.heat, staminaSeconds: season.heat.staminaSeconds * m },
      moverSpeedScale: 1 / m,
      hurdleTiming: m,
    };
  }
}
