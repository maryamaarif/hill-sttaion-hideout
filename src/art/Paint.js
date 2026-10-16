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
