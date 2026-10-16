import { LIVES, COINS } from '../config/game.js';

const STEP = 0.5;

// Lives as a number in half-life steps (3, 2.5, 4 …). Never below 0.
// Also converts lives to coins at the end of a level.
export default class LivesSystem {
  constructor(lives = LIVES.start) {
    this.lives = LivesSystem.snap(lives);
  }

  static snap(value) {
    return Math.max(0, Math.round(value / STEP) * STEP);
  }

  // Each change returns { before, after } so callers can animate the difference.
  change(amount) {
    const before = this.lives;
    this.lives = LivesSystem.snap(before + amount);
    return { before, after: this.lives };
  }

  loseLife(amount = LIVES.lossOnCaught) {
    return this.change(-amount);
  }

  hurdleCleared() {
    return this.change(LIVES.gainPerHurdle);
  }

  isGameOver() {
    return this.lives <= 0;
  }

  static livesToCoins(lives) {
    const full = Math.floor(lives);
    const half = lives - full >= STEP ? 1 : 0;
    return full * COINS.perLife + half * COINS.perHalfLife;
  }

  static speedBonus(seconds) {
    const { speedBonusMax, speedBonusTargetSeconds: t0, speedBonusZeroSeconds: t1 } = COINS;
    if (seconds <= t0) return speedBonusMax;
    if (seconds >= t1) return 0;
    return Math.round(speedBonusMax * (t1 - seconds) / (t1 - t0));
  }
}
