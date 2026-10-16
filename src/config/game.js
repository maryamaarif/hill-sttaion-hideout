// Global tunables. Scenes read from here; never hard-code these values.

export const SCREEN = {
  width: 960,
  height: 540,
  background: '#1d2b3a',
};

export const LIVES = {
  start: 3,
  lossOnCaught: 1,
  lossOnHurdleFail: 1,
  gainPerHurdle: 0.5,
};

export const COINS = {
  perLife: 100,
  perHalfLife: 50,
  // Speed bonus: full bonus at or under targetSeconds, scaling to 0 at zeroBonusSeconds.
  speedBonusMax: 100,
  speedBonusTargetSeconds: 240,
  speedBonusZeroSeconds: 480,
};

export const HURDLES_PER_SEASON = 3;
