import { DEPTH, UI } from '../config/game.js';
import { createSeasonTextures, seededRandom } from '../art/TextureFactory.js';
import HidingSpot from '../entities/HidingSpot.js';

// Turns a season's layout data into terrain, hazards, hiding spots and the goal.
// Shared by every season: a new season only needs a config + layout file.

function addSolid(scene, solids, x, y, w, h) {
  const zone = scene.add.zone(x + w / 2, y + h / 2, w, h);
  scene.physics.add.existing(zone, true);
  solids.push(zone);
}

function addTrigger(scene, x, y, w, h) {
  const zone = scene.add.zone(x + w / 2, y + h / 2, w, h);
  scene.physics.add.existing(zone, true);
  return zone;
}

function drawGround(g, p, x, y, w, h) {
  g.fillStyle(p.dirt).fillRect(x, y, w, h);
  const rnd = seededRandom(x + 1);
  g.fillStyle(p.dirtDark);
  for (let i = 0; i < w / 14; i++) g.fillRect(x + rnd() * w, y + 18 + rnd() * (h - 24), 4, 3);
  g.fillStyle(p.grassDark).fillRect(x, y + 8, w, 5);
  g.fillStyle(p.grass).fillRect(x, y - 2, w, 11);
  for (let tx = x + 4; tx < x + w - 4; tx += 16) {
    g.fillTriangle(tx, y - 1, tx + 6, y - 1, tx + 3, y - 6 - rnd() * 3);
  }
  g.fillCircle(x + 2, y + 3, 6);
  g.fillCircle(x + w - 2, y + 3, 6);
}

function drawFlowers(g, p, x, baseY, w, seed) {
  const rnd = seededRandom(seed);
  for (let fx = x; fx < x + w; fx += 9 + rnd() * 8) {
    const h = 7 + rnd() * 9;
    g.lineStyle(2, p.grassDark).lineBetween(fx, baseY, fx, baseY - h);
    g.fillStyle(p.flowers[Math.floor(rnd() * p.flowers.length)]).fillCircle(fx, baseY - h, 3);
  }
}

function drawPlatform(g, p, { x, y, w, h, kind }) {
  switch (kind) {
    case 'stone':
      g.fillStyle(p.stone).fillRoundedRect(x, y, w, h + 10, 7);
      g.fillStyle(p.stoneLight).fillRoundedRect(x + 5, y + 2, w - 18, 4, 2);
      break;
    case 'fence':
      g.fillStyle(p.woodDark);
      g.fillRect(x, y, 7, h);
      g.fillRect(x + w - 7, y, 7, h);
      g.fillStyle(p.wood);
      g.fillRect(x - 4, y + 5, w + 8, 6);
      g.fillRect(x - 4, y + h - 14, w + 8, 6);
      break;
    case 'planter':
      g.fillStyle(p.wood).fillRect(x, y + 6, w, h - 6);
      g.fillStyle(p.woodDark).fillRect(x, y + 6, w, 4);
      for (let px = x + 30; px < x + w; px += 30) g.fillRect(px, y + 10, 2, h - 10);
      g.fillStyle(p.dirtDark).fillRect(x + 3, y + 2, w - 6, 5);
      drawFlowers(g, p, x + 6, y + 3, w - 12, x);
      break;
    default: // wood ledge
      g.fillStyle(p.wood).fillRect(x, y, w, h);
      g.fillStyle(p.woodDark).fillRect(x, y + h - 4, w, 4);
      g.fillRect(x + 10, y + h, 5, 12);
      g.fillRect(x + w - 15, y + h, 5, 12);
  }
}

