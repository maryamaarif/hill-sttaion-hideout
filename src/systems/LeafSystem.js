import { DEPTH } from '../config/game.js';
import { seededRandom } from '../art/TextureFactory.js';
import HidingSpot from '../entities/HidingSpot.js';

// Leaf piles (layout.leafPiles) that all look alike:
//   'pit'   covers a gap in the ground (hole = gap width, default w - 26):
//           stepping on it drops the player
//   'hide'  deep enough to hide in (press Down)
//   'plain' just leaves on solid ground
// Wind gusts (season.wind) blow the leaves thin for a moment, revealing what is
// underneath: pits show as holes, and a player hiding in a pile is exposed.
//
// season.wind: { intervalMs, warnMs, gustMs, firstGustMs }
export default class LeafSystem {
  constructor(scene, piles = [], wind, groundY, palette, audio) {
    this.scene = scene;
    this.audio = audio;
    this.wind = wind;
    this.piles = [];
    this.hidingSpots = [];
    this.state = 'calm';
    this.nextAt = null;
    if (!piles.length || !wind) return;

    for (const def of piles) this.piles.push(this.build(def, groundY, palette));
    const xs = piles.map((p) => p.x);
    this.area = { from: Math.min(...xs) - 500, to: Math.max(...xs) + 300 };

    // Leaves blown across the screen during a gust.
    this.gustLeaves = scene.add
      .particles(-20, 0, 'leaf', {
        y: { min: 60, max: scene.scale.height - 40 },
        speedX: { min: 520, max: 820 },
        speedY: { min: -60, max: 60 },
        rotate: { min: 0, max: 360 },
        tint: palette.leaves,
        scale: { min: 0.8, max: 1.4 },
        lifespan: 1800,
        frequency: 25,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.ambient);
  }

  build(def, groundY, p) {
    const { x, w, kind } = def;
    const h = kind === 'hide' ? 44 : 26;
    const g = this.scene.add.graphics().setDepth(DEPTH.foreground);
    const rnd = seededRandom(x);
    if (kind === 'pit') {
      // A fake lid of ground over the hole, so a pit pile looks like any other.
      // It thins out with the leaves during a gust, revealing the hole.
      const hole = def.hole ?? w - 26;
      const depth = this.scene.scale.height - groundY;
      g.fillStyle(p.dirt).fillRect(-hole / 2 - 4, 0, hole + 8, depth);
      g.fillStyle(p.grassDark).fillRect(-hole / 2 - 4, 6, hole + 8, 5);
      g.fillStyle(p.grass).fillRect(-hole / 2 - 4, -4, hole + 8, 11);
    }
    // A mound of overlapping leaves, darker at the base.
    for (let i = 0; i < w * 0.9; i++) {
      const t = rnd();
      const lx = (t - 0.5) * w;
      const maxH = h * Math.sqrt(1 - (2 * t - 1) ** 2);
      const ly = -rnd() * maxH;
      g.fillStyle(p.leaves[Math.floor(rnd() * p.leaves.length)], 0.95);
      g.fillEllipse(lx, ly, 12, 7);
    }
    g.setPosition(x, groundY + 2);

    let spot = null;
    if (kind === 'hide') {
      spot = new HidingSpot(this.scene, { x, kind: 'leaves', invisible: true, w: w * 0.8, h }, groundY, '');
      this.hidingSpots.push(spot);
    }
    return { def, g, spot, baseX: x };
  }

  update(time, player) {
    if (!this.piles.length) return;
    const inArea = player.x >= this.area.from && player.x <= this.area.to;
    if (!inArea) {
      this.nextAt = null;
      return;
    }
    if (this.nextAt === null) this.nextAt = time + this.wind.firstGustMs;

    if (this.state === 'calm' && time >= this.nextAt - this.wind.warnMs) {
      this.state = 'warn';
      this.audio.play('whoosh');
      for (const pile of this.piles) {
        this.scene.tweens.add({ targets: pile.g, angle: 3, duration: 90, yoyo: true, repeat: 4 });
      }
    }
    if (this.state === 'warn' && time >= this.nextAt) {
      this.state = 'gust';
      this.gustLeaves.start();
      for (const pile of this.piles) {
        this.scene.tweens.add({ targets: pile.g, alpha: 0.15, x: pile.baseX + 18, duration: 220 });
        if (pile.spot) pile.spot.exposed = true;
      }
    }
    if (this.state === 'gust' && time >= this.nextAt + this.wind.gustMs) {
      this.state = 'calm';
      this.gustLeaves.stop();
      this.nextAt = time + this.wind.intervalMs;
      for (const pile of this.piles) {
        this.scene.tweens.add({ targets: pile.g, alpha: 1, x: pile.baseX, duration: 500 });
        if (pile.spot) pile.spot.exposed = false;
      }
    }
  }

  // Hidden player shows through a thinned pile.
  get gusting() {
    return this.state === 'gust';
  }
}
