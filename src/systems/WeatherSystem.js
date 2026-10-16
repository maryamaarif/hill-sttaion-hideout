import { DEPTH } from '../config/game.js';

// One short weather event per season (season.weatherEvent) that changes the rules
// for about ten seconds. A HUD badge shows its icon, name and time left.
//
//   kind 'shower'    rain falls, the sky dims, officers open umbrellas and their
//                    vision cones shrink (policeVisibility)
//   kind 'heatwave'  a hot glare; stamina drains faster in the sun (heatDrain), and
//                    even moving in the sun drains it (movingDrain)
//   kind 'gust'      driven by season.wind (LeafSystem): leaves blow off the piles,
//                    revealing hidden pits and players hiding in them
//   kind 'blizzard'  driven by layout.blizzardZones (BlizzardSystem): view shrinks
//                    to a circle, police cones shrink
//
// Timed events ('shower', 'heatwave'):
//   { firstMs | startX, everyMs, durationMs, warnMs }
//   firstMs  first event this long after the season starts, or
//   startX   first event when the player passes this x; repeats every everyMs
// Driven events ('gust', 'blizzard') only take { name, icon }.
export default class WeatherSystem {
  constructor(scene, event = null) {
    this.scene = scene;
    this.event = event;
    this.state = 'idle'; // 'idle' | 'warn' | 'active'
    this.nextAt = null;
    if (!event) return;
    const { width: W, height: H } = scene.scale;
    if (event.kind === 'shower') {
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
    }
    if (event.kind === 'heatwave') {
      this.waves = scene.add
        .particles(0, 0, 'shimmer', {
          x: { min: 0, max: W },
          y: { min: H * 0.45, max: H },
          speedY: { min: -30, max: -60 },
          scaleX: { min: 1.2, max: 2.4 },
          scaleY: { min: 1.2, max: 2.2 },
          alpha: { values: [0, 0.5, 0] },
          lifespan: 1400,
          frequency: 40,
          emitting: false,
        })
        .setScrollFactor(0)
        .setDepth(DEPTH.ambient + 1);
    }
    const overlay = event.overlay ?? (event.kind === 'shower' ? { color: 0x3a4a66, alpha: 0.18 } : null);
    if (overlay) {
      this.overlayAlpha = overlay.alpha;
      this.dim = scene.add.rectangle(0, 0, W, H, overlay.color, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ambient);
    }
  }

  get timed() {
    return this.event && (this.event.kind === 'shower' || this.event.kind === 'heatwave');
  }

  get active() {
    return this.state === 'active';
  }

  // Police cone multiplier while a shower is on.
  get visibility() {
    return this.active && this.event.kind === 'shower' ? this.event.policeVisibility ?? 1 : 1;
  }

  // Heat multipliers while a heatwave is on: { drain, moving }.
  get heat() {
    return this.active && this.event.kind === 'heatwave'
      ? { drain: this.event.heatDrain ?? 1, moving: this.event.movingDrain ?? 0 }
      : { drain: 1, moving: 0 };
  }

  get umbrellas() {
    return this.active && Boolean(this.event.umbrellas);
  }

  // Seconds left (for the HUD badge) and progress 0..1 of the current phase.
  status(time) {
    if (!this.event || this.state === 'idle') return null;
    if (!this.timed) return { state: this.state, left: 1 };
    const { durationMs, warnMs = 0 } = this.event;
    if (this.state === 'warn') return { state: 'warn', left: 1 - (time - (this.nextAt - warnMs)) / Math.max(1, warnMs) };
    return { state: 'active', left: 1 - (time - this.nextAt) / durationMs };
  }

  // drivers: { gusting, gustWarning, inBlizzard } from LeafSystem / BlizzardSystem.
  update(time, player, drivers = {}) {
    if (!this.event) return;
    if (this.timed) this.updateTimed(time, player);
    else if (this.event.kind === 'gust') this.setState(drivers.gusting ? 'active' : drivers.gustWarning ? 'warn' : 'idle');
    else if (this.event.kind === 'blizzard') this.setState(drivers.inBlizzard ? 'active' : 'idle');
  }

  updateTimed(time, player) {
    const { firstMs, startX, everyMs, durationMs, warnMs = 0 } = this.event;
    if (this.nextAt === null) {
      if (startX != null && player.x < startX) return;
      this.nextAt = time + (startX != null ? warnMs : firstMs);
    }
    let state = 'idle';
    if (time >= this.nextAt + durationMs) {
      this.nextAt += everyMs;
    } else if (time >= this.nextAt) state = 'active';
    else if (time >= this.nextAt - warnMs) state = 'warn';
    this.setState(state);
  }

  setState(state) {
    if (state === this.state) return;
    const was = this.state;
    this.state = state;
    const on = state === 'active';
    if (on !== (was === 'active')) {
      if (on) {
        this.drops?.start();
        this.waves?.start();
      } else {
        this.drops?.stop();
        this.waves?.stop();
      }
      if (this.dim) this.scene.tweens.add({ targets: this.dim, fillAlpha: on ? this.overlayAlpha : 0, duration: 800 });
    }
    this.scene.events.emit('weather-change', this.event, state, was);
  }

  // A restart (respawn) clears the sky; timed events keep their schedule.
  reset() {
    if (this.timed) return;
    this.setState('idle');
  }
}
