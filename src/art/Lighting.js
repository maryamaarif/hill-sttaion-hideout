import { DEPTH } from '../config/game.js';
import { paintTexture, trackForCleanup, radialGlow, vGradient } from './Paint.js';

// Lighting pass, tuned per season (season.lighting):
//   { vignette, bloom, light, lightAlpha, tint, tintAlpha }
//   - a sunlight wash from the sun's side and a soft bloom halo around the sun (additive)
//   - an overall colour tint (multiply)
//   - a painted vignette
//   - soft contact shadows under characters (Shadow)
// Spring soft and fresh, Summer bright and saturated, Fall warm golden, Winter cool blue.
//
// Everything is a cached screen-sized image (no camera postFX: an extra framebuffer
// pass loses alpha under translucent layers and greys out the whole picture, and
// overlays work in the Canvas renderer too).
export function applyLighting(scene, season) {
  const L = season.lighting ?? {};
  const { width: W, height: H } = scene.scale;
  const p = season.palette;
  const id = Math.random().toString(36).slice(2, 7);
  const overlay = (key, depth, blend) => {
    trackForCleanup(scene, key);
    return scene.add.image(0, 0, key).setOrigin(0).setScrollFactor(0).setDepth(depth).setBlendMode(blend);
  };
  const sx = W * (p.sunX ?? 0.8);
  const sy = p.sunY ?? 92;

  // Painted at half resolution: these are all soft gradients.
  const light = `light-${season.key}-${id}`;
  paintTexture(scene, light, W, H, (ctx) => {
    radialGlow(ctx, sx, sy, W * 0.9, L.light ?? p.sun, L.lightAlpha ?? 0.2);
    if (L.bloom) radialGlow(ctx, sx, sy, 150, 0xffffff, L.bloom);
  }, { scale: 0.5 });
  overlay(light, DEPTH.ambient - 2, Phaser.BlendModes.ADD).setScale(2);

  if (L.tint) {
    const tint = `tint-${season.key}-${id}`;
    paintTexture(scene, tint, 8, H, (ctx) => vGradient(ctx, 0, 0, 8, H, [[0, L.tint, L.tintAlpha ?? 0.1], [1, L.tint, (L.tintAlpha ?? 0.1) * 0.4]]), { scale: 1 });
    overlay(tint, DEPTH.ambient - 1, Phaser.BlendModes.MULTIPLY).setDisplaySize(W, H);
  }

  if (L.vignette) {
    const vig = `vignette-${season.key}-${id}`;
    paintTexture(scene, vig, W, H, (ctx) => {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(1, H / W);
      const g = ctx.createRadialGradient(0, 0, W * 0.32, 0, 0, W * 0.75);
      g.addColorStop(0, 'rgba(20,14,10,0)');
      g.addColorStop(1, `rgba(20,14,10,${L.vignette})`);
      ctx.fillStyle = g;
      ctx.fillRect(-W, -W, W * 2, W * 2);
      ctx.restore();
    }, { scale: 0.5 });
    overlay(vig, DEPTH.ambient - 1, Phaser.BlendModes.NORMAL).setScale(2);
  }
}

// Soft ground shadow under a character. While airborne it stays where the
// character left the ground and shrinks/fades with height.
export class Shadow {
  constructor(scene, width = 26) {
    this.img = scene.add.image(0, 0, 'shadow').setDepth(DEPTH.terrain + 2);
    this.width = width;
    this.groundY = null;
  }

  follow(x, footY, grounded, visible = true) {
    if (grounded || this.groundY === null) this.groundY = footY;
    const h = Math.max(0, this.groundY - footY);
    const s = Math.max(0.35, 1 - h / 140);
    this.img.setPosition(x, this.groundY).setDisplaySize(this.width * s, this.width * 0.3 * s);
    this.img.setAlpha(visible ? s : 0);
  }

  destroy() {
    this.img.destroy();
  }
}

