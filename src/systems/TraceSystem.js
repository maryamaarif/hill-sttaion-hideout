import { DEPTH } from '../config/game.js';

// What the player leaves behind when walking (season.traces):
//   Spring  wet footprints that dry within a moment (just a trail, police ignore them)
//   Summer  nothing (no `traces`)
//   Fall    leaves scattered and kicked up behind you
//   Winter  deep footprints that last; police who see one follow the trail toward
//           fresher prints, search where it ends, then return (Police.followClues)
// Hiding and skiing leave no new traces, so a trail that ends at a hut still leads there.
//
// season.traces: { texture, tint, alpha, spacing, lifeMs, followable, scatter?, zones? }
//   tint        a colour, or a list to pick from (scattered leaves)
//   followable  police can follow these traces
//   scatter     random offset and rotation (leaves), instead of left/right prints
//   zones       name of a layout key with [{x, w}] areas; default: everywhere
export default class TraceSystem {
  constructor(scene, config = null, layout = {}) {
    this.scene = scene;
    this.config = config;
    this.zones = config?.zones ? (layout[config.zones] ?? []) : null;
    this.traces = [];
    this.lastX = null;
    this.flip = false;
  }

  inZone(x) {
    return !this.zones || this.zones.some((z) => x >= z.x && x <= z.x + z.w);
  }

  update(time, player) {
    if (!this.config) return;
    const { spacing, lifeMs, texture, tint, alpha = 0.9, scatter } = this.config;
    const walking = player.onGround && !player.hidden && !player.skiing && !player.swimming && player.visible;
    if (walking && this.inZone(player.x)) {
      if (this.lastX === null || Math.abs(player.x - this.lastX) >= spacing) {
        this.lastX = player.x;
        this.flip = !this.flip;
        const y = player.body.bottom;
        const c = Array.isArray(tint) ? tint[Math.floor(Math.random() * tint.length)] : tint ?? 0xffffff;
        const img = this.scene.add.image(player.x + (scatter ? (Math.random() - 0.5) * 14 : 0), y - (scatter ? Math.random() * 3 : this.flip ? 1 : 4), texture)
          .setDepth(DEPTH.decor)
          .setTint(c)
          .setFlipX(player.flipX);
        if (scatter) img.setAngle(Math.random() * 360).setScale(0.8 + Math.random() * 0.4);
        this.traces.push({ x: player.x, y, t: time, img, alpha });
      }
    } else if (!player.onGround || player.hidden) {
      this.lastX = null;
    }

    // Fade and forget old traces.
    this.traces = this.traces.filter((tr) => {
      const age = (time - tr.t) / lifeMs;
      if (age >= 1) {
        tr.img.destroy();
        return false;
      }
      tr.img.setAlpha(tr.alpha * (1 - age * age));
      return true;
    });
  }

  // Traces police can follow (deep snow prints).
  clues() {
    return this.config?.followable ? this.traces : [];
  }

  reset() {
    this.traces.forEach((tr) => tr.img.destroy());
    this.traces = [];
    this.lastX = null;
  }
}
