import { DEPTH, UI } from '../config/game.js';
import {
  paintTexture, paintChunks, trackForCleanup, css, shade, mix, seeded, radialGlow, vGradient, roundRect, speckle, grassBlades, rock, pine, puffy, contactShadow,
} from './Paint.js';
import { woodGrain } from './TextureFactory.js';
import { guestHouse } from './Backdrop.js';

// Painted terrain and level props. One chunked layer (2×) holds the ground,
// slopes, platforms, pits, flower beds, rails, small obstacles and stations;
// water, snags, overhead bridges, signs and goals are separate painted pieces at
// their own depths. Painted once per scene.
//
// Ground style comes from the palette: groundStyle 'grass' | 'dry' | 'snow'.

let uid = 0;
const key = (name) => `${name}-${(uid += 1)}`;

// ----- ground -----

// Soil cross-section: dark humus under the turf with roots, lighter subsoil
// strata below, embedded stones lit from above; deeper = darker.
export function soil(ctx, x, y, w, h, p, rnd) {
  vGradient(ctx, x, y, w, h, [[0, shade(p.dirt, 0.78)], [0.12, p.dirt], [0.55, shade(p.dirt, 0.92)], [1, p.dirtDark]]);
  // Humus band and its uneven lower edge.
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  for (let xx = x + w; xx >= x - 6; xx -= 6) ctx.lineTo(xx, y + 14 + Math.sin(xx * 0.07) * 3 + rnd() * 3);
  ctx.closePath();
  ctx.fillStyle = css(shade(p.dirtDark, 0.7), 0.55);
  ctx.fill();
  // Faint strata.
  for (let sy = y + 30; sy < y + h; sy += 16 + rnd() * 14) {
    ctx.strokeStyle = css(rnd() < 0.5 ? shade(p.dirt, 1.12) : shade(p.dirtDark, 0.85), 0.35);
    ctx.lineWidth = 1 + rnd() * 2;
    ctx.beginPath();
    ctx.moveTo(x, sy);
    for (let xx = x; xx <= x + w; xx += 14) ctx.lineTo(xx, sy + Math.sin(xx * 0.03 + sy) * 2);
    ctx.stroke();
  }
  // Roots hanging from the turf.
  ctx.lineCap = 'round';
  for (let i = 0; i < w / 18; i++) {
    let rx = x + rnd() * w;
    let ry = y + 6;
    ctx.strokeStyle = css(shade(p.dirt, 1.25), 0.5);
    ctx.lineWidth = 0.6 + rnd() * 0.6;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    const len = 6 + rnd() * 16;
    while (ry < y + 6 + len) {
      ry += 3;
      rx += (rnd() - 0.5) * 3;
      ctx.lineTo(rx, ry);
    }
    ctx.stroke();
  }
  speckle(ctx, x, y + 14, w, h - 14, [p.dirtDark, shade(p.dirt, 1.15), shade(p.dirtDark, 0.7)], w * h / 110, rnd, [0.5, 1.8], 0.55);
  for (let i = 0; i < w / 70; i++) {
    const sx = x + rnd() * (w - 16);
    const sy = y + 22 + rnd() * (h - 34);
    contactShadow(ctx, sx + 7, sy + 8, 9, 2, 0.3);
    rock(ctx, sx, sy, 8 + rnd() * 10, 5 + rnd() * 5, shade(p.rock ?? p.dirtDark, 1.05), rnd);
  }
}

