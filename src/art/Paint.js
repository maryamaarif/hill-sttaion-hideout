// Painting toolkit: every texture in the game is painted in code with the Canvas
// 2D API (gradients, soft shadows, layered strokes) into a Phaser CanvasTexture.
//
//   paintTexture()  one texture, painted once and cached by key. Painted at ART_SCALE
//                   (2×) and shown at 1/ART_SCALE with addArt(), so edges and shading
//                   stay smooth (supersampled).
//   paintChunks()   large art (terrain, backgrounds) split into chunks the GPU can
//                   hold; the chunks belong to one scene run and are freed afterwards.
//
// Static art is painted once; nothing here runs per frame.

export const ART_SCALE = 2;
export const INK = 0x3b2a20;

// ----- colour -----

export const rgb = (hex) => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
export function css(hex, alpha = 1) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return (c[0] << 16) | (c[1] << 8) | c[2];
}
// f < 1 darkens, f > 1 lightens toward white.
export const shade = (hex, f) => (f < 1 ? mix(hex, 0x000000, 1 - f) : mix(hex, 0xffffff, f - 1));

export function seeded(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ----- textures -----

export function paintTexture(scene, key, w, h, draw, { scale = ART_SCALE, outline = 0 } = {}) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, Math.ceil(w * scale), Math.ceil(h * scale));
  const ctx = tex.getContext();
  ctx.save();
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  ctx.restore();
  if (outline) outlineCanvas(tex.getSourceImage(), outline);
  tex.refresh();
  tex.artScale = scale;
  return key;
}

export const artScale = (scene, key) => scene.textures.get(key)?.artScale ?? 1;
// Logical (display) size of a painted texture.
export function artSize(scene, key) {
  const src = scene.textures.get(key).getSourceImage();
  const s = artScale(scene, key);
  return { width: src.width / s, height: src.height / s };
}

// An image of a painted texture at its logical size.
export function addArt(scene, x, y, key) {
  return scene.add.image(x, y, key).setScale(1 / artScale(scene, key));
}

let runCounter = 0;
// Large art split into vertical strips. draw(ctx, strip) paints in absolute coordinates
// (strip = { x0, x1 } lets painters skip work outside the strip);
// each strip is translated so they join seamlessly. Textures are freed when the
// scene shuts down (keys are unique per run, so a restart never collides).
export function paintChunks(scene, name, x0, y0, w, h, draw, { scale = 1, chunk = 1024 } = {}) {
  runCounter += 1;
  const images = [];
  for (let cx = 0; cx < w; cx += chunk) {
    const cw = Math.min(chunk, w - cx);
    const key = `chunk-${name}-${runCounter}-${cx}`;
    paintTexture(scene, key, cw, h, (ctx) => {
      ctx.translate(-(x0 + cx), -y0);
      draw(ctx, { x0: x0 + cx - 64, x1: x0 + cx + cw + 64 }); // strip bounds (with margin)
    }, { scale });
    trackForCleanup(scene, key);
    images.push(scene.add.image(x0 + cx, y0, key).setOrigin(0).setScale(1 / scale));
  }
  return images;
}

export function trackForCleanup(scene, key) {
  if (!scene.paintedKeys) {
    scene.paintedKeys = [];
    scene.events.once('shutdown', () => {
      const keys = scene.paintedKeys;
      scene.paintedKeys = null;
      setTimeout(() => keys.forEach((k) => scene.textures.exists(k) && scene.textures.remove(k)), 0);
    });
  }
  scene.paintedKeys.push(key);
}

// Soft ink outline: ink laid under every see-through pixel near a solid one. The
// ink fades with (sub-pixel) distance from the shape, so the outline stays
// anti-aliased at any display scale, and is composited under semi-transparent edges.
export function outlineCanvas(canvas, px = 2, color = INK, alpha = 0.78) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const ink = rgb(color);
  const R = Math.ceil(px) + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = src[i + 3] / 255;
      if (a >= 0.99) continue;
      // Distance to the nearest solid pixel; partly solid neighbours count as nearer
      // in proportion to their coverage.
      let best = Infinity;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w || (!dx && !dy)) continue;
          const sa = src[(yy * w + xx) * 4 + 3];
          if (sa < 96) continue;
          const d = Math.sqrt(dx * dx + dy * dy) - (sa / 255 - 0.5);
          if (d < best) best = d;
        }
      }
      const cover = Math.min(1, Math.max(0, px + 0.5 - best));
      if (cover <= 0) continue;
      const inkA = alpha * cover * (1 - a);
      const outA = a + inkA;
      for (let c = 0; c < 3; c++) out[i + c] = (src[i + c] * a + ink[c] * inkA) / outA;
      out[i + 3] = outA * 255;
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

