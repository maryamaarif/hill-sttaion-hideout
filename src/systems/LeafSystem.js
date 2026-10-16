import { DEPTH } from '../config/game.js';
import { seededRandom } from '../art/TextureFactory.js';
import { paintTexture, trackForCleanup, addArt, css, shade, vGradient, contactShadow } from '../art/Paint.js';
import HidingSpot from '../entities/HidingSpot.js';
import { soil, groundTop } from '../art/Terrain.js';

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
    const rnd = seededRandom(x);
    // Painted once: a mound of shaded leaves (and for a pit, a fake lid of ground,
    // painted separately without an ink outline so its edges don't show).
    const depth = 6;
    const hole = def.hole ?? w - 26;
    const top = h + 10;
    const key = `leafpile-${kind}-${x}-${Math.random().toString(36).slice(2, 6)}`;
    paintTexture(this.scene, key, w + 24, top + depth, (ctx) => {
      ctx.translate(w / 2 + 12, top);
      contactShadow(ctx, 0, 2, w * 0.55, 5, 0.35);
      for (let i = 0; i < w * 1.1; i++) {
        const t = rnd();
        const lx = (t - 0.5) * w;
        const maxH = h * Math.sqrt(1 - (2 * t - 1) ** 2);
        const ly = -rnd() * maxH;
        const c = p.leaves[Math.floor(rnd() * p.leaves.length)];
        // Lower leaves sit in shade.
        const lit = shade(c, 0.75 + 0.45 * (-ly / Math.max(1, h)));
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rnd() * Math.PI);
        const g = ctx.createLinearGradient(0, -4, 0, 4);
        g.addColorStop(0, css(shade(lit, 1.2)));
        g.addColorStop(1, css(shade(lit, 0.8)));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.5, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = css(shade(lit, 0.6), 0.7);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.stroke();
        ctx.restore();
      }
    }, { outline: 2 });
    trackForCleanup(this.scene, key);
    const leaves = addArt(this.scene, 0, 0, key).setOrigin((w / 2 + 12) / (w + 24), top / (top + depth));
    const g = this.scene.add.container(x, groundY + 2).setDepth(DEPTH.foreground);
    if (kind === 'pit') {
      // Painted exactly like the real ground (same soil and turf painters).
      const lw = hole + 8;
      const lidDepth = this.scene.scale.height - groundY;
      const lidKey = `${key}-lid`;
      paintTexture(this.scene, lidKey, lw, lidDepth + 4, (ctx) => {
        soil(ctx, 0, 6, lw, lidDepth - 2, p, seededRandom(x + 3));
        groundTop(ctx, 0, 2, lw, p, seededRandom(x + 4), { endCaps: false });
      });
      trackForCleanup(this.scene, lidKey);
      g.add(addArt(this.scene, -lw / 2, -4, lidKey).setOrigin(0));
    }
    g.add(leaves);

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
