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

// Player feel. Season physics (gravity, runSpeed, jumpVelocity, friction) layer on top.
export const PLAYER = {
  acceleration: 1600, // px/s² toward target speed on ground (scaled by season friction)
  deceleration: 2000, // px/s² back to 0 with no input (scaled by season friction)
  airControl: 0.6, // multiplier on accel/decel while airborne
  coyoteMs: 110, // can still jump this long after walking off a ledge
  jumpBufferMs: 130, // a jump pressed this early before landing still fires
  jumpCutMultiplier: 0.45, // releasing jump early multiplies upward speed by this
  maxFallSpeed: 760,
  crouchSpeedMultiplier: 0.35,
  walkAnimThreshold: 25, // px/s
  body: { width: 16, height: 38, crouchHeight: 24 },
};

export const RESPAWN = {
  delayMs: 650, // pause after failing before the player reappears
  inputLockMs: 300, // controls ignored right after respawn
  dropHeight: 80, // respawn this far above ground
  offsetX: 40, // respawn this far past the checkpoint line
  killMarginY: 60, // fall this far below the screen = failed
  graceMs: 1200, // police cannot see the player this long after respawning
};

// Shared officer behaviour. Speed, cone size and detection time come from the
// season config scaled by the level (see DifficultySystem).
export const POLICE = {
  eyeHeight: 40, // cone origin above the ground
  coneTiltDeg: 7, // cone aims slightly down toward the path
  coneStepDeg: 4, // arc smoothness when drawing
  drainRate: 1.3, // meter empties this many times faster than it fills
  alarmAt: 0.6, // meter level where "?" turns into "!"
  stopWhenSuspicious: true, // officer halts while they can see the player
  coneColor: 0xffe873,
  coneEdgeColor: 0xd9a92b,
  alertColor: 0xff5a4a,
  coneAlpha: 0.38,
  meterWidth: 36,
  meterOffsetY: 64, // meter sits this far above the officer's feet
};

export const CAMERA = {
  lerp: 0.09,
  lookAheadX: 90,
};

export const UI = {
  font: '"Trebuchet MS", Verdana, sans-serif',
  textColor: '#ffffff',
  strokeColor: '#3b2a20',
  bannerHoldMs: 1900,
  heartSize: 22,
};

export const DEPTH = {
  sky: -100,
  clouds: -95,
  far: -90,
  mid: -80,
  near: -70,
  decorBack: -10,
  terrain: 0,
  decor: 5,
  cone: 6,
  police: 9,
  player: 10,
  water: 15,
  foreground: 20,
  ambient: 30,
  popup: 40,
  hud: 1000,
};

export const DEBUG = {
  physics: false, // true = draw physics bodies and trigger zones
};
