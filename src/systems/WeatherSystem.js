import { DEPTH } from '../config/game.js';

// Rain showers (season.weather.rain): rain falls for durationMs every everyMs
// (first one after firstMs). While it rains the sky dims and police can't see as
// far (policeVisibility multiplies their cones).
export default class WeatherSystem {
  constructor(scene, weather = null) {
    this.scene = scene;
    this.rain = weather?.rain ?? null;
    this.raining = false;
    if (!this.rain) return;
    const { width: W, height: H } = scene.scale;
    this.startAt = scene.time.now;
    this.drops = scene.add
      .particles(0, -20, 'raindrop', {
        x: { min: 0, max: W + 200 },
        speedY: { min: 620, max: 760 },
        speedX: { min: -110, max: -80 },
        alpha: { min: 0.5, max: 0.9 },
        lifespan: 900,
        frequency: 7,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.ambient + 1);
    this.dim = scene.add.rectangle(0, 0, W, H, 0x3a4a66, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ambient);
  }

  get visibility() {
    return this.raining ? this.rain.policeVisibility : 1;
  }

  update(time) {
    if (!this.rain) return;
    const { firstMs, everyMs, durationMs } = this.rain;
    const t = time - this.startAt - firstMs;
    const raining = t >= 0 && t % everyMs < durationMs;
    if (raining === this.raining) return;
    this.raining = raining;
    if (raining) this.drops.start();
    else this.drops.stop();
    this.scene.tweens.add({ targets: this.dim, fillAlpha: raining ? 0.18 : 0, duration: 800 });
    this.scene.events.emit(raining ? 'rain-start' : 'rain-stop');
  }
}
