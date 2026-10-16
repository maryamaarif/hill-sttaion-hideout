import { DEPTH } from '../config/game.js';

// Footprints in the snow (layout.footprintZones). Walking leaves a trail of prints
// that fade after a while. They show the player where they have been, and police
// who see a print follow the trail toward fresher ones (see Police.followClues).
// Hiding leaves no new prints, so a trail that ends at a hut still leads there.
//
// season.footprints: { spacing, lifeMs }
export default class FootprintSystem {
  constructor(scene, zones = [], config = null) {
    this.scene = scene;
    this.zones = config ? zones : [];
    this.config = config;
    this.prints = [];
    this.lastX = null;
    this.flip = false;
  }

  inZone(x) {
    return this.zones.some((z) => x >= z.x && x <= z.x + z.w);
  }

  update(time, player) {
    if (!this.zones.length) return;
    const { spacing, lifeMs } = this.config;

    if (player.onGround && !player.hidden && player.visible && this.inZone(player.x)) {
      if (this.lastX === null || Math.abs(player.x - this.lastX) >= spacing) {
        this.lastX = player.x;
        this.flip = !this.flip;
        const y = player.body.bottom;
        const img = this.scene.add
          .image(player.x, y - (this.flip ? 1 : 4), 'footprint')
          .setDepth(DEPTH.decor)
          .setFlipX(player.flipX);
        this.prints.push({ x: player.x, y, t: time, img });
      }
    }

    // Fade and forget old prints.
    this.prints = this.prints.filter((p) => {
      const age = (time - p.t) / lifeMs;
      if (age >= 1) {
        p.img.destroy();
        return false;
      }
      p.img.setAlpha(0.9 * (1 - age));
      return true;
    });
  }

  clues() {
    return this.prints;
  }

  reset() {
    this.prints.forEach((p) => p.img.destroy());
    this.prints = [];
    this.lastX = null;
  }
}
