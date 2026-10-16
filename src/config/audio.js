// Sound effects are synthesised with Web Audio (no audio files needed).
// Each effect is a list of notes: { freq, to?, type, start, duration, gain, noise? }
//   freq/to   start and end frequency in Hz (to = pitch slide)
//   start     seconds after the effect is triggered
//   noise     true = filtered white noise instead of an oscillator (freq = filter cutoff)

export const AUDIO = {
  sfxVolume: 0.35, // base loudness of effects (the SFX slider scales this)
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
  // Level-crossing bell (signal turns red).
  bell: [
    { freq: 1320, type: 'triangle', start: 0, duration: 0.18, gain: 0.3 },
    { freq: 1320, type: 'triangle', start: 0.3, duration: 0.18, gain: 0.3 },
    { freq: 1320, type: 'triangle', start: 0.6, duration: 0.18, gain: 0.3 },
  ],
  // A train rushing through a crossing.
  rumble: [
    { freq: 400, noise: true, start: 0, duration: 1.2, gain: 0.45 },
    { freq: 70, to: 55, type: 'sawtooth', start: 0, duration: 1.2, gain: 0.15 },
  ],
  // Wind gust over the leaf path.
  whoosh: [{ freq: 3000, to: 500, noise: true, start: 0, duration: 1.4, gain: 0.35 }],
  // Off the ski-jump ramp.
  launch: [
    { freq: 300, to: 900, type: 'triangle', start: 0, duration: 0.35, gain: 0.3 },
    { freq: 2500, to: 800, noise: true, start: 0, duration: 0.5, gain: 0.25 },
  ],
  // Jump: a quick upward blip.
  jump: [{ freq: 360, to: 620, type: 'triangle', start: 0, duration: 0.09, gain: 0.22 }],
  // Tucking into a hiding spot: a soft rustle.
  hide: [{ freq: 2200, to: 700, noise: true, start: 0, duration: 0.18, gain: 0.3 }],
  // An officer starts to notice you ("?").
  suspect: [{ freq: 660, to: 760, type: 'sine', start: 0, duration: 0.12, gain: 0.2 }],
  // Detected ("!"): sharp double sting.
  alert: [
    { freq: 1180, type: 'square', start: 0, duration: 0.07, gain: 0.22 },
    { freq: 1580, type: 'square', start: 0.08, duration: 0.12, gain: 0.22 },
  ],
  // Half life gained: sparkly rising notes.
  heart: [
    { freq: 1319, type: 'sine', start: 0, duration: 0.08, gain: 0.3 },
    { freq: 1760, type: 'sine', start: 0.06, duration: 0.08, gain: 0.3 },
    { freq: 2637, type: 'sine', start: 0.12, duration: 0.18, gain: 0.25 },
  ],
  // One tick of the coin counter.
  coin: [{ freq: 1760, to: 2100, type: 'square', start: 0, duration: 0.04, gain: 0.12 }],
  // Season change: a rising sweep and a bright chord.
  seasonChange: [
    { freq: 2500, to: 600, noise: true, start: 0, duration: 0.8, gain: 0.25 },
    { freq: 523, type: 'triangle', start: 0.35, duration: 0.6, gain: 0.25 },
    { freq: 659, type: 'triangle', start: 0.45, duration: 0.6, gain: 0.25 },
    { freq: 784, type: 'triangle', start: 0.55, duration: 0.7, gain: 0.25 },
  ],
  // Umbrella opening (Spring outfit).
  umbrella: [{ freq: 900, to: 400, noise: true, start: 0, duration: 0.18, gain: 0.3 }],
  // Outfit change: a quick swish and sparkle.
  outfit: [
    { freq: 3000, to: 800, noise: true, start: 0, duration: 0.3, gain: 0.25 },
    { freq: 1047, type: 'sine', start: 0.15, duration: 0.12, gain: 0.2 },
    { freq: 1568, type: 'sine', start: 0.24, duration: 0.16, gain: 0.2 },
  ],
  // Menu selection.
  select: [{ freq: 880, type: 'sine', start: 0, duration: 0.08, gain: 0.3 }],

  // Footsteps by season (season.noise.sound): how loud the ground is.
  stepSplash: [
    { freq: 2600, to: 900, noise: true, start: 0, duration: 0.09, gain: 0.22 },
    { freq: 520, to: 260, type: 'sine', start: 0, duration: 0.06, gain: 0.08 },
  ],
  stepCrunch: [
    { freq: 3800, noise: true, start: 0, duration: 0.05, gain: 0.2 },
    { freq: 2400, noise: true, start: 0.04, duration: 0.05, gain: 0.14 },
  ],
  stepRustle: [
    { freq: 5200, to: 2200, noise: true, start: 0, duration: 0.16, gain: 0.26 },
    { freq: 3400, to: 1500, noise: true, start: 0.07, duration: 0.14, gain: 0.18 },
  ],
  stepSnow: [{ freq: 900, to: 500, noise: true, start: 0, duration: 0.08, gain: 0.08 }],
  // An officer heard something and turns to look.
  hear: [{ freq: 520, to: 620, type: 'triangle', start: 0, duration: 0.1, gain: 0.16 }],
  // A weather event begins (shower, heatwave, gust, blizzard).
  weather: [
    { freq: 1800, to: 700, noise: true, start: 0, duration: 0.7, gain: 0.2 },
    { freq: 392, type: 'triangle', start: 0.1, duration: 0.35, gain: 0.18 },
    { freq: 330, type: 'triangle', start: 0.3, duration: 0.45, gain: 0.18 },
  ],
};
