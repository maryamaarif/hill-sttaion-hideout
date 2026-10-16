import { buildOutfit, buildPoliceLook, HOME_OUTFIT } from './Character.js';
import {
  paintTexture, outlineCanvas, css, shade, seeded, radialGlow, roundRect, contactShadow, puffy, pine, vGradient, speckle, foliage, trunk, conifer,
} from './Paint.js';

// Every texture is painted in code (see Paint.js), once, and cached by key.
//
// ART STYLE (one style for all four seasons): painterly shapes with soft gradients,
// light from the upper left, shaded undersides, and a soft ink outline on everything
// the player interacts with (characters, hiding spots, vehicles, trees, props). The
// parallax background has no outline and fades into atmospheric haze. Each season
// only changes the palette.
//   Common textures (characters, UI, particles, vehicles): createCommonTextures.
//   Season textures (trees, hiding spots): createSeasonTextures, from the palette.

export const INK = 0x3b2a20;

// Kept for callers that outline a texture they painted themselves.
export function addOutline(scene, key) {
  const tex = scene.textures.get(key);
  const canvas = tex.getSourceImage();
  if (canvas instanceof HTMLCanvasElement) {
    outlineCanvas(canvas, 2);
    tex.refresh?.();
  }
}

export const seededRandom = seeded;

// ----- shared shapes -----

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.05, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.75, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.75, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.05, x, y, x, y + s * 0.3);
  ctx.closePath();
}

export function woodGrain(ctx, x, y, w, h, base, rnd, lines = 10) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, css(shade(base, 1.15)));
  g.addColorStop(1, css(shade(base, 0.85)));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 0.6;
  for (let i = 0; i < lines; i++) {
    const yy = y + rnd() * h;
    ctx.strokeStyle = css(shade(base, 0.7 + rnd() * 0.15), 0.5);
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.bezierCurveTo(x + w * 0.3, yy + (rnd() - 0.5) * 3, x + w * 0.7, yy + (rnd() - 0.5) * 3, x + w, yy + (rnd() - 0.5) * 2);
    ctx.stroke();
  }
}