function drawWater(scene, p, x, top, w, H) {
  const g = scene.add.graphics().setDepth(DEPTH.water);
  g.fillStyle(p.water, 0.88).fillRect(x, top, w, H - top);
  const shine = scene.add.graphics().setDepth(DEPTH.water);
  shine.fillStyle(p.waterLight, 0.8);
  const rnd = seededRandom(x);
  for (let sx = x + 10; sx < x + w - 40; sx += 50 + rnd() * 40) {
    shine.fillRect(sx, top + 6 + rnd() * 30, 24 + rnd() * 20, 3);
  }
  scene.tweens.add({ targets: shine, x: 12, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
}

function addSign(scene, p, x, groundY, text) {
  const label = scene.add
    .text(x, groundY - 66, text, { fontFamily: UI.font, fontSize: '15px', color: '#4a2f1f' })
    .setOrigin(0.5)
    .setDepth(DEPTH.decor + 1);
  const bw = label.width + 18;
  const g = scene.add.graphics().setDepth(DEPTH.decor);
  g.fillStyle(p.woodDark).fillRect(x - 3, groundY - 54, 6, 54);
  g.fillStyle(p.woodDark).fillRoundedRect(x - bw / 2 - 2, groundY - 82, bw + 4, 32, 5);
  g.fillStyle(0xf3dfb8).fillRoundedRect(x - bw / 2, groundY - 80, bw, 28, 4);
}

function addGoal(scene, p, { x, label }, groundY) {
  const g = scene.add.graphics().setDepth(DEPTH.decorBack);
  g.fillStyle(p.woodDark);
  g.fillRect(x - 56, groundY - 120, 10, 120);
  g.fillRect(x + 46, groundY - 120, 10, 120);
  g.fillStyle(p.wood).fillRect(x - 66, groundY - 132, 132, 14);
  const rnd = seededRandom(x);
  for (let i = 0; i < 18; i++) {
    g.fillStyle(p.flowers[i % p.flowers.length]);
    g.fillCircle(x - 62 + rnd() * 124, groundY - 136 + rnd() * 18, 4);
  }
  scene.add
    .text(x, groundY - 150, label, {
      fontFamily: UI.font, fontSize: '18px', color: UI.textColor, stroke: UI.strokeColor, strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.decor);
}

export default function buildLevel(scene, season) {
  const { layout, palette: p } = season;
  const H = scene.scale.height;
  const gy = layout.groundY;
  createSeasonTextures(scene, season);

  const solids = [];
  const hazards = [];
  const hidingSpots = [];

  for (const x of layout.trees ?? []) {
    scene.add.image(x, gy + 4, `tree-${season.key}`).setOrigin(0.5, 1).setDepth(DEPTH.decorBack);
  }

  const terrain = scene.add.graphics().setDepth(DEPTH.terrain);
  for (const { x, w } of layout.ground) {
    drawGround(terrain, p, x, gy, w, H - gy);
    addSolid(scene, solids, x, gy, w, H - gy);
  }
  for (const plat of layout.platforms ?? []) {
    drawPlatform(terrain, p, plat);
    addSolid(scene, solids, plat.x, plat.y, plat.w, plat.h);
  }

  const decor = scene.add.graphics().setDepth(DEPTH.decor);
  for (const { x, w } of layout.flowerBeds ?? []) drawFlowers(decor, p, x, gy, w, x);

  // Water: drawn in front of the player so they sink into it; touching it fails the hurdle.
  for (const { x, w } of layout.water ?? []) {
    drawWater(scene, p, x, gy + 8, w, H);
    hazards.push(addTrigger(scene, x, gy + 16, w, H - gy));
  }

  for (const { x, kind } of layout.hidingSpots ?? []) {
    hidingSpots.push(new HidingSpot(scene, x, gy, kind, season.key));
  }

  for (const { x, text } of layout.signs ?? []) addSign(scene, p, x, gy, text);

  addGoal(scene, p, layout.goal, gy);
  const goalZone = addTrigger(scene, layout.goal.x - 20, 0, 40, H);

  // Merge the season's hurdle definitions with this layout's trigger lines.
  const hurdles = season.hurdles.map((h) => ({ ...h, ...layout.hurdles[h.key] }));

  return { solids, hazards, hidingSpots, goalZone, hurdles };
}

export { addTrigger };
