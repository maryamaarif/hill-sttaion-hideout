import { DEPTH } from '../config/game.js';

// Time-lapse over the same hillside view (season transition, title screen): while
// one season's painted backdrop dissolves into the next, the sun arcs across the
// sky, clouds race past, days flicker by (quick dusk/dawn pulses) and the season's
// particles change (blossoms → sun sparkles → falling leaves → snow).
export default class TimeLapse {
  constructor(scene) {
    this.scene = scene;
    const { width: W, height: H } = scene.scale;
    this.W = W;
    this.H = H;
    // Behind the hills, in front of the sky: a racing sun with a glow.
    this.sunGlow = scene.add.image(0, 0, 'glow').setDisplaySize(220, 220).setTint(0xfff1c0).setAlpha(0).setDepth(DEPTH.sky + 1);
    this.sun = scene.add.image(0, 0, 'glow').setDisplaySize(54, 54).setAlpha(0).setDepth(DEPTH.sky + 1);
    // Clouds streaking across.
    this.clouds = scene.add.particles(0, 0, 'puff', {
      x: -80,
      y: { min: 30, max: H * 0.38 },
      speedX: { min: 500, max: 900 },
      scaleX: { min: 2.4, max: 4 },
      scaleY: { min: 0.7, max: 1.2 },
      alpha: { start: 0.55, end: 0.35 },
      lifespan: 2200,
      frequency: 140,
      emitting: false,
    }).setDepth(DEPTH.sky + 2);
    // Night between the days (dark blue, multiplied).
    this.night = scene.add.rectangle(0, 0, W, H, 0x1a2550, 0).setOrigin(0).setDepth(DEPTH.ambient - 3);
    this.objects = [this.sunGlow, this.sun, this.clouds, this.night];
  }

  // Play over `ms`: `days` sun arcs with nights between.
  play(ms, { days = 2 } = {}) {
    const { W, H } = this;
    const s = this.scene;
    s.tweens.killTweensOf([this.sun, this.sunGlow, this.night]);
    this.clouds.start();
    s.time.delayedCall(ms * 0.85, () => this.clouds.stop());
    const per = ms / days;
    for (let d = 0; d < days; d++) {
      const t = { p: 0 };
      s.tweens.add({
        targets: t,
        p: 1,
        delay: d * per,
        duration: per,
        onUpdate: () => {
          const x = -40 + t.p * (W + 80);
          const y = H * 0.55 - Math.sin(t.p * Math.PI) * H * 0.45;
          const a = Math.sin(t.p * Math.PI);
          this.sun.setPosition(x, y).setAlpha(a);
          this.sunGlow.setPosition(x, y).setAlpha(a * 0.6);
          // Dusk and dawn: darker at either end of the day.
          this.night.setFillStyle(0x1a2550, (1 - a) ** 2 * 0.42);
        },
        onComplete: () => {
          if (d === days - 1) {
            this.sun.setAlpha(0);
            this.sunGlow.setAlpha(0);
            s.tweens.add({ targets: this.night, fillAlpha: 0, duration: 300 });
          }
        },
      });
    }
  }
}