// Rounded UI panel (nine-slice source): wood frame, optionally with a parchment inset.
function uiPanel(ctx, w, h, { base, edge, inner = null, r = 12, rnd, lines = 16 }) {
  roundRect(ctx, 1, 2, w - 2, h - 2, r);
  ctx.fillStyle = css(0x000000, 0.25);
  ctx.fill();
  roundRect(ctx, 1, 0, w - 2, h - 3, r);
  ctx.save();
  ctx.clip();
  woodGrain(ctx, 0, 0, w, h, base, rnd, lines);
  if (inner) {
    roundRect(ctx, 6, 6, w - 12, h - 15, r - 5);
    const g = ctx.createLinearGradient(0, 6, 0, h - 9);
    g.addColorStop(0, css(shade(inner, 1.06)));
    g.addColorStop(1, css(shade(inner, 0.93)));
    ctx.fillStyle = g;
    ctx.fill();
    speckle(ctx, 6, 6, w - 12, h - 15, [shade(inner, 0.85)], 30, rnd, [0.3, 0.8], 0.4);
  }
  ctx.restore();
  roundRect(ctx, 1, 0, w - 2, h - 3, r);
  ctx.lineWidth = 2;
  ctx.strokeStyle = css(edge);
  ctx.stroke();
  roundRect(ctx, 3, 2, w - 6, h - 7, r - 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = css(0xffffff, 0.25);
  ctx.stroke();
}

function wheel(ctx, x, y, r, rim) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, css(shade(rim, 1.3)));
  g.addColorStop(1, css(shade(rim, 0.7)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css(0x1e1a1a);
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
    ctx.stroke();
  }
  ctx.fillStyle = css(0x1e1a1a);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

// ----- common textures -----

function paintHud(scene) {
  paintTexture(scene, 'heart-full', 22, 20, (ctx) => {
    heart(ctx, 11, 1.5, 17);
    const g = ctx.createRadialGradient(8, 6, 1, 11, 10, 12);
    g.addColorStop(0, css(0xff8a8a));
    g.addColorStop(0.5, css(0xe03a4e));
    g.addColorStop(1, css(0x9e1c30));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = css(INK);
    ctx.stroke();
    ctx.fillStyle = css(0xffffff, 0.7);
    ctx.beginPath();
    ctx.ellipse(7, 6, 2.4, 1.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  paintTexture(scene, 'heart-empty', 22, 20, (ctx) => {
    heart(ctx, 11, 1.5, 17);
    ctx.fillStyle = css(0xe9dfe6, 0.55);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = css(INK);
    ctx.stroke();
  });
  paintTexture(scene, 'coin', 22, 22, (ctx) => {
    const g = ctx.createRadialGradient(8, 7, 1, 11, 11, 11);
    g.addColorStop(0, css(0xfff1a8));
    g.addColorStop(0.5, css(0xf2c040));
    g.addColorStop(1, css(0xa8741a));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(11, 11, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = css(0x7a520e);
    ctx.stroke();
    ctx.strokeStyle = css(0xb8841e);
    ctx.beginPath();
    ctx.arc(11, 11, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = css(0xfff6cc, 0.9);
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 11, 11.5);
  });

  // Season icons (28×28).
  paintTexture(scene, 'icon-spring', 28, 28, (ctx) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = 14 + Math.cos(a) * 6.5;
      const y = 14 + Math.sin(a) * 6.5;
      const g = ctx.createRadialGradient(x - 1, y - 1, 0.5, x, y, 6.5);
      g.addColorStop(0, css(0xffe0ec));
      g.addColorStop(1, css(0xe0789e));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 6.2, 5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    radialGlow(ctx, 14, 14, 4.5, 0xffd84a, 1, 2);
  }, { outline: 1 });
  paintTexture(scene, 'icon-summer', 28, 28, (ctx) => {
    radialGlow(ctx, 14, 14, 14, 0xffe27a, 0.6);
    ctx.strokeStyle = css(0xf2a417);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(14 + Math.cos(a) * 9, 14 + Math.sin(a) * 9);
      ctx.lineTo(14 + Math.cos(a) * 12.5, 14 + Math.sin(a) * 12.5);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(12, 12, 1, 14, 14, 8);
    g.addColorStop(0, css(0xfff6b0));
    g.addColorStop(1, css(0xf2a417));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(14, 14, 7.5, 0, Math.PI * 2);
    ctx.fill();
  }, { outline: 1 });
  paintTexture(scene, 'icon-fall', 28, 28, (ctx) => {
    ctx.beginPath();
    const pts = [[14, 2], [17, 8], [23, 6], [21, 12], [26, 14], [20, 17], [21, 22], [15, 19], [14, 25], [13, 19], [7, 22], [8, 17], [2, 14], [7, 12], [5, 6], [11, 8]];
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(4, 4, 24, 24);
    g.addColorStop(0, css(0xf6b13c));
    g.addColorStop(1, css(0xb53a1f));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = css(0x7a2e12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 27);
    ctx.lineTo(14, 8);
    ctx.stroke();
  }, { outline: 1 });
  paintTexture(scene, 'icon-winter', 28, 28, (ctx) => {
    radialGlow(ctx, 14, 14, 13, 0xcfe9ff, 0.6);
    ctx.lineCap = 'round';
    for (const [w, c] of [[3.4, 0x3f6c9e], [1.6, 0xffffff]]) {
      ctx.strokeStyle = css(c);
      ctx.lineWidth = w;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        const dx = Math.cos(a) * 11;
        const dy = Math.sin(a) * 11;
        ctx.beginPath();
        ctx.moveTo(14 - dx, 14 - dy);
        ctx.lineTo(14 + dx, 14 + dy);
        ctx.stroke();
      }
    }
  });

  // UI panels (nine-slice sources): wood frame, parchment, buttons, keycap.
  paintTexture(scene, 'ui-wood', 240, 160, (ctx, w, h) => uiPanel(ctx, w, h, { base: 0x8a5a34, edge: 0x3b2414, rnd: seeded(5), lines: 26 }));
  paintTexture(scene, 'ui-paper', 160, 120, (ctx, w, h) => uiPanel(ctx, w, h, { base: 0x8a5a34, edge: 0x3b2414, inner: 0xfbf0dc, rnd: seeded(6), lines: 20 }));
  paintTexture(scene, 'ui-plank', 48, 40, (ctx, w, h) => uiPanel(ctx, w, h, { base: 0xc8935c, edge: 0x5a3820, r: 9, rnd: seeded(7) }));
  paintTexture(scene, 'ui-plank-hot', 48, 40, (ctx, w, h) => uiPanel(ctx, w, h, { base: 0xf2c25a, edge: 0x7a4e16, r: 9, rnd: seeded(8) }));
  paintTexture(scene, 'ui-key', 30, 30, (ctx, w, h) => uiPanel(ctx, w, h, { base: 0xb8865a, edge: 0x3b2414, inner: 0xfbf0dc, r: 7, rnd: seeded(9) }));
}

function paintParticles(scene) {
  const p1 = { scale: 1 };
  paintTexture(scene, 'shadow', 64, 16, (ctx) => contactShadow(ctx, 32, 8, 31, 7.5, 0.8), p1);
  paintTexture(scene, 'glow', 64, 64, (ctx) => radialGlow(ctx, 32, 32, 32, 0xffffff, 1), p1);
  paintTexture(scene, 'petal', 10, 7, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 10, 7);
    g.addColorStop(0, css(0xffe3ee));
    g.addColorStop(1, css(0xf08cb4));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(5, 3.5, 4.8, 2.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }, p1);
  paintTexture(scene, 'leaf', 12, 9, (ctx) => {
    ctx.fillStyle = css(0xffffff);
    ctx.beginPath();
    ctx.moveTo(1, 4.5);
    ctx.quadraticCurveTo(6, -1, 11, 4.5);
    ctx.quadraticCurveTo(6, 10, 1, 4.5);
    ctx.fill();
    ctx.strokeStyle = css(0xd0d0d0);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(1, 4.5);
    ctx.lineTo(11, 4.5);
    ctx.stroke();
  }, p1);
  paintTexture(scene, 'snowflake', 7, 7, (ctx) => radialGlow(ctx, 3.5, 3.5, 3.5, 0xffffff, 1, 1), p1);
  paintTexture(scene, 'puff', 32, 32, (ctx) => radialGlow(ctx, 16, 16, 16, 0xffffff, 0.75), p1);
  paintTexture(scene, 'droplet', 6, 6, (ctx) => radialGlow(ctx, 3, 3, 3, 0xd8f3ff, 1, 1), p1);
  paintTexture(scene, 'bubble', 8, 8, (ctx) => {
    ctx.strokeStyle = css(0xe8fbff);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(4, 4, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = css(0xffffff);
    ctx.fillRect(2.5, 2.5, 1, 1);
  }, p1);
  paintTexture(scene, 'seed', 10, 10, (ctx) => {
    ctx.strokeStyle = css(0xffffff, 0.9);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(5, 5);
      ctx.lineTo(5 + Math.cos(a) * 4.5, 5 + Math.sin(a) * 4.5);
      ctx.stroke();
    }
    radialGlow(ctx, 5, 5, 2, 0xfff6c8, 1);
  }, p1);
  paintTexture(scene, 'dust', 6, 6, (ctx) => radialGlow(ctx, 3, 3, 3, 0xfff0c8, 0.8), p1);
  paintTexture(scene, 'sparkle', 12, 12, (ctx) => {
    radialGlow(ctx, 6, 6, 6, 0xfff27a, 0.6);
    ctx.fillStyle = css(0xffffff);
    ctx.beginPath();
    [[6, 0], [7, 5], [12, 6], [7, 7], [6, 12], [5, 7], [0, 6], [5, 5]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }, p1);
  paintTexture(scene, 'raindrop', 3, 14, (ctx) => vGradient(ctx, 1, 0, 1, 14, [[0, 0xcfe6ff, 0], [1, 0xcfe6ff, 0.9]]), p1);
  paintTexture(scene, 'shimmer', 10, 40, (ctx) => {
    for (let y = 0; y < 40; y += 1) {
      const x = 5 + Math.sin(y * 0.4) * 3;
      ctx.fillStyle = css(0xffffff, 0.5 * Math.sin((y / 40) * Math.PI));
      ctx.fillRect(x - 1, y, 2, 1);
    }
  }, p1);
  // White so traces can tint it per season (wet prints, deep snow prints).
  paintTexture(scene, 'footprint', 12, 6, (ctx) => {
    ctx.fillStyle = css(0xffffff, 0.9);
    ctx.beginPath();
    ctx.ellipse(3, 3, 3, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(9, 2.5, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }, p1);
  // Officers' umbrellas in a spring shower.
  paintTexture(scene, 'police-umbrella', 30, 26, (ctx) => {
    ctx.strokeStyle = css(0x2a2a2e);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(15, 9);
    ctx.lineTo(15, 25);
    ctx.quadraticCurveTo(15, 26.5, 13, 25.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, 11);
    ctx.quadraticCurveTo(15, -5, 29, 11);
    for (let i = 4; i >= 0; i--) ctx.quadraticCurveTo(1 + i * 7 + 3.5, 8, 1 + i * 7, 11);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 2, 0, 11);
    g.addColorStop(0, css(0x4a4f5c));
    g.addColorStop(1, css(0x1e2028));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = css(0x6a7080, 0.7);
    ctx.lineWidth = 0.6;
    for (const x of [8, 15, 22]) {
      ctx.beginPath();
      ctx.moveTo(15, 3);
      ctx.lineTo(x, 10);
      ctx.stroke();
    }
  }, { outline: 1 });
  paintTexture(scene, 'fog-hole', 400, 400, (ctx) => {
    const g = ctx.createRadialGradient(200, 200, 100, 200, 200, 200);
    g.addColorStop(0, css(0xffffff, 1));
    g.addColorStop(1, css(0xffffff, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 400, 400);
  }, p1);
  // Water: a seamless strip of soft highlight ripples (scrolled as a tile sprite).
  paintTexture(scene, 'water-ripples', 256, 64, (ctx) => {
    const r = seeded(21);
    ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const x = r() * 256;
      const y = 3 + Math.pow(r(), 1.6) * 58;
      const w = 6 + r() * 22 * (1 - y / 80);
      ctx.strokeStyle = css(0xffffff, 0.18 + r() * 0.35 * (1 - y / 70));
      ctx.lineWidth = 0.8 + r() * 1.2;
      for (const dx of [0, -256, 256]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y);
        ctx.quadraticCurveTo(x + dx + w / 2, y - 1.2, x + dx + w, y);
        ctx.stroke();
      }
    }
  }, p1);
}

function paintVehicles(scene) {
  const o2 = { outline: 2 };
  paintTexture(scene, 'mover-canoe', 130, 30, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.quadraticCurveTo(10, 9, 16, 9);
    ctx.lineTo(114, 9);
    ctx.quadraticCurveTo(120, 9, 130, 3);
    ctx.quadraticCurveTo(122, 27, 104, 28);
    ctx.lineTo(26, 28);
    ctx.quadraticCurveTo(8, 27, 0, 3);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 6, 0, 28);
    g.addColorStop(0, css(0xf06a4c));
    g.addColorStop(0.55, css(0xc9442c));
    g.addColorStop(1, css(0x7a2414));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = css(0xffd23f);
    ctx.fillRect(16, 16, 98, 2.4);
    ctx.fillStyle = css(0x5a2c14);
    ctx.fillRect(14, 8, 102, 3);
    ctx.fillStyle = css(0xffffff, 0.35);
    ctx.fillRect(20, 12, 86, 1.2);
  }, o2);
  paintTexture(scene, 'mover-log', 110, 22, (ctx) => {
    roundRect(ctx, 0, 1, 110, 20, 10);
    const g = ctx.createLinearGradient(0, 1, 0, 21);
    g.addColorStop(0, css(0xa8754a));
    g.addColorStop(0.5, css(0x7a4e2c));
    g.addColorStop(1, css(0x4a2e18));
    ctx.fillStyle = g;
    ctx.fill();
    const r = seeded(31);
    ctx.strokeStyle = css(0x3e2614, 0.7);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 9; i++) {
      const y = 4 + r() * 14;
      const x = r() * 80;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14 + r() * 20, y + (r() - 0.5) * 2);
      ctx.stroke();
    }
    const e = ctx.createRadialGradient(102, 11, 1, 102, 11, 9);
    e.addColorStop(0, css(0xf0cf9c));
    e.addColorStop(1, css(0xb88a58));
    ctx.fillStyle = e;
    ctx.beginPath();
    ctx.ellipse(102, 11, 6, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(0x8a5a34, 0.8);
    for (const rr of [2, 4.5, 7]) {
      ctx.beginPath();
      ctx.ellipse(102, 11, rr * 0.6, rr, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, o2);
  paintTexture(scene, 'train-carriage', 150, 90, (ctx) => {
    roundRect(ctx, -1, 0, 152, 12, 6);
    vGradient(ctx, 0, 0, 150, 12, [[0, 0x5a4444], [1, 0x2a1e1e]]);
    roundRect(ctx, 2, 8, 146, 62, 3);
    const g = ctx.createLinearGradient(0, 8, 0, 70);
    g.addColorStop(0, css(0x9a2c3a));
    g.addColorStop(0.6, css(0x7a1f2b));
    g.addColorStop(1, css(0x4e121a));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = css(0xe0b04e);
    ctx.fillRect(2, 14, 146, 2.5);
    ctx.fillRect(2, 60, 146, 2.5);
    for (let wx = 12; wx < 140; wx += 32) {
      roundRect(ctx, wx, 21, 22, 27, 4);
      const wg = ctx.createLinearGradient(0, 21, 0, 48);
      wg.addColorStop(0, css(0xfff3d0));
      wg.addColorStop(1, css(0xf2b04e));
      ctx.fillStyle = wg;
      ctx.fill();
      ctx.fillStyle = css(0xffffff, 0.35);
      ctx.fillRect(wx + 3, 23, 4, 20);
    }
    vGradient(ctx, 6, 70, 138, 8, [[0, 0x2a2424], [1, 0x121010]]);
    [24, 50, 100, 126].forEach((x) => wheel(ctx, x, 80, 9, 0xb3262b));
  }, o2);
  paintTexture(scene, 'train-loco', 150, 110, (ctx) => {
    vGradient(ctx, 116, 0, 16, 34, [[0, 0x3a3a40], [1, 0x1a1a1e]]);
    ctx.fillStyle = css(0xd9a441);
    ctx.fillRect(112, 0, 24, 5);
    radialGlow(ctx, 93, 26, 9, 0xf2c45a, 1, 5);
    roundRect(ctx, 46, 32, 102, 46, 16);
    const b = ctx.createLinearGradient(0, 32, 0, 78);
    b.addColorStop(0, css(0x4a4a52));
    b.addColorStop(0.35, css(0x2a2a30));
    b.addColorStop(1, css(0x101014));
    ctx.fillStyle = b;
    ctx.fill();
    ctx.fillStyle = css(0xffffff, 0.18);
    ctx.fillRect(52, 36, 92, 3);
    ctx.fillStyle = css(0xd9a441);
    ctx.fillRect(60, 32, 3, 46);
    ctx.fillRect(100, 32, 3, 46);
    vGradient(ctx, 0, 10, 50, 70, [[0, 0x4a4a52], [1, 0x1e1e22]]);
    ctx.fillStyle = css(0x141416);
    ctx.fillRect(-2, 8, 54, 6);
    roundRect(ctx, 12, 22, 24, 22, 3);
    ctx.fillStyle = css(0xfff0c8);
    ctx.fill();
    ctx.fillStyle = css(0xb3262b);
    ctx.fillRect(0, 78, 150, 8);
    ctx.fillRect(140, 70, 10, 16);
    [36, 74, 112].forEach((x) => wheel(ctx, x, 94, 15, 0xb3262b));
    ctx.strokeStyle = css(0xd9a441);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(36, 94);
    ctx.lineTo(112, 94);
    ctx.stroke();
  }, o2);
  paintTexture(scene, 'crossing-train', 220, 150, (ctx) => {
    vGradient(ctx, 6, 20, 208, 108, [[0, 0x6b4a36], [1, 0x3a281c]]);
    const r = seeded(41);
    for (let x = 14; x < 210; x += 22) {
      vGradient(ctx, x, 26, 16, 96, [[0, 0x8a6246], [1, 0x5a3e2c]]);
      ctx.fillStyle = css(0x2a1c12, 0.4);
      ctx.fillRect(x + 15, 26, 1, 96);
      speckle(ctx, x, 26, 16, 96, [0x3a281c], 6, r, [0.4, 1], 0.5);
    }
    ctx.fillStyle = css(0xd9a441);
    ctx.fillRect(6, 64, 208, 3.5);
    ctx.fillStyle = css(0x161212);
    ctx.fillRect(0, 128, 220, 8);
    [36, 70, 150, 184].forEach((x) => wheel(ctx, x, 140, 10, 0x3a3a40));
  });
}

export function createCommonTextures(scene) {
  buildOutfit(scene, HOME_OUTFIT);
  buildPoliceLook(scene, 'plain');
  paintHud(scene);
  paintParticles(scene);
  paintVehicles(scene);
}

// ----- season textures -----

// Trees in four styles (blossom, leafy, autumn, snowy pine), from the palette.
function paintTree(ctx, p, style) {
  const rnd = seeded(7);
  contactShadow(ctx, 70, 167, 50, 7, 0.45);
  if (style === 'pine') {
    conifer(ctx, 70, 168, 162, p.blossomDark, { snow: 0xffffff, rnd, light: p.blossom });
    return;
  }
  // Tapering trunk with bark, forking branches that disappear into the canopy.
  trunk(ctx, 70, 170, 96, 11, p.trunk, rnd, [[70, 112, 38, 80, 5], [71, 100, 104, 72, 5], [69, 92, 58, 56, 3.5], [72, 90, 86, 48, 3]]);
  const clusters = [[70, 56, 30], [40, 74, 23], [102, 72, 24], [52, 38, 22], [90, 38, 24], [70, 84, 18], [26, 60, 15], [116, 56, 15], [70, 24, 19]];
  const colors = style === 'autumn'
    ? { base: [p.blossom, shade(p.blossom, 1.05), p.blossomLight], light: [p.blossomLight, shade(p.blossomLight, 1.15)], dark: [p.blossomDark, shade(p.blossomDark, 0.85)] }
    : { base: p.blossom, light: p.blossomLight, dark: p.blossomDark };
  foliage(ctx, clusters, colors, { rnd, leaf: style === 'blossom' ? 2.6 : 3, density: 0.55 });
  if (style === 'blossom' || p.treeSpeckle) {
    // Flowers / sun-caught fruit dotted over the lit side.
    for (let i = 0; i < 50; i++) {
      const [cx, cy, r] = clusters[i % clusters.length];
      const a = Math.PI * (1 + rnd() * 0.9);
      radialGlow(ctx, cx + Math.cos(a) * r * rnd(), cy + Math.sin(a) * r * rnd(), 1.4, i % 3 ? (p.treeSpeckle ?? 0xffffff) : p.blossomLight, 0.9, 0.6);
    }
  }
}

// Hiding-spot textures by kind, painted from the season palette.
// Only the kinds listed in a season's `hidingSpots` are generated.
const HIDE_TEXTURES = {
  bush: {
    width: 100,
    height: 62,
    draw(ctx, p) {
      contactShadow(ctx, 50, 60, 48, 5, 0.4);
      foliage(ctx, [[20, 44, 18], [48, 34, 25], [78, 42, 20], [34, 50, 14], [64, 50, 14]], { base: p.bush, light: p.bushLight, dark: p.bushDark }, { rnd: seeded(12), leaf: 2.6, density: 0.6, gaps: false });
      const rnd = seeded(11);
      for (let i = 0; i < 12; i++) radialGlow(ctx, 12 + rnd() * 76, 16 + rnd() * 36, 3.2, p.flowers[i % p.flowers.length], 1, 1.4);
    },
  },
  flowers: {
    width: 96,
    height: 46,
    draw(ctx, p) {
      contactShadow(ctx, 48, 44, 46, 4, 0.35);
      vGradient(ctx, 2, 38, 92, 8, [[0, p.dirtDark], [1, shade(p.dirtDark, 0.7)]]);
      const rnd = seeded(17);
      ctx.lineCap = 'round';
      for (let i = 0; i < 40; i++) {
        const x = 4 + (i / 39) * 88 + (rnd() - 0.5) * 3;
        ctx.strokeStyle = css(shade(p.grassDark, 0.8 + rnd() * 0.4));
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, 42);
        ctx.quadraticCurveTo(x + 2, 30, x + (rnd() - 0.5) * 6, 14 + rnd() * 12);
        ctx.stroke();
      }
      for (let i = 0; i < 26; i++) {
        const x = 6 + (i / 25) * 84 + (rnd() - 0.5) * 5;
        const y = 8 + rnd() * 16;
        const c = p.flowers[i % p.flowers.length];
        const g = ctx.createRadialGradient(x - 1, y - 2, 0.5, x, y, 5);
        g.addColorStop(0, css(shade(c, 1.3)));
        g.addColorStop(1, css(shade(c, 0.75)));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 3);
        ctx.lineTo(x - 2, y - 7);
        ctx.lineTo(x, y - 3.5);
        ctx.lineTo(x + 2, y - 7);
        ctx.lineTo(x + 4, y - 3);
        ctx.quadraticCurveTo(x + 4, y + 4, x, y + 4);
        ctx.quadraticCurveTo(x - 4, y + 4, x - 4, y - 3);
        ctx.fill();
      }
    },
  },
  overhang: {
    width: 120,
    height: 100,
    draw(ctx, p) {
      vGradient(ctx, 6, 30, 108, 70, [[0, 0x1b2a4a, 0.45], [1, 0x1b2a4a, 0.15]]); // cool shade
      vGradient(ctx, 98, 20, 22, 80, [[0, p.rock], [1, p.rockDark]]);
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.bezierCurveTo(10, 0, 50, -2, 120, 6);
      ctx.lineTo(120, 36);
      ctx.bezierCurveTo(80, 44, 30, 42, 8, 34);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, 44);
      g.addColorStop(0, css(p.rockLight));
      g.addColorStop(0.5, css(p.rock));
      g.addColorStop(1, css(p.rockDark));
      ctx.fillStyle = g;
      ctx.fill();
      speckle(ctx, 8, 6, 100, 30, [p.rockDark, p.rockLight], 60, seeded(19), [0.5, 1.6], 0.5);
      contactShadow(ctx, 60, 98, 56, 4, 0.35);
    },
  },
  reeds: {
    width: 100,
    height: 130,
    draw(ctx, p) {
      const rnd = seeded(23);
      ctx.lineCap = 'round';
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 26; i++) {
          const x = 3 + (i / 25) * 94 + (rnd() - 0.5) * 6;
          const top = 8 + rnd() * 40 + layer * 12;
          const lean = (rnd() - 0.5) * 16;
          ctx.strokeStyle = css(shade(layer === 2 ? p.reed : p.reedDark, 0.85 + rnd() * 0.35));
          ctx.lineWidth = 1.6 + layer * 0.6;
          ctx.beginPath();
          ctx.moveTo(x, 130);
          ctx.quadraticCurveTo(x + lean * 0.3, 70, x + lean, top);
          ctx.stroke();
          if (rnd() < 0.28) {
            const g = ctx.createLinearGradient(x + lean - 3, 0, x + lean + 3, 0);
            g.addColorStop(0, css(shade(p.reedTip, 1.3)));
            g.addColorStop(1, css(shade(p.reedTip, 0.7)));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(x + lean, top + 9, 3, 9, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    },
  },
  crates: {
    width: 92,
    height: 60,
    draw(ctx, p) {
      contactShadow(ctx, 46, 58, 46, 4, 0.4);
      woodGrain(ctx, 2, 22, 52, 36, p.wood, seeded(29), 8);
      ctx.strokeStyle = css(p.woodDark);
      ctx.lineWidth = 2;
      ctx.strokeRect(3, 23, 50, 34);
      ctx.beginPath();
      ctx.moveTo(3, 40);
      ctx.lineTo(53, 40);
      ctx.stroke();
      vGradient(ctx, 48, 30, 42, 28, [[0, 0x9a2c3a], [1, 0x5a141e]]);
      ctx.fillStyle = css(0xd9a441);
      ctx.fillRect(48, 40, 42, 2.5);
      ctx.fillRect(66, 30, 3.5, 28);
      roundRect(ctx, 14, 2, 54, 22, 4);
      const g = ctx.createLinearGradient(0, 2, 0, 24);
      g.addColorStop(0, css(0x7a6250));
      g.addColorStop(1, css(0x4a3a2e));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = css(0xd9a441);
      ctx.fillRect(36, 0, 10, 4);
    },
  },
  hut: {
    width: 108,
    height: 92,
    draw(ctx, p) {
      contactShadow(ctx, 54, 90, 54, 5, 0.4);
      for (let y = 38; y < 90; y += 8) {
        roundRect(ctx, 12, y, 84, 8, 4);
        const g = ctx.createLinearGradient(0, y, 0, y + 8);
        g.addColorStop(0, css(shade(p.wood, 1.2)));
        g.addColorStop(1, css(shade(p.wood, 0.7)));
        ctx.fillStyle = g;
        ctx.fill();
      }
      vGradient(ctx, 42, 54, 22, 36, [[0, 0x1e1612], [1, 0x2b2320]]);
      radialGlow(ctx, 78, 60, 14, p.house.window, 0.6);
      roundRect(ctx, 71, 53, 14, 12, 2);
      ctx.fillStyle = css(p.house.window);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 42);
      ctx.quadraticCurveTo(54, -6, 108, 42);
      ctx.lineTo(100, 48);
      ctx.lineTo(8, 48);
      ctx.closePath();
      const sg = ctx.createLinearGradient(0, 6, 0, 48);
      sg.addColorStop(0, css(0xffffff));
      sg.addColorStop(1, css(0xc8d6e3));
      ctx.fillStyle = sg;
      ctx.fill();
      puffy(ctx, [[28, 88, 14], [84, 88, 12]], 0xffffff, 0xffffff, 0xd3dfea);
    },
  },
  drift: {
    width: 110,
    height: 50,
    draw(ctx) {
      puffy(ctx, [[30, 36, 22], [56, 26, 26], [84, 34, 22], [44, 42, 18], [72, 42, 18]], 0xf4f8fb, 0xffffff, 0xb8c8d8);
      contactShadow(ctx, 55, 48, 52, 3, 0.25);
    },
  },
  shed: {
    width: 104,
    height: 92,
    draw(ctx, p) {
      contactShadow(ctx, 52, 90, 52, 4, 0.4);
      woodGrain(ctx, 10, 30, 84, 62, p.wood, seeded(37), 10);
      ctx.fillStyle = css(p.woodDark, 0.6);
      for (let x = 22; x < 94; x += 12) ctx.fillRect(x, 30, 1.5, 62);
      vGradient(ctx, 38, 50, 28, 42, [[0, 0x2b2320], [1, 0x3a2e24]]);
      ctx.beginPath();
      ctx.moveTo(0, 34);
      ctx.lineTo(52, 4);
      ctx.lineTo(104, 34);
      ctx.closePath();
      ctx.fillStyle = css(p.house.roof);
      ctx.fill();
      puffy(ctx, [[18, 86, 7], [86, 86, 7]], p.flowers[0], shade(p.flowers[0], 1.3), shade(p.flowers[0], 0.7));
    },
  },
  boathouse: {
    width: 128,
    height: 96,
    draw(ctx, p) {
      contactShadow(ctx, 64, 94, 62, 4, 0.4);
      woodGrain(ctx, 8, 34, 112, 62, p.wood, seeded(43), 12);
      ctx.fillStyle = css(p.woodDark, 0.6);
      for (let y = 42; y < 96; y += 9) ctx.fillRect(8, y, 112, 1.2);
      ctx.beginPath();
      ctx.moveTo(36, 96);
      ctx.lineTo(36, 66);
      ctx.quadraticCurveTo(64, 40, 92, 66);
      ctx.lineTo(92, 96);
      ctx.closePath();
      ctx.fillStyle = css(0x1a2a34);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 38);
      ctx.lineTo(64, 2);
      ctx.lineTo(128, 38);
      ctx.closePath();
      ctx.fillStyle = css(p.house.roof);
      ctx.fill();
    },
  },
  hollowTree: {
    width: 112,
    height: 124,
    draw(ctx, p) {
      contactShadow(ctx, 56, 122, 46, 5, 0.4);
      ctx.beginPath();
      ctx.moveTo(30, 124);
      ctx.quadraticCurveTo(34, 70, 38, 40);
      ctx.lineTo(74, 40);
      ctx.quadraticCurveTo(78, 70, 84, 124);
      ctx.closePath();
      const g = ctx.createLinearGradient(30, 0, 84, 0);
      g.addColorStop(0, css(shade(p.trunk, 1.3)));
      g.addColorStop(1, css(shade(p.trunk, 0.6)));
      ctx.fillStyle = g;
      ctx.fill();
      const h = ctx.createRadialGradient(57, 100, 2, 57, 98, 18);
      h.addColorStop(0, css(0x0e0806));
      h.addColorStop(1, css(0x3a2414));
      ctx.fillStyle = h;
      ctx.beginPath();
      ctx.ellipse(57, 98, 14, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      foliage(ctx, [[56, 30, 30], [30, 40, 20], [84, 38, 22], [56, 12, 18]], { base: p.blossom, light: p.blossomLight, dark: p.blossomDark }, { rnd: seeded(13), leaf: 2.8, density: 0.55 });
    },
  },
  iceCave: {
    width: 126,
    height: 86,
    draw(ctx, p) {
      puffy(ctx, [[30, 60, 28], [63, 44, 38], [98, 60, 28]], 0xf2f7fb, 0xffffff, p.grassDark ?? 0xc8d6e3);
      const g = ctx.createRadialGradient(63, 74, 2, 63, 70, 26);
      g.addColorStop(0, css(0x1e3450));
      g.addColorStop(1, css(0x7fb6e6));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(63, 76, 24, 22, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(87, 86);
      ctx.lineTo(39, 86);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = css(0xd8f0ff);
      for (let x = 44; x < 84; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, 56);
        ctx.lineTo(x + 5, 56);
        ctx.lineTo(x + 2.5, 66 + (x % 3) * 2);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
};

export function createSeasonTextures(scene, season) {
  const p = season.palette;
  const k = season.key;
  const style = p.treeStyle ?? (k === 'fall' ? 'autumn' : k === 'spring' ? 'blossom' : 'leafy');
  paintTexture(scene, `tree-${k}`, 140, 172, (ctx) => paintTree(ctx, p, style), { outline: 2 });
  for (const kind of season.hidingSpots ?? []) {
    const spec = HIDE_TEXTURES[kind];
    if (spec) paintTexture(scene, `hide-${kind}-${k}`, spec.width, spec.height, (ctx) => spec.draw(ctx, p), { outline: 2 });
  }
}

export { paintTree };
