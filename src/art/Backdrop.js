import { DEPTH } from '../config/game.js';
import {
  paintTexture, paintChunks, trackForCleanup, css, shade, mix, seeded, radialGlow, vGradient, puffy, pine, roundRect, speckle, grassBlades,
} from './Paint.js';

// Painted parallax backdrop, the same five layers in every season (only the
// palette changes):
//   sky        multi-stop gradient, sun/moon with glow, soft clouds (fixed)
//   mountains  distant range with snow caps and atmospheric haze      (0.06)
//   forest     far pine forest silhouettes, hazed                     (0.15)
//   hills      mid hills: the guest house, cottages, the railway viaduct,
//              a lake with a jetty (spring/summer) or a ski lift (winter) (0.32)
//   near       near trees, fences, benches and lamp posts             (0.6)
//   foreground grass and props that pass in front of the player       (1.2)
// Everything is painted once per scene into chunked textures.

const F = { mountains: 0.06, forest: 0.15, hills: 0.32, near: 0.6, foreground: 1.2 };

function layerWidth(W, worldWidth, f) {
  return Math.ceil(W + Math.max(0, worldWidth - W) * f + 60);
}

// Smooth ridge line: sum of sines plus optional bumps.
function ridge(x, { base, amp, seed, freq = 1, bumps = [] }) {
  let y = base - amp * (0.5 * Math.sin(x * 0.004 * freq + seed) + 0.3 * Math.sin(x * 0.011 * freq + seed * 2) + 0.2 * Math.sin(x * 0.027 * freq + seed * 3));
  for (const b of bumps) y -= b.height * Math.exp(-(((x - b.x) / b.spread) ** 2));
  return y;
}
function fillRidge(ctx, x0, x1, H, shape, color, topLight = null) {
  ctx.beginPath();
  ctx.moveTo(x0, H);
  for (let x = x0; x <= x1 + 8; x += 6) ctx.lineTo(x, ridge(x, shape));
  ctx.lineTo(x1 + 8, H);
  ctx.closePath();
  if (topLight) {
    const top = shape.base - shape.amp - Math.max(0, ...(shape.bumps ?? []).map((b) => b.height));
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, css(topLight));
    g.addColorStop(0.5, css(color));
    g.addColorStop(1, css(shade(color, 0.9)));
    ctx.fillStyle = g;
  } else ctx.fillStyle = css(color);
  ctx.fill();
}

// ----- sky -----

