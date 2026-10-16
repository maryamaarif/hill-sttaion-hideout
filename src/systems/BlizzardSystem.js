import { DEPTH } from '../config/game.js';

const BRUSH_RADIUS = 200; // outer radius of the 'fog-hole' texture

// Blizzard zones (layout.blizzardZones): heavy snow and fog cut the player's view
// to a circle around them, and police cones shrink (visibility) for everyone.
// The fog fades in over the first part of the zone so it never pops on.
//
// season.blizzard: { radius, fogColor, fogAlpha, policeVisibility, fadeDistance }
export default class BlizzardSystem {
  constructor(scene, zones = [], config = null) {
    this.scene = scene;
    this.zones = config ? zones : [];
    this.config = config;
    this.intensity = 0;
    if (!this.zones.length) return;

    const { width: W, height: H } = scene.scale;
    this.fog = scene.add.renderTexture(0, 0, W, H).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ambient + 1);
    this.snow = scene.add
      .particles(0, -10, 'snowflake', {
        x: { min: 0, max: W + 300 },
        speedX: { min: -260, max: -140 },
        speedY: { min: 160, max: 280 },
        scale: { min: 0.6, max: 1.6 },
        alpha: { min: 0.6, max: 1 },
        lifespan: 2600,
        frequency: 6,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.ambient + 2);
    // Soft brush that clears the fog around the player; its outer edge = radius.
    this.brush = scene.make.image({ key: 'fog-hole', add: false }).setScale(config.radius / BRUSH_RADIUS);
  }

  // 0 outside, rising to 1 within fadeDistance of a zone's edges.
  intensityAt(x) {
    const fade = this.config.fadeDistance;
    let best = 0;
    for (const z of this.zones) {
      if (x < z.x || x > z.x + z.w) continue;
      best = Math.max(best, Math.min(1, (x - z.x) / fade, (z.x + z.w - x) / fade));
    }
    return best;
  }

  // Police visibility multiplier at x (1 = clear weather).
  visibilityAt(x) {
    if (!this.zones.length) return 1;
    const t = this.intensityAt(x);
    return 1 - t * (1 - this.config.policeVisibility);
  }

  update(player) {
    if (!this.zones.length) return;
    const cfg = this.config;
    this.intensity = this.intensityAt(player.x);
    const on = this.intensity > 0.05;
    if (on && !this.snow.emitting) this.snow.start();
    if (!on && this.snow.emitting) this.snow.stop();

    this.fog.clear();
    if (!on) return;
    const cam = this.scene.cameras.main;
    const cx = player.x - cam.scrollX;
    const cy = player.body.center.y - cam.scrollY;
    this.fog.fill(cfg.fogColor, cfg.fogAlpha * this.intensity);
    this.brush.setPosition(cx, cy);
    this.fog.erase(this.brush);
  }
}
