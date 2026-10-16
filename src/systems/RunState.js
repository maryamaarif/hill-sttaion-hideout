import { LIVES } from '../config/game.js';

// The data passed between scenes during one level: which level/season we are on,
// lives carried between seasons, perks chosen on transition screens, and when the
// level started (for the speed bonus).
export function newLevelRun(level, now) {
  return { level, seasonIndex: 0, lives: LIVES.start, perks: [], startTime: now };
}