function paintSky(scene, p, key) {
  const { width: W, height: H } = scene.scale;
  paintTexture(scene, key, W, H, (ctx) => {
    vGradient(ctx, 0, 0, W, H, [[0, p.skyTop], [0.55, p.skyMid ?? mix(p.skyTop, p.skyBottom, 0.55)], [1, p.skyBottom]]);
    const sx = W * (p.sunX ?? 0.8);
    const sy = p.sunY ?? 92;
    const r = p.sunRadius ?? 34;
    radialGlow(ctx, sx, sy, r * 5, p.sun, 0.35);
    radialGlow(ctx, sx, sy, r * 2.2, p.sun, 0.5);
    // Soft-edged disc (no hard rim where the lighting wash brightens it).
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, css(mix(0xffffff, p.sun, 0.3)));
    g.addColorStop(0.6, css(mix(0xffffff, p.sun, 0.4)));
    g.addColorStop(1, css(mix(0xffffff, p.sun, 0.45), 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    // Soft clouds (layered, lit from the sun side).
    const rnd = seeded(3);
    for (let i = 0; i < 6; i++) {
      const cx = 60 + i * 170 + rnd() * 60;
      const cy = 40 + rnd() * 90;
      const s = 0.7 + rnd() * 0.6;
      if (Math.hypot(cx + 26 * s - sx, cy - sy) < r + 70 * s) continue; // keep the sun clear
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.filter = 'blur(1.5px)';
      puffy(ctx, [[cx, cy, 20 * s], [cx + 26 * s, cy - 8 * s, 24 * s], [cx + 52 * s, cy, 18 * s], [cx + 22 * s, cy + 8 * s, 18 * s]], p.cloud, 0xffffff, mix(p.cloud, p.skyTop, 0.35));
      ctx.restore();
    }
  }, { scale: 1 });
  trackForCleanup(scene, key);
}

// ----- buildings and props (mid / near layers) -----

function stoneWall(ctx, x, y, w, h, base, rnd) {
  vGradient(ctx, x, y, w, h, [[0, shade(base, 1.1)], [1, shade(base, 0.85)]]);
  for (let yy = y + 2; yy < y + h - 2; yy += 5) {
    for (let xx = x + 1 + ((yy / 5) % 2) * 3; xx < x + w - 3; xx += 6 + rnd() * 2) {
      ctx.fillStyle = css(shade(base, 0.8 + rnd() * 0.4), 0.9);
      roundRect(ctx, xx, yy, 5 + rnd() * 1.5, 4, 1.4);
      ctx.fill();
    }
  }
}

// The guest house: stone walls, sloped tiled roof, chimney, lit windows, porch.
export function guestHouse(ctx, x, ground, p, scale = 1, rnd = seeded(9)) {
  const c = p.house;
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(scale, scale);
  radialGlow(ctx, 0, -40, 120, c.window, 0.12);
  vGradient(ctx, 34, -118, 14, 36, [[0, shade(c.trim, 1.2)], [1, shade(c.trim, 0.8)]]); // chimney
  stoneWall(ctx, -64, -66, 128, 66, c.stone ?? 0xc9bba6, rnd);
  ctx.beginPath();
  ctx.moveTo(-80, -62);
  ctx.lineTo(0, -122);
  ctx.lineTo(80, -62);
  ctx.closePath();
  const rg = ctx.createLinearGradient(-60, -122, 40, -62);
  rg.addColorStop(0, css(shade(c.roof, 1.25)));
  rg.addColorStop(1, css(shade(c.roof, 0.7)));
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = css(shade(c.roof, 0.6), 0.6);
  ctx.lineWidth = 1;
  for (let y = -116; y < -62; y += 6) {
    ctx.beginPath();
    ctx.moveTo(-80, y);
    ctx.lineTo(80, y);
    ctx.stroke();
  }
  ctx.restore();
  if (p.snowRoof) {
    ctx.fillStyle = css(0xffffff);
    ctx.beginPath();
    ctx.moveTo(-82, -60);
    ctx.lineTo(0, -124);
    ctx.lineTo(82, -60);
    ctx.lineTo(70, -58);
    ctx.lineTo(0, -112);
    ctx.lineTo(-70, -58);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = css(shade(c.trim, 0.8));
  ctx.fillRect(-82, -64, 164, 5);
  for (const wx of [-48, -22, 22, 48]) {
    radialGlow(ctx, wx, -36, 16, c.window, 0.45);
    roundRect(ctx, wx - 8, -46, 16, 18, 2);
    const wg = ctx.createLinearGradient(0, -46, 0, -28);
    wg.addColorStop(0, css(shade(c.window, 1.2)));
    wg.addColorStop(1, css(shade(c.window, 0.85)));
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.fillStyle = css(c.trim);
    ctx.fillRect(wx - 0.8, -46, 1.6, 18);
    ctx.fillRect(wx - 8, -38, 16, 1.4);
  }
  radialGlow(ctx, 0, -86, 10, c.window, 0.5);
  ctx.fillStyle = css(c.window);
  ctx.beginPath();
  ctx.arc(0, -86, 6, 0, Math.PI * 2);
  ctx.fill();
  vGradient(ctx, -9, -30, 18, 30, [[0, shade(c.trim, 1.1)], [1, shade(c.trim, 0.7)]]);
  ctx.fillStyle = css(shade(c.trim, 0.7));
  ctx.fillRect(-70, -3, 140, 4);
  ctx.restore();
}

function cottage(ctx, x, ground, p, s, rnd) {
  const c = p.house;
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(s, s);
  stoneWall(ctx, -26, -30, 52, 30, c.stone ?? 0xc9bba6, rnd);
  ctx.beginPath();
  ctx.moveTo(-34, -28);
  ctx.lineTo(0, -56);
  ctx.lineTo(34, -28);
  ctx.closePath();
  ctx.fillStyle = css(shade(c.roof, 0.9));
  ctx.fill();
  if (p.snowRoof) {
    ctx.fillStyle = css(0xffffff, 0.95);
    ctx.beginPath();
    ctx.moveTo(-34, -28);
    ctx.lineTo(0, -57);
    ctx.lineTo(34, -28);
    ctx.lineTo(0, -48);
    ctx.closePath();
    ctx.fill();
  }
  radialGlow(ctx, 12, -16, 8, c.window, 0.5);
  ctx.fillStyle = css(c.window);
  ctx.fillRect(7, -21, 10, 9);
  ctx.restore();
}

// Stone railway viaduct with arches and a rail line on top.
function viaduct(ctx, x0, x1, deckY, groundY, stone, rnd) {
  vGradient(ctx, x0, deckY, x1 - x0, 10, [[0, shade(stone, 1.1)], [1, shade(stone, 0.85)]]);
  const span = 46;
  for (let x = x0; x < x1 - 8; x += span) {
    stoneWall(ctx, x, deckY + 10, 10, groundY - deckY - 10, stone, rnd);
    ctx.fillStyle = css(shade(stone, 0.95));
    ctx.beginPath();
    ctx.moveTo(x + 10, deckY + 10);
    ctx.lineTo(x + span, deckY + 10);
    ctx.lineTo(x + span, deckY + 22);
    ctx.quadraticCurveTo(x + 10 + (span - 10) / 2, deckY + 2, x + 10, deckY + 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = css(0x4a4a50);
  ctx.fillRect(x0, deckY - 2, x1 - x0, 2);
}

export function lampPost(ctx, x, ground, h, p, lit) {
  ctx.strokeStyle = css(0x2e2a28);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, ground);
  ctx.lineTo(x, ground - h);
  ctx.quadraticCurveTo(x, ground - h - 6, x + 6, ground - h - 6);
  ctx.stroke();
  if (lit) radialGlow(ctx, x + 7, ground - h - 3, 18, p.lamp ?? 0xffd889, 0.55);
  ctx.fillStyle = css(lit ? (p.lamp ?? 0xffd889) : 0xe8e0c8);
  ctx.beginPath();
  ctx.moveTo(x + 3, ground - h - 4);
  ctx.lineTo(x + 11, ground - h - 4);
  ctx.lineTo(x + 9, ground - h + 2);
  ctx.lineTo(x + 5, ground - h + 2);
  ctx.closePath();
  ctx.fill();
}

function fence(ctx, x0, x1, ground, wood) {
  ctx.fillStyle = css(shade(wood, 0.75));
  for (let x = x0; x < x1; x += 16) ctx.fillRect(x, ground - 16, 3, 16);
  ctx.fillStyle = css(wood);
  ctx.fillRect(x0, ground - 13, x1 - x0, 2.5);
  ctx.fillRect(x0, ground - 6, x1 - x0, 2.5);
}

function bench(ctx, x, ground, wood) {
  ctx.fillStyle = css(shade(wood, 0.7));
  ctx.fillRect(x + 2, ground - 9, 2, 9);
  ctx.fillRect(x + 20, ground - 9, 2, 9);
  ctx.fillStyle = css(wood);
  ctx.fillRect(x, ground - 10, 24, 3);
  ctx.fillRect(x, ground - 17, 24, 3);
}

function roundTree(ctx, x, ground, size, p, style, rnd) {
  ctx.fillStyle = css(shade(p.trunk, 0.9));
  ctx.fillRect(x - size * 0.06, ground - size * 0.7, size * 0.12, size * 0.7);
  const leaves = style === 'autumn' ? [p.blossom, p.blossomLight, p.blossomDark][Math.floor(rnd() * 3)] : p.nearTree;
  puffy(ctx, [[x, ground - size * 0.9, size * 0.42], [x - size * 0.3, ground - size * 0.72, size * 0.3], [x + size * 0.3, ground - size * 0.74, size * 0.32]], leaves, shade(leaves, 1.3), shade(leaves, 0.7));
}

// ----- foreground props (pass in front of the player) -----

function paintForegroundProps(scene, p, k) {
  const keys = [];
  for (let i = 0; i < 4; i++) {
    const key = `fg-${k}-${i}`;
    keys.push(key);
    paintTexture(scene, key, 90, 40, (ctx) => {
      const rnd = seeded(50 + i);
      ctx.filter = 'blur(0.8px)';
      if (p.groundStyle === 'snow') {
        puffy(ctx, [[30, 34, 16], [52, 30, 20], [72, 36, 14]], 0xf4f8fb, 0xffffff, 0xb8c8d8);
      } else {
        if (i % 2) for (let r = 0; r < 3; r++) puffy(ctx, [[20 + r * 22, 34, 6 + rnd() * 5]], p.rock ?? 0x9c8a78, shade(p.rock ?? 0x9c8a78, 1.3), shade(p.rock ?? 0x9c8a78, 0.6));
        const dark = shade(p.grassDark, 0.6);
        grassBlades(ctx, 6, 84, 40, { colors: [dark, shade(dark, 1.2), p.grassDark], height: 30, density: 0.9, lean: 4, rnd, width: 2.2 });
        if (p.groundStyle === 'dry') for (let l = 0; l < 6; l++) radialGlow(ctx, 10 + rnd() * 70, 30 + rnd() * 8, 4, p.leaves?.[l % 5] ?? 0xe8692a, 0.9, 2);
        else if (p.flowers) for (let f = 0; f < 4; f++) radialGlow(ctx, 14 + rnd() * 60, 12 + rnd() * 16, 3, p.flowers[f % p.flowers.length], 1, 1.5);
      }
    });
  }
  return keys;
}

// ----- build -----

export function buildBackdrop(scene, season, worldWidth) {
  const p = season.palette;
  const k = season.key;
  const { width: W, height: H } = scene.scale;
  const haze = p.haze ?? p.skyBottom;
  const objects = [];
  const add = (imgs, f, depth) => imgs.forEach((im) => objects.push(im.setScrollFactor(f, 0).setDepth(depth)));
  // Each layer is painted only from its highest content down (less overdraw).
  const band = (top) => Math.floor(H * top);

  const skyKey = `sky-${k}-${Math.random().toString(36).slice(2, 7)}`;
  paintSky(scene, p, skyKey);
  objects.push(scene.add.image(0, 0, skyKey).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky));

  // Mountains with snow caps, fading into haze.
  const wM = layerWidth(W, worldWidth, F.mountains);
  add(paintChunks(scene, `mtn-${k}`, 0, band(0.35), wM, H - band(0.35), (ctx) => {
    const shape = { base: H * 0.5, amp: 70, seed: 2, freq: 1.6 };
    const col = mix(p.mountain ?? 0x8a9bb0, haze, 0.35);
    fillRidge(ctx, 0, wM, H, shape, col, shade(col, 1.1));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= wM + 8; x += 6) ctx.lineTo(x, ridge(x, shape));
    ctx.lineTo(wM + 8, H);
    ctx.clip();
    // Snow caps: from the ridge down to a wavy snow line, fading out below it.
    const snowLine = H * 0.5 - 20;
    ctx.beginPath();
    ctx.moveTo(0, snowLine);
    for (let x = 0; x <= wM + 8; x += 4) ctx.lineTo(x, Math.min(snowLine, ridge(x, shape)));
    for (let x = wM + 8; x >= 0; x -= 4) {
      const y = ridge(x, shape);
      ctx.lineTo(x, y < snowLine ? y + (snowLine - y) * 0.55 + Math.sin(x * 0.09) * 3 : snowLine);
    }
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, shape.base - shape.amp, 0, snowLine);
    sg.addColorStop(0, css(p.mountainSnow ?? 0xf4f8fb, 0.95));
    sg.addColorStop(1, css(p.mountainSnow ?? 0xf4f8fb, 0.55));
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.restore();
    vGradient(ctx, 0, H * 0.35, wM, H * 0.65, [[0, haze, 0], [0.6, haze, 0.75], [1, haze, 1]]);
  }), F.mountains, DEPTH.far - 6);

  // Far pine forest.
  const wF = layerWidth(W, worldWidth, F.forest);
  add(paintChunks(scene, `forest-${k}`, 0, band(0.46), wF, H - band(0.46), (ctx) => {
    const shape = { base: H * 0.62, amp: 22, seed: 5 };
    const col = mix(p.farTree, haze, 0.35);
    fillRidge(ctx, 0, wF, H, shape, mix(p.farHill, haze, 0.3));
    const rnd = seeded(11);
    for (let x = 0; x < wF; x += 9 + rnd() * 9) pine(ctx, x, ridge(x, shape) + 6, 26 + rnd() * 18, col, { snow: p.groundStyle === 'snow' ? 0xffffff : null });
    vGradient(ctx, 0, H * 0.5, wF, H * 0.5, [[0, haze, 0.15], [1, haze, 0.6]]);
  }), F.forest, DEPTH.far - 3);

  // Mid hills: guest house, cottages, viaduct, lake/jetty or ski lift.
  const wH = layerWidth(W, worldWidth, F.hills);
  const hillShape = { base: H * 0.7, amp: 26, seed: 1, bumps: [{ x: 620, height: 110, spread: 230 }] };
  const houseGround = ridge(620, hillShape);
  add(paintChunks(scene, `hills-${k}`, 0, band(0.22), wH, H - band(0.22), (ctx) => {
    const rnd = seeded(21);
    fillRidge(ctx, 0, wH, H, hillShape, mix(p.midHill, haze, 0.12), shade(p.midHill, 1.12));
    speckle(ctx, 0, H * 0.55, wH, H * 0.45, [shade(p.midHill, 0.9), shade(p.midHill, 1.08)], wH / 3, rnd, [1, 3], 0.4);
    for (let x = 30; x < wH; x += 60 + rnd() * 80) {
      if (Math.abs(x - 620) < 120) continue;
      const g = ridge(x, hillShape) + 4;
      if (p.treeStyle === 'pine') pine(ctx, x, g, 34 + rnd() * 16, mix(p.midTree, haze, 0.1), { snow: 0xffffff });
      else roundTree(ctx, x, g, 30 + rnd() * 12, { ...p, nearTree: mix(p.midTree, haze, 0.1) }, p.treeStyle, rnd);
    }
    guestHouse(ctx, 620, houseGround + 4, p, 0.8, seeded(9));
    for (const cx of [1150, 1900, 2600]) if (cx < wH - 60) cottage(ctx, cx, ridge(cx, hillShape) + 3, p, 0.8, rnd);
    if (wH > 1500) viaduct(ctx, 1320, 1620, H * 0.56, H, mix(p.stone ?? 0xb8ada0, haze, 0.15), rnd);
    if (p.groundStyle === 'snow' && wH > 900) {
      // Ski lift: pylons climbing the hill, a cable and chairs.
      const pts = [];
      for (let x = 820; x < Math.min(wH - 40, 1700); x += 110) pts.push({ x, y: ridge(x, hillShape) - 34 - (x - 820) * 0.05 });
      ctx.strokeStyle = css(0x3a3a40);
      ctx.lineWidth = 2;
      for (const pt of pts) {
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x, ridge(pt.x, hillShape) + 4);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.beginPath();
      pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
      for (let i = 0; i < pts.length - 1; i++) {
        const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 + 3 };
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x, m.y + 9);
        ctx.stroke();
        ctx.fillStyle = css(0xd94f4a);
        ctx.fillRect(m.x - 5, m.y + 8, 10, 3);
      }
    } else if (p.groundStyle !== 'dry' && wH > 1100) {
      // Lake with reflections and a little jetty.
      const ly = H * 0.78;
      vGradient(ctx, 860, ly, 380, H - ly, [[0, mix(p.water ?? 0x82cbe9, 0xffffff, 0.35)], [1, p.water ?? 0x82cbe9]]);
      ctx.fillStyle = css(0xffffff, 0.5);
      for (let i = 0; i < 14; i++) ctx.fillRect(880 + rnd() * 340, ly + 4 + rnd() * (H - ly - 8), 10 + rnd() * 18, 1.2);
      ctx.fillStyle = css(p.wood ?? 0xb07a48);
      ctx.fillRect(1000, ly + 6, 60, 4);
      for (let x = 1004; x < 1060; x += 14) ctx.fillRect(x, ly + 10, 2, 10);
    }
  }), F.hills, DEPTH.mid);

  // Chimney smoke from the guest house (moves with the hills layer).
  const smoke = scene.add.particles(620 + 0.8 * 41, houseGround + 4 - 0.8 * 118, 'puff', {
    speedY: { min: -26, max: -14 },
    speedX: { min: 4, max: 14 },
    scale: { start: 0.35, end: 1.4 },
    alpha: { start: 0.45, end: 0 },
    lifespan: 3400,
    frequency: 420,
  });
  objects.push(smoke.setScrollFactor(F.hills, 0).setDepth(DEPTH.mid + 1));

  // Near layer: trees, fences, benches, lamp posts.
  const wN = layerWidth(W, worldWidth, F.near);
  add(paintChunks(scene, `near-${k}`, 0, band(0.4), wN, H - band(0.4), (ctx) => {
    const rnd = seeded(31);
    const shape = { base: H * 0.8, amp: 18, seed: 4 };
    fillRidge(ctx, 0, wN, H, shape, p.nearHill, shade(p.nearHill, 1.12));
    for (let x = 40; x < wN; x += 150 + rnd() * 180) {
      const g = ridge(x, shape) + 6;
      const roll = rnd();
      if (p.treeStyle === 'pine') pine(ctx, x, g, 70 + rnd() * 30, p.nearTree, { snow: 0xffffff, light: shade(p.nearTree, 1.3) });
      else roundTree(ctx, x, g, 56 + rnd() * 22, p, p.treeStyle, rnd);
      if (roll < 0.3) fence(ctx, x + 30, x + 110, ridge(x + 70, shape) + 4, p.wood ?? 0xb07a48);
      else if (roll < 0.5) bench(ctx, x + 40, ridge(x + 50, shape) + 4, p.wood ?? 0xb07a48);
      else if (roll < 0.75) lampPost(ctx, x + 50, ridge(x + 50, shape) + 4, 30, p, p.lampsLit);
    }
    vGradient(ctx, 0, H * 0.7, wN, H * 0.3, [[0, haze, 0], [1, haze, 0.12]]);
  }), F.near, DEPTH.near);

  // Foreground: blurred grass / props at the bottom edge, in front of the player.
  const fgKeys = paintForegroundProps(scene, p, k);
  const rnd = seeded(61);
  const wFG = Math.ceil(worldWidth * F.foreground + W);
  for (let x = 40; x < wFG; x += 170 + rnd() * 220) {
    const img = scene.add.image(x, H + 6, fgKeys[Math.floor(rnd() * fgKeys.length)]).setOrigin(0.5, 1);
    img.setScale(0.5 * (0.9 + rnd() * 0.5));
    objects.push(img.setScrollFactor(F.foreground, 0).setDepth(DEPTH.foreground + 2).setAlpha(0.95));
  }
  return objects;
}
