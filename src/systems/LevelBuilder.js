import { DEPTH, UI } from '../config/game.js';
import { createSeasonTextures, seededRandom } from '../art/TextureFactory.js';
import HidingSpot from '../entities/HidingSpot.js';
import Mover from '../entities/Mover.js';
import Train from '../entities/Train.js';

// Turns a season's layout data into terrain, hazards, hiding spots, moving
// platforms and the goal. Shared by every season: a new season only needs a
// config + layout file. Layout keys (all optional except ground/goal/hurdles):
//   ground       [{ x, w, y?, kind? }]   y defaults to groundY; kind 'rock' = quarry rock
//   pits         [{ x, w }]              dark drop-offs drawn in ground gaps
//   cliffs       [{ x, w, h }]           rock walls behind the play field
//   platforms    [{ x, y, w, h, kind, solid? }]  wood, stone, fence, planter, rock, bridge,
//                                        jetty, halt (solid: false = scenery only)
//   water        [{ x, w, swim? }]       swim: true = swimmable, otherwise falling in fails
//   obstacles    [{ x, top, kind }]      touching one fails the hurdle (e.g. 'snag')
//                [{ x, y, w, h, kind }]  overhead: 'footbridge', 'tunnel' (duck under them)
//   movers       [{ kind, mode, from, to, y, w, speed, phase? }]  see entities/Mover.js
//                kind 'train': see entities/Train.js
//   structures   [{ kind, x, w? }]      scenery: 'trestle', 'rails', 'signalBox'
//   hidingSpots  [{ x, kind, y?, w? }]   see entities/HidingSpot.js
//   trees, flowerBeds, signs, heatZones, police, extraPolice, goal

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

