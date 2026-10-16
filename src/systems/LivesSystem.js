import { LIVES, COINS } from '../config/game.js';

// Tracks lives in half-life steps and converts them to coins at level end.
export default class LivesSystem {
  constructor(lives = LIVES.start) {
    this.lives = lives;
  }

  loseLife() {
    this.lives = Math.max(0, this.lives - LIVES.lossOnCaught);
    return this.lives;
  }

  hurdleCleared() {
    this.lives += LIVES.gainPerHurdle;
    return this.lives;
  }

  isGameOver() {
    return this.lives <= 0;
  }

  static livesToCoins(lives) {
    const full = Math.floor(lives);
    const half = lives - full >= 0.5 ? 1 : 0;
    return full * COINS.perLife + half * COINS.perHalfLife;
  }

  static speedBonus(seconds) {
    const { speedBonusMax, speedBonusTargetSeconds: t0, speedBonusZeroSeconds: t1 } = COINS;
    if (seconds <= t0) return speedBonusMax;
    if (seconds >= t1) return 0;
    return Math.round(speedBonusMax * (t1 - seconds) / (t1 - t0));
  }
}
