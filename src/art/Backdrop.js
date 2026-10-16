import { DEPTH } from '../config/game.js';
import { seededRandom } from './TextureFactory.js';

// Parallax background: fixed sky, then clouds, far hill with the guest house,
// mid hills and near hills, each scrolling slower than the play field.

const LAYERS = {
  clouds: 0.05,
  far: 0.12,
  mid: 0.3,
  near: 0.55,
};

const GUEST_HOUSE_X = 620; // position on the far layer, visible for the whole stage

function addLayer(scene, factor, depth, worldWidth) {
  const W = scene.scale.width;
  const width = W + (worldWidth - W) * factor + 40;
  const g = scene.add.graphics().setScrollFactor(factor, 0).setDepth(depth);
  return { g, width };
}

function hillY(x, { base, amp, seed, bump }) {
  let y = base - amp * (0.5 * Math.sin(x * 0.004 + seed) + 0.3 * Math.sin(x * 0.011 + seed * 2) + 0.2 * Math.sin(x * 0.023 + seed * 3));
  if (bump) y -= bump.height * Math.exp(-(((x - bump.x) / bump.spread) ** 2));
  return y;
}

function drawHills(g, color, width, height, shape) {
  const points = [{ x: 0, y: height }];
  for (let x = 0; x <= width; x += 12) points.push({ x, y: hillY(x, shape) });
  points.push({ x: width, y: height });
  g.fillStyle(color).fillPoints(points, true);
}

function drawGuestHouse(g, c, x, groundY) {
  const y = groundY + 6;
  g.fillStyle(c.trim).fillRect(x + 24, y - 104, 11, 26); // chimney
  g.fillStyle(c.wall).fillRect(x - 52, y - 52, 104, 52);
  g.fillStyle(c.roof).fillTriangle(x - 64, y - 50, x + 64, y - 50, x, y - 100);
  g.fillStyle(c.trim).fillRect(x - 64, y - 52, 128, 4);
  g.fillStyle(c.window);
  g.fillRect(x - 40, y - 40, 16, 14);
  g.fillRect(x + 24, y - 40, 16, 14);
  g.fillCircle(x, y - 70, 7);
  g.fillStyle(c.trim).fillRect(x - 8, y - 32, 16, 32); // door
  g.fillRect(x - 56, y - 2, 112, 4); // porch
}

function drawRoundTree(g, x, baseY, size, trunk, leaves) {
  g.fillStyle(trunk).fillRect(x - size * 0.08, baseY - size * 0.9, size * 0.16, size * 0.9);
  g.fillStyle(leaves).fillCircle(x, baseY - size, size * 0.5);
  g.fillCircle(x - size * 0.35, baseY - size * 0.8, size * 0.35);
  g.fillCircle(x + size * 0.35, baseY - size * 0.8, size * 0.35);
}

function drawPine(g, x, baseY, size, color) {
  g.fillStyle(color).fillTriangle(x - size * 0.35, baseY, x + size * 0.35, baseY, x, baseY - size * 1.3);
}

export function buildBackdrop(scene, palette, worldWidth) {
  const { width: W, height: H } = scene.scale;
  const p = palette;

  const sky = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.sky);
  sky.fillGradientStyle(p.skyTop, p.skyTop, p.skyBottom, p.skyBottom, 1);
  sky.fillRect(0, 0, W, H);
  const sunR = p.sunRadius ?? 36;
  sky.fillStyle(p.sun, 0.25).fillCircle(W * 0.8, 92, sunR * 2.1);
  sky.fillStyle(p.sun, 0.45).fillCircle(W * 0.8, 92, sunR * 1.5);
  sky.fillStyle(p.sun, 1).fillCircle(W * 0.8, 92, sunR);

  const clouds = addLayer(scene, LAYERS.clouds, DEPTH.clouds, worldWidth);
  const rndC = seededRandom(3);
  clouds.g.fillStyle(p.cloud, 0.85);
  for (let x = 60; x < clouds.width; x += 260 + rndC() * 160) {
    const y = 50 + rndC() * 90;
    clouds.g.fillEllipse(x, y, 110, 34);
    clouds.g.fillEllipse(x + 30, y - 14, 70, 34);
    clouds.g.fillEllipse(x - 28, y - 6, 56, 26);
  }

  const far = addLayer(scene, LAYERS.far, DEPTH.far, worldWidth);
  const farShape = { base: H * 0.6, amp: 28, seed: 1, bump: { x: GUEST_HOUSE_X, height: 120, spread: 230 } };
  drawHills(far.g, p.farHill, far.width, H, farShape);
  const rndF = seededRandom(5);
  for (let x = 30; x < far.width; x += 70 + rndF() * 90) {
    if (Math.abs(x - GUEST_HOUSE_X) < 90) continue;
    drawPine(far.g, x, hillY(x, farShape) + 4, 18 + rndF() * 10, p.farTree);
  }
  drawGuestHouse(far.g, p.house, GUEST_HOUSE_X, hillY(GUEST_HOUSE_X, farShape));

  const mid = addLayer(scene, LAYERS.mid, DEPTH.mid, worldWidth);
  const midShape = { base: H * 0.7, amp: 26, seed: 2 };
  drawHills(mid.g, p.midHill, mid.width, H, midShape);
  const rndM = seededRandom(9);
  for (let x = 20; x < mid.width; x += 90 + rndM() * 110) {
    const y = hillY(x, midShape) + 6;
    if (rndM() < 0.5) drawPine(mid.g, x, y, 26 + rndM() * 14, p.midTree);
    else drawRoundTree(mid.g, x, y, 26 + rndM() * 10, p.midTree, p.blossomDark);
  }

  const near = addLayer(scene, LAYERS.near, DEPTH.near, worldWidth);
  const nearShape = { base: H * 0.8, amp: 22, seed: 4 };
  drawHills(near.g, p.nearHill, near.width, H, nearShape);
  const rndN = seededRandom(13);
  for (let x = 60; x < near.width; x += 160 + rndN() * 200) {
    drawRoundTree(near.g, x, hillY(x, nearShape) + 8, 40 + rndN() * 14, p.trunk, p.nearTree);
  }
}