// Top of the ground at x (ground segments can sit at different heights).
function groundTopAt(layout, x) {
  const seg = layout.ground.find((s) => x >= s.x && x < s.x + s.w);
  return seg?.y ?? layout.groundY;
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

function drawRock(g, p, x, y, w, h) {
  g.fillStyle(p.rock).fillRect(x, y, w, h);
  const rnd = seededRandom(x + 3);
  g.fillStyle(p.rockDark);
  for (let sy = y + 22; sy < y + h; sy += 18 + rnd() * 10) g.fillRect(x, sy, w, 2); // strata
  for (let i = 0; i < w / 30; i++) g.fillRect(x + rnd() * (w - 10), y + 10 + rnd() * (h - 20), 8, 3);
  g.fillRect(x, y, 3, h);
  g.fillRect(x + w - 3, y, 3, h);
  g.fillStyle(p.rockLight).fillRect(x, y, w, 5);
}

function drawFlowers(g, p, x, baseY, w, seed) {
  const rnd = seededRandom(seed);
  for (let fx = x; fx < x + w; fx += 9 + rnd() * 8) {
    const h = 7 + rnd() * 9;
    g.lineStyle(2, p.grassDark).lineBetween(fx, baseY, fx, baseY - h);
    g.fillStyle(p.flowers[Math.floor(rnd() * p.flowers.length)]).fillCircle(fx, baseY - h, 3);
  }
}

function drawPlatform(g, p, H, { x, y, w, h, kind }) {
  switch (kind) {
    case 'stone':
      g.fillStyle(p.stone).fillRoundedRect(x, y, w, h + 10, 7);
      g.fillStyle(p.stoneLight).fillRoundedRect(x + 5, y + 2, w - 18, 4, 2);
      break;
    case 'rock':
      drawRock(g, p, x, y, w, h);
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
    case 'bridge': // stone footbridge with a railing; no pillars so boats pass under
      g.fillStyle(p.stone).fillRect(x, y, w, h);
      g.fillStyle(p.stoneLight).fillRect(x, y, w, 4);
      g.lineStyle(5, p.stone).beginPath();
      g.arc(x + w / 2, y + h + 34, w / 2 + 6, Math.PI * 1.15, Math.PI * 1.85).strokePath();
      g.fillStyle(p.woodDark);
      for (let px = x + 4; px < x + w; px += 20) g.fillRect(px, y - 16, 4, 16);
      g.fillRect(x, y - 18, w, 4);
      break;
    case 'crate':
      g.fillStyle(p.woodDark).fillRect(x, y, w, h);
      g.fillStyle(p.wood).fillRect(x + 3, y + 3, w - 6, h - 6);
      g.lineStyle(3, p.woodDark).lineBetween(x + 3, y + 3, x + w - 3, y + h - 3);
      g.lineBetween(x + w - 3, y + 3, x + 3, y + h - 3);
      break;
    case 'halt': { // small station platform over the gorge, with a shelter
      g.fillStyle(p.woodDark);
      for (let px = x + 12; px < x + w; px += 70) g.fillRect(px, y + h, 8, H - y - h);
      g.fillStyle(p.stone).fillRect(x, y, w, h);
      g.fillStyle(p.stoneLight).fillRect(x, y, w, 3);
      g.fillStyle(p.woodDark).fillRect(x + 20, y - 96, 6, 96);
      g.fillRect(x + w - 26, y - 96, 6, 96);
      g.fillStyle(p.roof).fillRect(x + 6, y - 106, w - 12, 14);
      break;
    }
    case 'jetty': // wooden pier on posts reaching into the water
      g.fillStyle(p.woodDark);
      for (let px = x + 10; px < x + w; px += 60) g.fillRect(px, y + h, 8, H - y - h);
      g.fillStyle(p.wood).fillRect(x, y, w, h);
      g.fillStyle(p.woodDark);
      for (let px = x + 18; px < x + w; px += 18) g.fillRect(px, y, 2, h);
      g.fillRect(x, y + h - 3, w, 3);
      break;
    default: // wood ledge
      g.fillStyle(p.wood).fillRect(x, y, w, h);
      g.fillStyle(p.woodDark).fillRect(x, y + h - 4, w, 4);
      g.fillRect(x + 10, y + h, 5, 12);
      g.fillRect(x + w - 15, y + h, 5, 12);
  }
}

function drawPit(g, p, x, top, w, H) {
  g.fillGradientStyle(p.pit, p.pit, p.pit, p.pit, 0.35, 0.35, 0.95, 0.95);
  g.fillRect(x, top + 10, w, H - top - 10);
  g.fillStyle(p.rockDark);
  g.fillTriangle(x, top + 10, x + 14, top + 40, x, top + 90);
  g.fillTriangle(x + w, top + 10, x + w - 14, top + 50, x + w, top + 100);
}

function drawCliff(g, p, { x, w, h }, groundY) {
  const rnd = seededRandom(x + 7);
  let cx = x;
  while (cx < x + w) {
    const sw = 120 + rnd() * 160;
    const sh = h * (0.6 + rnd() * 0.4);
    g.fillStyle(p.cliff).fillRect(cx, groundY - sh, Math.min(sw, x + w - cx), sh);
    g.fillStyle(p.cliffLight).fillRect(cx, groundY - sh, Math.min(sw, x + w - cx), 5);
    g.fillStyle(p.cliffDark);
    for (let sy = groundY - sh + 24; sy < groundY; sy += 22) g.fillRect(cx, sy, Math.min(sw, x + w - cx), 2);
    cx += sw;
  }
}

function drawWater(scene, p, { x, w, swim }, top, H) {
  const g = scene.add.graphics().setDepth(DEPTH.water);
  g.fillStyle(swim ? p.waterDeep ?? p.water : p.water, swim ? 0.78 : 0.88).fillRect(x, top, w, H - top);
  g.fillStyle(p.waterLight, 0.9).fillRect(x, top, w, 3);
  const shine = scene.add.graphics().setDepth(DEPTH.water);
  shine.fillStyle(p.waterLight, 0.8);
  const rnd = seededRandom(x);
  for (let sx = x + 10; sx < x + w - 60; sx += 50 + rnd() * 40) {
    shine.fillRect(sx, top + 8 + rnd() * 34, 24 + rnd() * 20, 3);
  }
  // Rivers flow right; still water just ripples.
  if (swim) scene.tweens.add({ targets: shine, x: 12, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  else scene.tweens.add({ targets: shine, x: 40, duration: 1100, repeat: -1 });
}

// Overhead obstacles the player must duck under while riding a train.
function drawOverhead(scene, p, { x, y, w, h, kind }, groundY) {
  if (kind === 'tunnel') {
    const ceiling = y + h;
    const hill = scene.add.graphics().setDepth(DEPTH.foreground);
    hill.fillStyle(p.rockDark).fillPoints([
      { x: x - 70, y: groundY }, { x: x - 40, y: ceiling - 40 }, { x: x + 20, y: ceiling - 120 },
      { x: x + w / 2, y: ceiling - 150 }, { x: x + w - 20, y: ceiling - 115 }, { x: x + w + 40, y: ceiling - 40 },
      { x: x + w + 70, y: groundY }, { x: x + w, y: groundY }, { x: x + w, y: ceiling }, { x, y: ceiling }, { x, y: groundY },
    ], true);
    hill.fillStyle(p.rock).fillRect(x, ceiling - 22, w, 22);
    const rnd = seededRandom(x);
    for (let tx = x - 10; tx < x + w + 10; tx += 34) {
      hill.fillStyle(p.leaves[Math.floor(rnd() * p.leaves.length)]).fillCircle(tx, ceiling - 120 + rnd() * 50 + Math.abs(tx - x - w / 2) * 0.4, 18);
    }
    hill.lineStyle(10, p.stone);
    hill.lineBetween(x, groundY, x, ceiling);
    hill.lineBetween(x + w, groundY, x + w, ceiling);
    // Shade inside the tunnel: the train and player stay visible, just darker.
    scene.add.rectangle(x, ceiling, w, groundY - ceiling, 0x1a1210, 0.45).setOrigin(0).setDepth(DEPTH.foreground);
    return;
  }
  // Footbridge over the line: pillars behind the train, deck in front.
  const back = scene.add.graphics().setDepth(DEPTH.decorBack);
  back.fillStyle(p.stone).fillRect(x + 6, y + h, 12, scene.scale.height - y - h);
  back.fillRect(x + w - 18, y + h, 12, scene.scale.height - y - h);
  const deck = scene.add.graphics().setDepth(DEPTH.foreground);
  deck.fillStyle(p.stone).fillRect(x, y, w, h);
  deck.fillStyle(p.stoneLight).fillRect(x, y, w, 3);
  deck.fillStyle(p.woodDark);
  for (let px = x + 2; px < x + w; px += 14) deck.fillRect(px, y - 14, 3, 14);
  deck.fillRect(x, y - 16, w, 3);
}

function drawStructure(g, back, p, { kind, x, w }, groundY, H) {
  if (kind === 'rails') {
    g.fillStyle(p.woodDark);
    for (let sx = x; sx < x + w; sx += 16) g.fillRect(sx, groundY - 3, 8, 5);
    g.fillStyle(0x6d6d73).fillRect(x, groundY - 5, w, 3);
  } else if (kind === 'trestle') {
    back.lineStyle(5, p.woodDark);
    for (let tx = x; tx < x + w; tx += 60) {
      back.lineBetween(tx, groundY + 4, tx + 60, H);
      back.lineBetween(tx + 60, groundY + 4, tx, H);
      back.lineBetween(tx, groundY + 4, tx, H);
    }
    back.fillStyle(p.woodDark).fillRect(x, groundY, w, 8);
    drawStructure(g, back, p, { kind: 'rails', x, w }, groundY, H);
  } else if (kind === 'signalBox') {
    // Lookout tower on stilts: an officer stands on the deck; the path runs beneath.
    const deckY = groundY - 90;
    back.fillStyle(p.woodDark);
    back.fillRect(x - 32, deckY, 6, 90);
    back.fillRect(x + 26, deckY, 6, 90);
    back.lineStyle(3, p.woodDark).lineBetween(x - 30, deckY + 10, x + 28, groundY - 10);
    back.lineBetween(x + 28, deckY + 10, x - 30, groundY - 10);
    back.fillStyle(p.wood).fillRect(x - 40, deckY, 80, 8);
    back.fillStyle(p.roof).fillRect(x - 44, deckY - 70, 88, 10);
    back.fillStyle(p.woodDark).fillRect(x - 40, deckY - 60, 4, 60);
    back.fillRect(x + 36, deckY - 60, 4, 60);
  }
}

function drawSnag(g, p, x, top, surfaceY) {
  g.lineStyle(7, p.trunk).lineBetween(x + 4, surfaceY + 24, x + 8, top);
  g.lineStyle(4, p.trunk).lineBetween(x + 7, top + 12, x - 8, top - 2);
  g.lineBetween(x + 7, top + 6, x + 22, top - 6);
  g.fillStyle(p.blossomDark).fillCircle(x - 9, top - 4, 6);
  g.fillStyle(p.blossom).fillCircle(x + 22, top - 8, 7);
  g.fillCircle(x + 9, top - 4, 5);
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
  const surfaceY = gy + 8;
  createSeasonTextures(scene, season);

  const solids = [];
  const hazards = [];
  const obstacles = [];
  const swimWaters = [];
  const hidingSpots = [];

  const back = scene.add.graphics().setDepth(DEPTH.decorBack - 1);
  for (const cliff of layout.cliffs ?? []) drawCliff(back, p, cliff, gy);

  for (const x of layout.trees ?? []) {
    scene.add.image(x, groundTopAt(layout, x) + 4, `tree-${season.key}`).setOrigin(0.5, 1).setDepth(DEPTH.decorBack);
  }

  const terrain = scene.add.graphics().setDepth(DEPTH.terrain);
  for (const { x, w } of layout.pits ?? []) drawPit(terrain, p, x, gy, w, H);
  for (const { x, w, y = gy, kind } of layout.ground) {
    if (kind === 'rock') drawRock(terrain, p, x, y, w, H - y);
    else drawGround(terrain, p, x, y, w, H - y);
    addSolid(scene, solids, x, y, w, H - y);
  }
  for (const plat of layout.platforms ?? []) {
    drawPlatform(terrain, p, H, plat);
    if (plat.solid !== false) addSolid(scene, solids, plat.x, plat.y, plat.w, plat.h);
  }
  for (const st of layout.structures ?? []) drawStructure(terrain, back, p, st, gy, H);

  const decor = scene.add.graphics().setDepth(DEPTH.decor);
  for (const { x, w } of layout.flowerBeds ?? []) drawFlowers(decor, p, x, groundTopAt(layout, x), w, x);

  // Water: drawn in front of the player so they sink into it. Rivers and streams
  // fail the hurdle on contact; swimmable water lets the player swim and dive.
  for (const water of layout.water ?? []) {
    drawWater(scene, p, water, surfaceY, H);
    if (water.swim) swimWaters.push({ x: water.x, w: water.w, surfaceY });
    else hazards.push(addTrigger(scene, water.x, gy + 16, water.w, H - gy));
  }

  const front = scene.add.graphics().setDepth(DEPTH.water + 2);
  for (const ob of layout.obstacles ?? []) {
    if (ob.w) {
      // Overhead: forgiving hitbox slightly smaller than the drawing.
      drawOverhead(scene, p, ob, gy);
      obstacles.push(addTrigger(scene, ob.x + 4, ob.y, ob.w - 8, ob.h - 2));
      continue;
    }
    if (ob.kind === 'snag') drawSnag(front, p, ob.x, ob.top, surfaceY);
    // Forgiving hitbox: narrower and lower than the drawing.
    obstacles.push(addTrigger(scene, ob.x + 4, ob.top + 6, 8, surfaceY - ob.top - 6));
  }

  const speedScale = season.moverSpeedScale ?? 1;
  const movers = (layout.movers ?? []).map((def) =>
    def.kind === 'train' ? new Train(scene, def, speedScale, season.key) : new Mover(scene, def, speedScale),
  );
  for (const m of movers) hidingSpots.push(...m.hidingSpots);

  for (const def of layout.hidingSpots ?? []) {
    hidingSpots.push(new HidingSpot(scene, def, groundTopAt(layout, def.x), season.key));
  }

  for (const { x, text } of layout.signs ?? []) addSign(scene, p, x, groundTopAt(layout, x), text);

  addGoal(scene, p, layout.goal, groundTopAt(layout, layout.goal.x));
  const goalZone = addTrigger(scene, layout.goal.x - 20, 0, 40, H);

  // Merge the season's hurdle definitions with this layout's trigger lines.
  const hurdles = season.hurdles.map((h) => ({ ...h, ...layout.hurdles[h.key] }));

  return { solids, hazards, obstacles, swimWaters, movers, hidingSpots, goalZone, hurdles };
}

export { addTrigger, groundTopAt };
