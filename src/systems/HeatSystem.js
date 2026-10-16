import { DEPTH } from '../config/game.js';

// Heat zones (layout.heatZones) with a stamina bar. Standing still in the open sun
// drains stamina; shade (any hiding spot) or leaving the zone refills it. Moving in
// the sun holds it steady, so the player keeps moving between shady spots.
//
// season.heat: { staminaSeconds, regenPerSec, warnAt, glareAlpha }
export default class HeatSystem {
  constructor(scene, zones = [], config = null, groundY = 0) {
    this.scene = scene;
    this.zones = config ? zones : [];
    this.config = config;
    this.stamina = 1;
    this.warned = false;
    this.inSun = false;
    if (!this.zones.length) return;

    const H = scene.scale.height;
    // Heat shimmer rising off the ground across each zone.
    for (const { x, w } of this.zones) {
      scene.add
        .particles(0, 0, 'shimmer', {
          x: { min: x, max: x + w },
          y: { min: groundY - 70, max: groundY - 10 },
          speedY: { min: -18, max: -36 },
          speedX: { min: -4, max: 4 },
          scaleX: { min: 0.8, max: 1.6 },
          scaleY: { min: 0.8, max: 1.4 },
          alpha: { values: [0, 0.55, 0] },
          lifespan: 1600,
          frequency: Math.max(30, 9000 / w),
        })
        .setDepth(DEPTH.decor + 1);
    }
    // Warm glare over the screen while the player is in the sun.
    this.glare = scene.add
      .rectangle(0, 0, scene.scale.width, H, 0xffc94a, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.ambient - 1);
  }

  get active() {
    return this.zones.length > 0;
  }

  inZone(x) {
    return this.zones.some((z) => x >= z.x && x <= z.x + z.w);
  }

  // Returns 'faint' when stamina runs out, 'warn' once when it gets low, else null.
  // mod (a heatwave, WeatherSystem.heat): { drain: × standing drain, moving: drain while moving in the sun }
  update(dt, player, shaded, mod = { drain: 1, moving: 0 }) {
    if (!this.active) return null;
    const cfg = this.config;
    const zone = this.inZone(player.x);
    this.inSun = zone && !shaded && !player.swimming;
    this.standingInSun = this.inSun && !player.moving;
    this.heatwave = mod.drain > 1 || mod.moving > 0;

    if (this.standingInSun) this.stamina = Math.max(0, this.stamina - (dt * mod.drain) / cfg.staminaSeconds);
    else if (this.inSun && mod.moving) this.stamina = Math.max(0, this.stamina - (dt * mod.moving) / cfg.staminaSeconds);
    else if (!this.inSun) this.stamina = Math.min(1, this.stamina + dt * cfg.regenPerSec);

    const target = this.inSun ? cfg.glareAlpha * (this.standingInSun ? 1.6 : 1) : 0;
    this.glare.fillAlpha += (target - this.glare.fillAlpha) * Math.min(1, dt * 3);

    if (this.stamina <= 0) return 'faint';
    if (this.stamina < cfg.warnAt && !this.warned) {
      this.warned = true;
      return 'warn';
    }
    if (this.stamina > cfg.warnAt + 0.2) this.warned = false;
    return null;
  }

  reset() {
    this.stamina = 1;
    this.warned = false;
  }
}
