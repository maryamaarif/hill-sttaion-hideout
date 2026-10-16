import { DEPTH } from '../config/game.js';

// Footstep noise by season (season.noise). Moving on the ground makes a ring of
// noise around the player's feet; every officer whose feet are inside it turns to
// look toward the sound (Police.hear). Hiding, standing still or walking inside a
// crowd of guests makes no noise. The ring size is the season's rule:
//   Spring puddles splash, Summer gravel crunches, Fall leaves rustle (big ring),
//   Winter snow is quiet (small ring) but leaves deep footprints (see TraceSystem).
//
// season.noise: { radius, color, sound, particle?, tint?, stepPx, onSkis? }
//   radius    ring radius in px at full running speed (smaller when moving slowly)
//   sound     SFX key played on each step (config/audio.js)
//   particle  texture kicked up at the feet on each step (droplet, dust, leaf, ...)
//   stepPx    distance between steps
//   onSkis    true = skiing makes noise too (default: no)
export default class NoiseSystem {
  constructor(scene, config, audio) {
    this.scene = scene;
    this.config = config ?? null;
    this.audio = audio;
    this.radius = 0;
    this.lastStepX = null;
    if (!this.config) return;
    this.ring = scene.add.graphics().setDepth(DEPTH.terrain + 3);
    if (config.particle) {
      this.kick = scene.add.particles(0, 0, config.particle, {
        speedX: { min: -40, max: 40 },
        speedY: { min: -90, max: -40 },
        gravityY: 380,
        scale: { start: config.particleScale ?? 0.8, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        rotate: { min: 0, max: 360 },
        lifespan: 520,
        tint: config.tint ?? 0xffffff,
        emitting: false,
      }).setDepth(DEPTH.player + 1);
    }
  }

  // Updates the ring and returns the officers who heard a step this frame.
  update(time, player, police, { quiet = false, runSpeed = 220 } = {}) {
    if (!this.config) return [];
    const cfg = this.config;
    const vx = Math.abs(player.body.velocity.x);
    const making = !quiet && player.onGround && !player.hidden && !player.swimming && player.visible
      && vx > 40 && (!player.skiing || cfg.onSkis);
    const target = making ? cfg.radius * Math.min(1, Math.max(0.45, vx / runSpeed)) : 0;
    // Ease the ring in and out so it never pops.
    this.radius += (target - this.radius) * 0.2;
    if (this.radius < 2) this.radius = 0;

    const heard = [];
    const feet = player.body.bottom;
    if (making && (this.lastStepX === null || Math.abs(player.x - this.lastStepX) >= cfg.stepPx)) {
      this.lastStepX = player.x;
      if (cfg.sound) this.audio?.play(cfg.sound);
      this.kick?.explode(cfg.particleCount ?? 3, player.x, feet - 2);
      this.pulse = { t: time };
      for (const officer of police) {
        const dx = Math.abs(officer.x - player.x);
        const dy = Math.abs(officer.groundY - feet);
        // Hearing uses the real noise radius; only the drawn ring eases in and out.
        if (dx <= target && dy < 140 && officer.hear(player.x, time)) heard.push(officer);
      }
    }
    if (!making) this.lastStepX = null;
    this.draw(time, player.x, feet);
    return heard;
  }

  // A flattened ring on the ground, plus a ripple on each step.
  draw(time, x, y) {
    this.ring.clear();
    if (!this.radius) return;
    const r = this.radius;
    const c = this.config.color ?? 0xffffff;
    this.ring.lineStyle(2.5, c, 0.55).strokeEllipse(x, y, r * 2, r * 0.5);
    this.ring.fillStyle(c, 0.1).fillEllipse(x, y, r * 2, r * 0.5);
    const age = this.pulse ? (time - this.pulse.t) / 450 : 1;
    if (age < 1) this.ring.lineStyle(2, c, 0.5 * (1 - age)).strokeEllipse(x, y, r * 2 * (0.4 + age * 0.6), r * 0.5 * (0.4 + age * 0.6));
  }

  reset() {
    this.radius = 0;
    this.lastStepX = null;
    this.ring?.clear();
  }
}