// ----- painting primitives -----

export function vGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [t, hex, a = 1] of stops) g.addColorStop(t, css(hex, a));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function radialGlow(ctx, x, y, r, hex, alpha = 1, inner = 0) {
  const g = ctx.createRadialGradient(x, y, inner, x, y, r);
  g.addColorStop(0, css(hex, alpha));
  g.addColorStop(1, css(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A soft contact shadow (dark ellipse fading out).
export function contactShadow(ctx, x, y, rx, ry, alpha = 0.32) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  radialGlow(ctx, 0, 0, rx, 0x1a1410, alpha);
  ctx.restore();
}

// Fluffy shape from overlapping circles with a light top and a shaded bottom.
export function puffy(ctx, blobs, base, light, dark) {
  ctx.fillStyle = css(dark);
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.18, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, css(light));
    g.addColorStop(0.55, css(base));
    g.addColorStop(1, css(mix(base, dark, 0.5)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Grass blades along y between x0 and x1 (curved strokes in several tones).
export function grassBlades(ctx, x0, x1, y, { colors, height = 8, density = 1.4, lean = 1.5, rnd = Math.random, width = 1.2 }) {
  ctx.lineCap = 'round';
  for (let x = x0; x < x1; x += 1 / density) {
    const h = height * (0.45 + rnd() * 0.75);
    const l = (rnd() - 0.3) * lean * 2;
    ctx.strokeStyle = css(colors[Math.floor(rnd() * colors.length)]);
    ctx.lineWidth = width * (0.7 + rnd() * 0.6);
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.quadraticCurveTo(x + l * 0.3, y - h * 0.6, x + l, y - h);
    ctx.stroke();
  }
}

// Speckled texture (soil, stone, snow sparkle).
export function speckle(ctx, x, y, w, h, colors, count, rnd, size = [0.6, 1.8], alpha = 0.6) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = css(colors[Math.floor(rnd() * colors.length)], alpha * (0.4 + rnd() * 0.6));
    const r = size[0] + rnd() * (size[1] - size[0]);
    ctx.beginPath();
    ctx.ellipse(x + rnd() * w, y + rnd() * h, r * 1.4, r, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A rounded stone / rock with a lit top and shaded underside.
export function rock(ctx, x, y, w, h, base, rnd = Math.random) {
  ctx.save();
  ctx.beginPath();
  const pts = 9;
  for (let i = 0; i <= pts; i++) {
    const a = Math.PI + (i / pts) * Math.PI;
    const rr = 0.85 + rnd() * 0.2;
    ctx.lineTo(x + w / 2 + Math.cos(a) * (w / 2) * rr, y + h + Math.sin(a) * h * rr);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
  g.addColorStop(0, css(shade(base, 1.35)));
  g.addColorStop(0.6, css(base));
  g.addColorStop(1, css(shade(base, 0.6)));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

// Pine tree silhouette (tiers), optionally with snow on each tier.
export function pine(ctx, x, base, h, color, { snow = null, light = null } = {}) {
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const top = base - h + t * h * 0.72;
    const half = h * (0.14 + t * 0.12);
    ctx.fillStyle = css(color);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + half, top + h * 0.34);
    ctx.lineTo(x - half, top + h * 0.34);
    ctx.closePath();
    ctx.fill();
    if (light) {
      ctx.fillStyle = css(light, 0.5);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x - half, top + h * 0.34);
      ctx.lineTo(x - half * 0.2, top + h * 0.34);
      ctx.closePath();
      ctx.fill();
    }
    if (snow) {
      ctx.fillStyle = css(snow, 0.9);
      ctx.beginPath();
      ctx.moveTo(x, top + 1);
      ctx.lineTo(x + half * 0.55, top + h * 0.17);
      ctx.lineTo(x - half * 0.55, top + h * 0.17);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = css(shade(color, 0.6));
  ctx.fillRect(x - h * 0.03, base - h * 0.08, h * 0.06, h * 0.08);
}

// ----- realism primitives -----

// Light comes from the upper left (towards the viewer); used to shade volumes.
const LIGHT = (() => {
  const v = [-0.55, -0.7, 0.45];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
})();

// Shade of a point on a sphere-like volume: 0 = in shadow, 1 = fully lit.
function sphereLight(dx, dy) {
  const d2 = Math.min(1, dx * dx + dy * dy);
  const nz = Math.sqrt(1 - d2);
  return Math.max(0, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]);
}

// Leafy canopy painted leaf by leaf: each cluster [x, y, r] is a rough sphere of
// small leaf dabs, shaded by the light direction, darker inside and below (ambient
// occlusion), with sunlit leaves on the upper-left rims and a few sky gaps.
//   colors: { base, light, dark }   (or an array of bases for mixed autumn colours)
export function foliage(ctx, clusters, colors, { rnd = Math.random, leaf = 3.2, density = 0.5, gaps = true } = {}) {
  const pick = (c) => (Array.isArray(c) ? c[Math.floor(rnd() * c.length)] : c);
  const dabs = [];
  for (const [cx, cy, r] of clusters) {
    // Dark core so the canopy never looks see-through.
    const core = ctx.createRadialGradient(cx + r * 0.15, cy + r * 0.2, r * 0.1, cx, cy, r * 0.95);
    core.addColorStop(0, css(shade(pick(colors.dark), 0.75)));
    core.addColorStop(1, css(pick(colors.dark), 0.9));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.05, r * 0.86, 0, Math.PI * 2);
    ctx.fill();
    const n = Math.ceil(r * r * density);
    for (let i = 0; i < n; i++) {
      // Points biased to the surface of the volume.
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(0.25 + rnd() * 0.75);
      const dx = Math.cos(a) * d;
      const dy = Math.sin(a) * d * 0.92;
      const l = sphereLight(dx, dy);
      dabs.push({ x: cx + dx * r, y: cy + dy * r, l, base: pick(colors.base), lightC: pick(colors.light), darkC: pick(colors.dark) });
    }
  }
  // Back to front: shadowed leaves first, sunlit leaves on top.
  dabs.sort((p, q) => p.l - q.l);
  for (const dab of dabs) {
    const t = dab.l;
    const col = t < 0.5 ? mix(dab.darkC, dab.base, t / 0.5) : mix(dab.base, dab.lightC, (t - 0.5) / 0.5);
    const s = leaf * (0.7 + rnd() * 0.6);
    ctx.save();
    ctx.translate(dab.x, dab.y);
    ctx.rotate(rnd() * Math.PI);
    ctx.fillStyle = css(col, 0.92);
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t > 0.8 && rnd() < 0.35) {
      ctx.fillStyle = css(shade(dab.lightC, 1.15), 0.8);
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.15, s * 0.45, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (gaps) {
    // A few small holes where the sky shows through the canopy edge.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const [cx, cy, r] of clusters) {
      for (let i = 0; i < Math.round(r / 9); i++) {
        const a = rnd() * Math.PI * 2;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.78, leaf * (0.6 + rnd() * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// A tree trunk that tapers and forks, with bark shading and rough edges.
export function trunk(ctx, x, base, h, w, color, rnd = Math.random, branches = []) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.75, base);
  ctx.bezierCurveTo(x - w * 0.45, base - h * 0.15, x - w * 0.5, base - h * 0.6, x - w * 0.28, base - h);
  ctx.lineTo(x + w * 0.28, base - h);
  ctx.bezierCurveTo(x + w * 0.5, base - h * 0.6, x + w * 0.45, base - h * 0.15, x + w * 0.75, base);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, css(shade(color, 1.3)));
  g.addColorStop(0.45, css(color));
  g.addColorStop(1, css(shade(color, 0.55)));
  ctx.fillStyle = g;
  ctx.fill();
  // Bark furrows.
  ctx.save();
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < w * 1.4; i++) {
    const bx = x - w * 0.6 + rnd() * w * 1.2;
    const by = base - rnd() * h;
    ctx.strokeStyle = css(shade(color, 0.6), 0.5);
    ctx.lineWidth = 0.6 + rnd() * 0.6;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + (rnd() - 0.5) * 1.5, by - 4 - rnd() * 8);
    ctx.stroke();
  }
  ctx.restore();
  for (const [x1, y1, x2, y2, bw] of branches) {
    ctx.strokeStyle = css(shade(color, 0.85));
    ctx.lineWidth = bw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2 + (rnd() - 0.5) * 6, (y1 + y2) / 2 - 4, x2, y2);
    ctx.stroke();
    ctx.strokeStyle = css(shade(color, 1.25), 0.6);
    ctx.lineWidth = bw * 0.35;
    ctx.stroke();
  }
  // Roots flaring into the ground.
  for (const dir of [-1, 1]) {
    ctx.fillStyle = css(shade(color, dir < 0 ? 1.1 : 0.7));
    ctx.beginPath();
    ctx.moveTo(x + dir * w * 0.4, base - h * 0.08);
    ctx.quadraticCurveTo(x + dir * w * 0.9, base - 2, x + dir * w * 1.4, base);
    ctx.lineTo(x + dir * w * 0.3, base);
    ctx.closePath();
    ctx.fill();
  }
}

// A conifer: irregular tiers of drooping, tapered fronds around a thin trunk, lit
// from the left; snow sits in clumps on the upper side of some fronds.
export function conifer(ctx, x, base, h, color, { snow = null, rnd = Math.random, light = null } = {}) {
  const lit = light ?? shade(color, 1.35);
  ctx.fillStyle = css(shade(color, 0.45));
  ctx.fillRect(x - h * 0.022, base - h * 0.25, h * 0.044, h * 0.25);
  const fronds = [];
  let y = base - h;
  const tiers = Math.max(6, Math.round(h / 11));
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const half = h * (0.04 + t * 0.32) * (0.85 + rnd() * 0.3);
    const count = 2 + Math.round(t * 5);
    for (let s = 0; s < count; s++) {
      for (const dir of [-1, 1]) {
        const reach = half * (0.55 + rnd() * 0.45) * (1 - s * 0.08);
        fronds.push({ x: x + dir * h * 0.01, y: y + h * 0.02 * s + rnd() * h * 0.02, dir, reach, droop: reach * (0.35 + rnd() * 0.25), w: h * (0.035 + t * 0.03) });
      }
    }
    y += (h * 0.86) / tiers * (0.8 + rnd() * 0.4);
  }
  // Inner (shadowed) fronds first, then outer lit ones.
  fronds.sort((a, b) => a.reach - b.reach);
  for (const f of fronds) {
    const l = f.dir < 0 ? 0.6 + rnd() * 0.4 : 0.15 + rnd() * 0.35;
    const col = l > 0.5 ? mix(color, lit, (l - 0.5) * 1.6) : mix(shade(color, 0.55), color, l * 2);
    const tipX = f.x + f.dir * f.reach;
    const tipY = f.y + f.droop;
    ctx.fillStyle = css(col);
    ctx.beginPath();
    ctx.moveTo(f.x, f.y - f.w * 0.5);
    ctx.quadraticCurveTo(f.x + f.dir * f.reach * 0.55, f.y - f.w * 0.2, tipX, tipY);
    ctx.quadraticCurveTo(f.x + f.dir * f.reach * 0.5, f.y + f.w * 0.9, f.x, f.y + f.w * 0.6);
    ctx.closePath();
    ctx.fill();
    // Needle texture along the underside.
    ctx.strokeStyle = css(shade(col, 0.7), 0.7);
    ctx.lineWidth = 0.6;
    for (let k = 1; k < 5; k++) {
      const u = k / 5;
      const nx = f.x + f.dir * f.reach * u;
      const ny = f.y + f.droop * u * u + f.w * 0.3;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + f.dir * 1.5, ny + f.w * 0.5);
      ctx.stroke();
    }
    if (snow && rnd() < 0.55) {
      const u = 0.25 + rnd() * 0.5;
      const sx = f.x + f.dir * f.reach * u;
      const sy = f.y + f.droop * u * u - f.w * 0.35;
      ctx.fillStyle = css(snow, 0.95);
      ctx.beginPath();
      ctx.ellipse(sx, sy, f.reach * (0.2 + rnd() * 0.2), f.w * 0.35, f.dir * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Volumetric cumulus cloud: many soft lobes, sunlit tops, grey-blue bellies.
export function cumulus(ctx, x, y, w, { light = 0xffffff, shadow = 0xb8c6d8, rnd = Math.random, alpha = 0.95 } = {}) {
  const lobes = [];
  const n = Math.round(w / 9);
  for (let i = 0; i < n; i++) {
    const u = rnd();
    const lx = x + u * w;
    const hump = Math.sin(u * Math.PI); // taller in the middle
    const r = w * (0.08 + 0.12 * hump) * (0.7 + rnd() * 0.5);
    lobes.push([lx, y - hump * w * 0.12 - rnd() * r * 0.6, r]);
  }
  // Flat-ish base.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = css(shadow);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + w * 0.04, w * 0.5, w * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  lobes.sort((a, b) => b[1] - a[1]); // lower lobes first
  for (const [lx, ly, r] of lobes) {
    const g = ctx.createRadialGradient(lx - r * 0.35, ly - r * 0.45, r * 0.1, lx, ly, r);
    g.addColorStop(0, css(light));
    g.addColorStop(0.55, css(mix(light, shadow, 0.25)));
    g.addColorStop(1, css(shadow));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