// Top edge: grass lip with blades, dry autumn grass with leaves, or a snow cap.
export function groundTop(ctx, x, y, w, p, rnd, { endCaps = true } = {}) {
  const style = p.groundStyle ?? 'grass';
  if (style === 'snow') {
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 12);
    for (let xx = x - 2; xx <= x + w + 2; xx += 6) ctx.lineTo(xx, y - 3 + Math.sin(xx * 0.09) * 1.6 + rnd() * 1.2);
    ctx.lineTo(x + w + 2, y + 12);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - 4, 0, y + 14);
    g.addColorStop(0, css(0xffffff));
    g.addColorStop(0.7, css(0xe8f0f7));
    g.addColorStop(1, css(0xb8c8d8));
    ctx.fillStyle = g;
    ctx.fill();
    for (let i = 0; i < w / 6; i++) radialGlow(ctx, x + rnd() * w, y - 1 + rnd() * 6, 1.4, 0xffffff, 0.9);
    return;
  }
  const lip = style === 'dry' ? p.grass : p.grass;
  ctx.beginPath();
  ctx.moveTo(x - (endCaps ? 3 : 0), y + 10);
  for (let xx = x; xx <= x + w; xx += 5) ctx.lineTo(xx, y - 1 + Math.sin(xx * 0.13) * 1.2);
  ctx.lineTo(x + w + (endCaps ? 3 : 0), y + 10);
  ctx.quadraticCurveTo(x + w / 2, y + 15, x - (endCaps ? 3 : 0), y + 10);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - 2, 0, y + 14);
  g.addColorStop(0, css(shade(lip, 1.15)));
  g.addColorStop(1, css(p.grassDark));
  ctx.fillStyle = g;
  ctx.fill();
  const cols = style === 'dry' ? [p.grass, shade(p.grass, 1.2), p.grassDark, 0xd9b45a] : [p.grass, shade(p.grass, 1.25), p.grassDark, shade(p.grass, 0.85)];
  vGradient(ctx, x, y + 9, w, 8, [[0, 0x140c06, 0.3], [1, 0x140c06, 0]]); // shade under the turf
  grassBlades(ctx, x, x + w, y + 1, { colors: cols, height: style === 'dry' ? 6 : 9, density: 1.5, lean: 2, rnd, width: 1.1 });
  // A second, taller tuft layer for a less uniform edge.
  grassBlades(ctx, x, x + w, y + 2, { colors: [shade(cols[0], 0.85), cols[1]], height: style === 'dry' ? 9 : 13, density: 0.35, lean: 3, rnd, width: 1.3 });
  if (style === 'dry' && p.leaves) {
    for (let i = 0; i < w / 14; i++) {
      ctx.fillStyle = css(p.leaves[Math.floor(rnd() * p.leaves.length)], 0.95);
      ctx.beginPath();
      ctx.ellipse(x + rnd() * w, y + rnd() * 6, 2.6, 1.4, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Sedimentary rock: strata bands of slightly different tones, each ledge with a
// sunlit top lip and a shadow beneath; vertical fractures with a lit and a dark
// side; pitting and pebbles. Lit from the upper left.
function rockFace(ctx, x, y, w, h, p, rnd) {
  const light = p.rockLight ?? shade(p.rock, 1.2);
  vGradient(ctx, x, y, w, h, [[0, light], [0.12, p.rock], [1, p.rockDark]]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // Strata.
  let sy = y + 6 + rnd() * 6;
  while (sy < y + h) {
    const band = 10 + rnd() * 18;
    const tone = shade(p.rock, 0.86 + rnd() * 0.26);
    ctx.beginPath();
    ctx.moveTo(x, sy);
    for (let xx = x; xx <= x + w + 8; xx += 8) ctx.lineTo(xx, sy + Math.sin(xx * 0.05 + sy) * 1.5 + (rnd() - 0.5) * 1.5);
    ctx.lineTo(x + w + 8, sy + band);
    ctx.lineTo(x, sy + band);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, sy, 0, sy + band);
    g.addColorStop(0, css(shade(tone, 1.12), 0.85));
    g.addColorStop(0.7, css(tone, 0.7));
    g.addColorStop(1, css(shade(tone, 0.72), 0.85));
    ctx.fillStyle = g;
    ctx.fill();
    // Shadow under the ledge above, lit lip on top.
    vGradient(ctx, x, sy, w, 4, [[0, 0x1a1208, 0.28], [1, 0x1a1208, 0]]);
    ctx.strokeStyle = css(0xffffff, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, sy - 0.5);
    ctx.lineTo(x + w, sy - 0.5);
    ctx.stroke();
    sy += band;
  }
  // Vertical fractures: a dark crack with a lit edge on its left.
  for (let i = 0; i < w / 34; i++) {
    let cx = x + 6 + rnd() * (w - 12);
    let cy = y + 4 + rnd() * h * 0.3;
    const len = 14 + rnd() * h * 0.5;
    ctx.lineCap = 'round';
    for (const [dx, col, a, lw] of [[-1, 0xffffff, 0.25, 1], [0, shade(p.rockDark, 0.6), 0.75, 1.3]]) {
      let px = cx + dx;
      let py = cy;
      const r2 = seeded(Math.floor(cx * 7 + cy));
      ctx.strokeStyle = css(col, a);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(px, py);
      while (py < cy + len) {
        py += 4 + r2() * 5;
        px += (r2() - 0.5) * 4;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  // Pitting and pebbles.
  speckle(ctx, x, y + 6, w, h - 6, [p.rockDark, shade(p.rockDark, 0.8), light], w * h / 90, rnd, [0.4, 1.6], 0.5);
  for (let i = 0; i < w / 60; i++) rock(ctx, x + rnd() * (w - 10), y + h * (0.3 + rnd() * 0.6), 5 + rnd() * 6, 3 + rnd() * 3, shade(p.rock, 0.95 + rnd() * 0.2), rnd);
  ctx.restore();
  // Sunlit top edge and rounded side shading.
  vGradient(ctx, x, y, w, 6, [[0, 0xffffff, 0.4], [1, 0xffffff, 0]]);
  const sideL = ctx.createLinearGradient(x, 0, x + 10, 0);
  sideL.addColorStop(0, css(0xffffff, 0.18));
  sideL.addColorStop(1, css(0xffffff, 0));
  ctx.fillStyle = sideL;
  ctx.fillRect(x, y, 10, h);
  const sideR = ctx.createLinearGradient(x + w - 14, 0, x + w, 0);
  sideR.addColorStop(0, css(0x000000, 0));
  sideR.addColorStop(1, css(0x000000, 0.3));
  ctx.fillStyle = sideR;
  ctx.fillRect(x + w - 14, y, 14, h);
}

function paintGround(ctx, seg, p, H, gy) {
  const { x, w, y = gy, kind } = seg;
  const rnd = seeded(x + 1);
  if (kind === 'rock') {
    rockFace(ctx, x, y, w, H - y, p, rnd);
    if (p.groundStyle === 'snow') groundTop(ctx, x, y, w, p, rnd);
    return;
  }
  soil(ctx, x, y + 4, w, H - y - 4, p, rnd);
  groundTop(ctx, x, y, w, p, rnd);
}

function paintSlope(ctx, s, p, H) {
  const rnd = seeded(s.x + 5);
  const yAt = (px) => s.y1 + ((px - s.x) / s.w) * (s.y2 - s.y1);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s.x, s.y1);
  ctx.lineTo(s.x + s.w, s.y2);
  ctx.lineTo(s.x + s.w, H);
  ctx.lineTo(s.x, H);
  ctx.closePath();
  ctx.clip();
  soil(ctx, s.x, Math.min(s.y1, s.y2), s.w, H - Math.min(s.y1, s.y2), p, rnd);
  ctx.restore();
  // Snow cap along the slope.
  ctx.beginPath();
  ctx.moveTo(s.x, s.y1 - 3);
  for (let x = s.x; x <= s.x + s.w; x += 6) ctx.lineTo(x, yAt(x) - 3 + Math.sin(x * 0.09) * 1.2);
  ctx.lineTo(s.x + s.w, s.y2 + 12);
  ctx.lineTo(s.x, s.y1 + 12);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, Math.min(s.y1, s.y2) - 4, 0, Math.max(s.y1, s.y2) + 14);
  g.addColorStop(0, css(p.grass));
  g.addColorStop(1, css(p.grassDark));
  ctx.fillStyle = g;
  ctx.fill();
  if (s.launch) {
    // Ski-jump ramp: timber deck on trestle legs, red lip.
    ctx.fillStyle = css(p.woodDark);
    for (let px = s.x + 10; px < s.x + s.w; px += 26) ctx.fillRect(px, yAt(px), 5, H - yAt(px));
    ctx.beginPath();
    ctx.moveTo(s.x, s.y1 - 6);
    ctx.lineTo(s.x + s.w, s.y2 - 6);
    ctx.lineTo(s.x + s.w, s.y2 + 4);
    ctx.lineTo(s.x, s.y1 + 4);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, s.y2 - 6, 0, s.y1 + 4);
    wg.addColorStop(0, css(shade(p.wood, 1.2)));
    wg.addColorStop(1, css(shade(p.wood, 0.75)));
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.fillStyle = css(0xd94f4a);
    ctx.fillRect(s.x + s.w - 8, s.y2 - 10, 8, 14);
  }
}

function flowers(ctx, p, x, baseY, w, rnd) {
  for (let fx = x; fx < x + w; fx += 7 + rnd() * 7) {
    const h = 7 + rnd() * 10;
    ctx.strokeStyle = css(p.grassDark);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fx, baseY + 2);
    ctx.quadraticCurveTo(fx + 1, baseY - h / 2, fx + (rnd() - 0.5) * 3, baseY - h);
    ctx.stroke();
    radialGlow(ctx, fx, baseY - h, 3.2, p.flowers[Math.floor(rnd() * p.flowers.length)], 1, 1.6);
  }
}

function paintPlatform(ctx, plat, p, H) {
  const { x, y, w, h, kind } = plat;
  const rnd = seeded(x * 3 + y);
  switch (kind) {
    case 'stone':
      contactShadow(ctx, x + w / 2, y + h + 8, w * 0.6, 4, 0.3);
      rock(ctx, x - 2, y - 1, w + 4, h + 10, p.stone, rnd);
      vGradient(ctx, x + 6, y + 1, w - 18, 3, [[0, 0xffffff, 0.6], [1, 0xffffff, 0]]);
      break;
    case 'rock':
      rockFace(ctx, x, y, w, h, p, rnd);
      break;
    case 'fence':
      for (const px of [x, x + w - 7]) vGradient(ctx, px, y, 7, h, [[0, shade(p.woodDark, 1.2)], [1, p.woodDark]]);
      woodGrain(ctx, x - 4, y + 5, w + 8, 6, p.wood, rnd, 2);
      woodGrain(ctx, x - 4, y + h - 14, w + 8, 6, p.wood, rnd, 2);
      break;
    case 'planter':
      woodGrain(ctx, x, y + 6, w, h - 6, p.wood, rnd, 5);
      ctx.fillStyle = css(p.woodDark);
      for (let px = x + 30; px < x + w; px += 30) ctx.fillRect(px, y + 10, 2, h - 10);
      vGradient(ctx, x + 3, y + 2, w - 6, 6, [[0, p.dirtDark], [1, shade(p.dirtDark, 0.7)]]);
      flowers(ctx, p, x + 6, y + 3, w - 12, rnd);
      break;
    case 'bridge': {
      vGradient(ctx, x, y, w, h, [[0, p.stoneLight], [1, shade(p.stone, 0.8)]]);
      ctx.strokeStyle = css(shade(p.stone, 0.8));
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h + 34, w / 2 + 6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.fillStyle = css(p.woodDark);
      for (let px = x + 4; px < x + w; px += 20) ctx.fillRect(px, y - 16, 4, 16);
      woodGrain(ctx, x, y - 18, w, 4, p.wood, rnd, 1);
      break;
    }
    case 'halt': {
      for (let px = x + 12; px < x + w; px += 70) vGradient(ctx, px, y + h, 8, H - y - h, [[0, p.woodDark], [1, shade(p.woodDark, 0.6)]]);
      vGradient(ctx, x, y, w, h, [[0, p.stoneLight], [1, p.stone]]);
      vGradient(ctx, x + 20, y - 96, 6, 96, [[0, shade(p.woodDark, 1.2)], [1, p.woodDark]]);
      vGradient(ctx, x + w - 26, y - 96, 6, 96, [[0, shade(p.woodDark, 1.2)], [1, p.woodDark]]);
      roundRect(ctx, x + 2, y - 110, w - 4, 16, 4);
      vGradient(ctx, x + 2, y - 110, w - 4, 16, [[0, shade(p.roof ?? 0x7a1f2b, 1.2)], [1, shade(p.roof ?? 0x7a1f2b, 0.75)]]);
      lantern(ctx, x + w / 2, y - 92, p);
      break;
    }
    case 'jetty':
      for (let px = x + 10; px < x + w; px += 60) vGradient(ctx, px, y + h, 8, H - y - h, [[0, p.woodDark], [1, shade(p.woodDark, 0.5)]]);
      woodGrain(ctx, x, y, w, h, p.wood, rnd, 3);
      ctx.fillStyle = css(p.woodDark, 0.8);
      for (let px = x + 18; px < x + w; px += 18) ctx.fillRect(px, y, 1.5, h);
      break;
    case 'crate':
      woodGrain(ctx, x, y, w, h, p.wood, rnd, 6);
      ctx.strokeStyle = css(p.woodDark);
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + w - 3, y + h - 3);
      ctx.moveTo(x + w - 3, y + 3);
      ctx.lineTo(x + 3, y + h - 3);
      ctx.stroke();
      break;
    case 'log': {
      roundRect(ctx, x, y, w, h, h / 2);
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, css(shade(p.wood, 1.15)));
      g.addColorStop(1, css(shade(p.wood, 0.6)));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = css(0xf0cf9c);
      ctx.beginPath();
      ctx.ellipse(x + w - 5, y + h / 2, 5, h / 2 - 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css(shade(p.wood, 0.7));
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(x + w - 5, y + h / 2, 2.5, h / 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    default: // wood ledge
      woodGrain(ctx, x, y, w, h, p.wood, rnd, 3);
      vGradient(ctx, x, y + h - 4, w, 4, [[0, p.woodDark], [1, shade(p.woodDark, 0.7)]]);
      ctx.fillStyle = css(p.woodDark);
      ctx.fillRect(x + 10, y + h, 5, 12);
      ctx.fillRect(x + w - 15, y + h, 5, 12);
  }
}

function lantern(ctx, x, y, p) {
  radialGlow(ctx, x, y, 22, p.lamp ?? 0xffd889, 0.5);
  ctx.fillStyle = css(p.lamp ?? 0xffd889);
  roundRect(ctx, x - 4, y - 5, 8, 10, 2);
  ctx.fill();
}

function paintPit(ctx, pit, p, gy, H) {
  const { x, w } = pit;
  vGradient(ctx, x, gy + 8, w, H - gy - 8, [[0, p.pit, 0.45], [1, shade(p.pit, 0.5), 1]]);
  const rnd = seeded(x + 9);
  for (const side of [0, 1]) {
    ctx.fillStyle = css(shade(p.rockDark ?? p.dirtDark, 0.85));
    ctx.beginPath();
    const ex = side ? x + w : x;
    const dir = side ? -1 : 1;
    ctx.moveTo(ex, gy + 6);
    for (let y = gy + 6; y < H; y += 12) ctx.lineTo(ex + dir * (6 + rnd() * 12), y);
    ctx.lineTo(ex, H);
    ctx.closePath();
    ctx.fill();
  }
}

function paintStructure(ctx, st, p, gy, H) {
  const rnd = seeded(st.x + 13);
  if (st.kind === 'rails' || st.kind === 'trestle') {
    if (st.kind === 'trestle') {
      ctx.strokeStyle = css(p.woodDark);
      ctx.lineWidth = 5;
      for (let tx = st.x; tx < st.x + st.w; tx += 60) {
        ctx.beginPath();
        ctx.moveTo(tx, gy + 4);
        ctx.lineTo(tx + 60, H);
        ctx.moveTo(tx + 60, gy + 4);
        ctx.lineTo(tx, H);
        ctx.moveTo(tx, gy + 4);
        ctx.lineTo(tx, H);
        ctx.stroke();
      }
      vGradient(ctx, st.x, gy, st.w, 8, [[0, shade(p.woodDark, 1.2)], [1, p.woodDark]]);
    }
    for (let sx = st.x; sx < st.x + st.w; sx += 16) vGradient(ctx, sx, gy - 3, 9, 5, [[0, shade(p.woodDark, 1.25)], [1, p.woodDark]]);
    vGradient(ctx, st.x, gy - 6, st.w, 3, [[0, 0xd8dde3], [1, 0x5a5f66]]);
  } else if (st.kind === 'signalBox') {
    const x = st.x;
    const deckY = gy - 90;
    ctx.fillStyle = css(p.woodDark);
    ctx.fillRect(x - 32, deckY, 6, 90);
    ctx.fillRect(x + 26, deckY, 6, 90);
    ctx.strokeStyle = css(p.woodDark);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 30, deckY + 10);
    ctx.lineTo(x + 28, gy - 10);
    ctx.moveTo(x + 28, deckY + 10);
    ctx.lineTo(x - 30, gy - 10);
    ctx.stroke();
    woodGrain(ctx, x - 40, deckY, 80, 8, p.wood, rnd, 2);
    vGradient(ctx, x - 44, deckY - 70, 88, 10, [[0, shade(p.roof ?? 0x7a1f2b, 1.2)], [1, shade(p.roof ?? 0x7a1f2b, 0.7)]]);
    ctx.fillStyle = css(p.woodDark);
    ctx.fillRect(x - 40, deckY - 60, 4, 60);
    ctx.fillRect(x + 36, deckY - 60, 4, 60);
  }
}

function paintGroundObstacle(ctx, ob, p, groundAt) {
  const w = ob.kind === 'pine' ? 22 : 28;
  const base = groundAt(ob.x + w / 2);
  const top = base - (ob.h ?? (ob.kind === 'pine' ? 38 : 24));
  contactShadow(ctx, ob.x + w / 2, base, w * 0.7, 3, 0.35);
  if (ob.kind === 'pine') pine(ctx, ob.x + w / 2, base, base - top + 4, p.blossomDark, { snow: 0xffffff, light: p.blossom });
  else {
    rock(ctx, ob.x - 3, top, w + 6, base - top, p.rock, seeded(ob.x));
    if (p.groundStyle === 'snow') puffy(ctx, [[ob.x + w / 2, top + 4, w * 0.35]], 0xffffff, 0xffffff, 0xd3dfea);
  }
}

// One chunked painting of all the solid-looking ground in the level.
export function paintTerrain(scene, season, groundAt) {
  const { layout, palette: p } = season;
  const H = scene.scale.height;
  const gy = layout.groundY;
  const tops = [
    ...layout.ground.map((g) => g.y ?? gy),
    ...(layout.platforms ?? []).map((pl) => pl.y - (pl.kind === 'halt' ? 112 : pl.kind === 'bridge' ? 20 : 0)),
    ...(layout.slopes ?? []).map((s) => Math.min(s.y1, s.y2)),
    ...((layout.structures ?? []).some((s) => s.kind === 'signalBox') ? [gy - 162] : []),
  ];
  const y0 = Math.max(0, Math.min(...tops) - 50);
  const images = paintChunks(scene, `terrain-${season.key}`, 0, y0, layout.width, H - y0, (ctx, strip) => {
    const inStrip = (x, w) => x + w >= strip.x0 && x <= strip.x1;
    for (const pit of layout.pits ?? []) if (inStrip(pit.x, pit.w)) paintPit(ctx, pit, p, gy, H);
    for (const st of layout.structures ?? []) if (inStrip(st.x - 50, (st.w ?? 0) + 100)) paintStructure(ctx, st, p, gy, H);
    for (const s of layout.slopes ?? []) if (inStrip(s.x, s.w)) paintSlope(ctx, s, p, H);
    for (const seg of layout.ground) if (inStrip(seg.x, seg.w)) paintGround(ctx, seg, p, H, gy);
    for (const pl of layout.platforms ?? []) if (inStrip(pl.x - 10, pl.w + 20)) paintPlatform(ctx, pl, p, H);
    for (const fb of layout.flowerBeds ?? []) if (inStrip(fb.x, fb.w)) flowers(ctx, p, fb.x, groundAt(fb.x), fb.w, seeded(fb.x));
    for (const ob of layout.obstacles ?? []) if ((ob.kind === 'pine' || ob.kind === 'rock') && inStrip(ob.x - 20, 60)) paintGroundObstacle(ctx, ob, p, groundAt);
  }, { scale: 2, chunk: 768 });
  images.forEach((im) => im.setDepth(DEPTH.terrain));
}

// Quarry cliffs behind the play field (no outline, slightly hazed).
export function paintCliffs(scene, season) {
  const { layout, palette: p } = season;
  const gy = layout.groundY;
  for (const c of layout.cliffs ?? []) {
    const imgs = paintChunks(scene, `cliff-${season.key}`, c.x, gy - c.h, c.w, c.h + 10, (ctx) => {
      const rnd = seeded(c.x + 7);
      let cx = c.x;
      while (cx < c.x + c.w) {
        const sw = Math.min(120 + rnd() * 160, c.x + c.w - cx);
        const sh = c.h * (0.6 + rnd() * 0.4);
        rockFace(ctx, cx, gy - sh, sw, sh + 10, { ...p, rock: p.cliff, rockLight: p.cliffLight, rockDark: p.cliffDark }, rnd);
        cx += sw;
      }
      // Atmospheric haze on the rock only.
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      vGradient(ctx, c.x, gy - c.h, c.w, c.h + 10, [[0, p.skyBottom, 0.2], [1, p.skyBottom, 0.05]]);
      ctx.restore();
    }, { scale: 1 });
    imgs.forEach((im) => im.setDepth(DEPTH.decorBack - 1));
  }
}

// ----- water -----

// Animated water: depth gradient with a sky reflection, scrolling ripple
// highlights (two layers moving at different speeds), a bright surface line and
// glints. Drawn in front of the player so they sink into it.
export function addWater(scene, p, water, top, H) {
  const { x, w, swim } = water;
  const k = key('water');
  paintTexture(scene, k, 8, H - top, (ctx) => {
    vGradient(ctx, 0, 0, 8, H - top, [
      [0, mix(p.waterLight, p.skyTop, 0.3), 0.92],
      [0.12, p.water, 0.86],
      [1, swim ? (p.waterDeep ?? shade(p.water, 0.6)) : shade(p.water, 0.75), swim ? 0.9 : 0.94],
    ]);
  }, { scale: 1 });
  trackForCleanup(scene, k);
  const objs = [];
  objs.push(scene.add.image(x, top, k).setOrigin(0).setDisplaySize(w, H - top).setDepth(DEPTH.water));
  const r1 = scene.add.tileSprite(x, top + 2, w, Math.min(64, H - top), 'water-ripples').setOrigin(0).setDepth(DEPTH.water).setAlpha(0.8);
  const r2 = scene.add.tileSprite(x, top + 8, w, Math.min(64, H - top - 8), 'water-ripples').setOrigin(0).setDepth(DEPTH.water).setAlpha(0.45).setTileScale(1.6, 1);
  objs.push(r1, r2);
  const line = scene.add.rectangle(x, top, w, 2, 0xffffff, 0.75).setOrigin(0).setDepth(DEPTH.water);
  objs.push(line);
  const flow = swim ? 8 : 34; // rivers flow right, lakes just ripple
  scene.events.on('update', (t, dt) => {
    r1.tilePositionX -= (flow * dt) / 1000;
    r2.tilePositionX += ((swim ? 6 : 14) * dt) / 1000;
    r1.y = top + 2 + Math.sin(t / 700) * 1.2;
  });
  objs.push(scene.add.particles(0, 0, 'sparkle', {
    x: { min: x, max: x + w },
    y: { min: top - 1, max: top + 10 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 700,
    frequency: Math.max(60, 40000 / w),
  }).setDepth(DEPTH.water + 1));
  return objs;
}

// A dead branch sticking out of the river.
export function addSnag(scene, p, x, top, surfaceY) {
  const k = key('snag');
  const h = surfaceY - top + 34;
  paintTexture(scene, k, 44, h, (ctx) => {
    ctx.lineCap = 'round';
    const bark = (pts, w) => {
      ctx.strokeStyle = css(shade(p.trunk, 0.7));
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
      ctx.stroke();
      ctx.strokeStyle = css(shade(p.trunk, 1.2));
      ctx.lineWidth = w * 0.4;
      ctx.stroke();
    };
    bark([[20, h], [24, 12]], 7);
    bark([[23, 24], [8, 10]], 4);
    bark([[23, 18], [38, 6]], 4);
    puffy(ctx, [[8, 8, 6], [38, 5, 7], [24, 10, 5]], p.blossom, p.blossomLight, p.blossomDark);
  }, { outline: 2 });
  trackForCleanup(scene, k);
  scene.add.image(x - 16, top - 10, k).setOrigin(0).setScale(0.5).setDepth(DEPTH.water + 2);
}

// Overhead obstacles: a footbridge over the line, or a hill with a low tunnel.
export function addOverhead(scene, p, ob, gy) {
  const { x, y, w, h, kind } = ob;
  if (kind === 'tunnel') {
    const ceiling = y + h;
    const k = key('tunnel');
    const top = ceiling - 170;
    paintTexture(scene, k, w + 160, gy - top, (ctx) => {
      ctx.translate(80 - x, -top);
      ctx.beginPath();
      ctx.moveTo(x - 80, gy);
      ctx.bezierCurveTo(x - 60, ceiling - 60, x - 10, ceiling - 150, x + w / 2, ceiling - 160);
      ctx.bezierCurveTo(x + w + 10, ceiling - 150, x + w + 60, ceiling - 60, x + w + 80, gy);
      ctx.lineTo(x + w, gy);
      ctx.lineTo(x + w, ceiling);
      ctx.lineTo(x, ceiling);
      ctx.lineTo(x, gy);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, ceiling - 160, 0, gy);
      g.addColorStop(0, css(p.rock));
      g.addColorStop(1, css(p.rockDark));
      ctx.fillStyle = g;
      ctx.fill();
      speckle(ctx, x - 60, ceiling - 150, w + 120, 140, [p.rockDark, p.rockLight], 220, seeded(x), [0.6, 2], 0.5);
      const rnd = seeded(x + 1);
      for (let tx = x - 20; tx < x + w + 20; tx += 30) {
        const c = p.leaves[Math.floor(rnd() * p.leaves.length)];
        puffy(ctx, [[tx, ceiling - 140 + Math.abs(tx - x - w / 2) * 0.35 + rnd() * 20, 18]], c, shade(c, 1.3), shade(c, 0.65));
      }
      ctx.strokeStyle = css(p.stoneLight);
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, ceiling);
      ctx.lineTo(x + w, ceiling);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
      vGradient(ctx, x, ceiling, w, gy - ceiling, [[0, 0x140c08, 0.6], [1, 0x140c08, 0.35]]);
    }, { outline: 2 });
    trackForCleanup(scene, k);
    scene.add.image(x - 80, top, k).setOrigin(0).setScale(0.5).setDepth(DEPTH.foreground);
    return;
  }
  const back = key('fb-back');
  paintTexture(scene, back, w, scene.scale.height - y - h, (ctx, W, Hh) => {
    for (const px of [6, w - 18]) vGradient(ctx, px, 0, 12, Hh, [[0, p.stoneLight], [1, shade(p.stone, 0.6)]]);
  }, { scale: 1 });
  trackForCleanup(scene, back);
  scene.add.image(x, y + h, back).setOrigin(0).setDepth(DEPTH.decorBack);
  const deck = key('fb-deck');
  paintTexture(scene, deck, w, h + 18, (ctx) => {
    vGradient(ctx, 0, 16, w, h, [[0, p.stoneLight], [1, shade(p.stone, 0.75)]]);
    ctx.fillStyle = css(p.woodDark);
    for (let px = 2; px < w; px += 14) ctx.fillRect(px, 2, 3, 14);
    woodGrain(ctx, 0, 0, w, 3, p.wood, seeded(x), 1);
  }, { outline: 2 });
  trackForCleanup(scene, deck);
  scene.add.image(x, y - 16, deck).setOrigin(0).setScale(0.5).setDepth(DEPTH.foreground);
}

// Wooden sign with a painted board.
export function addSign(scene, p, x, groundY, text) {
  const label = scene.add
    .text(x, groundY - 66, text, { fontFamily: UI.font, fontSize: '15px', color: '#4a2f1f', fontStyle: '700' })
    .setOrigin(0.5)
    .setDepth(DEPTH.decor + 1);
  const bw = label.width + 22;
  const k = key('sign');
  paintTexture(scene, k, bw + 4, 86, (ctx) => {
    vGradient(ctx, bw / 2 - 1, 30, 6, 56, [[0, shade(p.woodDark, 1.2)], [1, p.woodDark]]);
    roundRect(ctx, 2, 2, bw, 32, 6);
    ctx.fillStyle = css(p.woodDark);
    ctx.fill();
    roundRect(ctx, 4, 4, bw - 4, 28, 5);
    const g = ctx.createLinearGradient(0, 4, 0, 32);
    g.addColorStop(0, css(0xf8e8c8));
    g.addColorStop(1, css(0xe0c89c));
    ctx.fillStyle = g;
    ctx.fill();
    contactShadow(ctx, bw / 2 + 2, 84, 12, 2, 0.4);
  }, { outline: 2 });
  trackForCleanup(scene, k);
  scene.add.image(x - bw / 2 - 2, groundY - 84, k).setOrigin(0).setScale(0.5).setDepth(DEPTH.decor);
}

// Garden-gate style goal arch with flowers.
export function addGoal(scene, p, { x, label }, groundY) {
  const k = key('goal');
  paintTexture(scene, k, 150, 150, (ctx) => {
    contactShadow(ctx, 75, 148, 70, 4, 0.35);
    for (const px of [14, 126]) vGradient(ctx, px, 20, 10, 130, [[0, shade(p.wood, 1.2)], [1, p.woodDark]]);
    ctx.strokeStyle = css(p.wood);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(75, 70, 58, Math.PI, Math.PI * 2);
    ctx.stroke();
    const rnd = seeded(x);
    for (let i = 0; i < 26; i++) {
      const a = Math.PI + rnd() * Math.PI;
      radialGlow(ctx, 75 + Math.cos(a) * 58, 70 + Math.sin(a) * 58, 4.5, p.flowers[i % p.flowers.length], 1, 2);
    }
  }, { outline: 2 });
  trackForCleanup(scene, k);
  scene.add.image(x - 75, groundY - 148, k).setOrigin(0).setScale(0.5).setDepth(DEPTH.decorBack);
  scene.add.text(x, groundY - 162, label, {
    fontFamily: UI.titleFont, fontSize: '19px', color: UI.textColor, stroke: UI.strokeColor, strokeThickness: 4,
  }).setOrigin(0.5).setDepth(DEPTH.decor);
}

// The guest house itself as the final goal (Winter): warm windows, chimney smoke.
export function addHouseGoal(scene, season, x, groundY, label) {
  const p = { ...season.palette, snowRoof: season.palette.groundStyle === 'snow', decor: season.guestHouse };
  const k = key('house');
  paintTexture(scene, k, 300, 220, (ctx) => guestHouse(ctx, 150, 214, p, 1.55), { outline: 2 });
  trackForCleanup(scene, k);
  scene.add.image(x - 150, groundY - 214, k).setOrigin(0).setScale(0.5).setDepth(DEPTH.decorBack);
  scene.add.particles(x + 41 * 1.55, groundY - 190, 'puff', {
    speedY: { min: -40, max: -20 },
    speedX: { min: -10, max: 6 },
    scale: { start: 0.4, end: 1.6 },
    alpha: { start: 0.6, end: 0 },
    lifespan: 2600,
    frequency: 300,
  }).setDepth(DEPTH.decorBack);
  scene.add.text(x, groundY - 220, label, {
    fontFamily: UI.titleFont, fontSize: '22px', color: UI.textColor, stroke: UI.strokeColor, strokeThickness: 5,
  }).setOrigin(0.5).setDepth(DEPTH.decor);
}
