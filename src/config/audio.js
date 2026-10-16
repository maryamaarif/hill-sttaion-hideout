// Sound effects are synthesised with Web Audio (no audio files needed).
// Each effect is a list of notes: { freq, to?, type, start, duration, gain, noise? }
//   freq/to   start and end frequency in Hz (to = pitch slide)
//   start     seconds after the effect is triggered
//   noise     true = filtered white noise instead of an oscillator (freq = filter cutoff)

export const AUDIO = {
  sfxVolume: 0.35,
};

export const SFX = {
  // Hurdle cleared: bright rising arpeggio.
  chime: [
    { freq: 1047, type: 'triangle', start: 0, duration: 0.18, gain: 0.5 },
    { freq: 1319, type: 'triangle', start: 0.08, duration: 0.18, gain: 0.5 },
    { freq: 1568, type: 'triangle', start: 0.16, duration: 0.35, gain: 0.55 },
    { freq: 2093, type: 'sine', start: 0.16, duration: 0.4, gain: 0.2 },
  ],
  // Heart lands in the HUD.
  pop: [{ freq: 660, to: 990, type: 'sine', start: 0, duration: 0.1, gain: 0.4 }],
  // Caught by police: two falling notes.
  caught: [
    { freq: 523, to: 494, type: 'square', start: 0, duration: 0.14, gain: 0.25 },
    { freq: 392, to: 330, type: 'square', start: 0.15, duration: 0.3, gain: 0.25 },
  ],
  // Fell in water.
  splash: [
    { freq: 1800, noise: true, start: 0, duration: 0.35, gain: 0.6 },
    { freq: 300, to: 120, type: 'sine', start: 0, duration: 0.25, gain: 0.35 },
  ],
  // Fell out of the world / other hurdle failure.
  hit: [{ freq: 220, to: 80, type: 'square', start: 0, duration: 0.3, gain: 0.25 }],
  // Lives reached 0.
  gameOver: [
    { freq: 392, type: 'triangle', start: 0, duration: 0.25, gain: 0.4 },
    { freq: 330, type: 'triangle', start: 0.25, duration: 0.25, gain: 0.4 },
    { freq: 262, to: 196, type: 'triangle', start: 0.5, duration: 0.6, gain: 0.4 },
  ],
  // Dropped into swimmable water.
  splashSoft: [{ freq: 1200, noise: true, start: 0, duration: 0.25, gain: 0.35 }],
  // Started a dive.
  dive: [
    { freq: 500, to: 900, type: 'sine', start: 0, duration: 0.08, gain: 0.25 },
    { freq: 700, to: 1200, type: 'sine', start: 0.07, duration: 0.08, gain: 0.2 },
  ],
  // Out of breath: forced to surface.
  gasp: [{ freq: 1500, to: 600, noise: true, start: 0, duration: 0.3, gain: 0.45 }],
  // Too long in the sun.
  faint: [{ freq: 600, to: 150, type: 'triangle', start: 0, duration: 0.6, gain: 0.35 }],
  // Hit an obstacle.
  bonk: [{ freq: 160, to: 90, type: 'square', start: 0, duration: 0.12, gain: 0.3 }],
  // Menu selection.
  select: [{ freq: 880, type: 'sine', start: 0, duration: 0.08, gain: 0.3 }],
};
