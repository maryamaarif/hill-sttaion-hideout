import { DEPTH, UI } from '../config/game.js';
import { createSeasonTextures } from '../art/TextureFactory.js';
import { addArt } from '../art/Paint.js';
import { PLATFORM_SURFACES } from '../config/audio.js';
import {
  paintTerrain, paintCliffs, addWater, addSnag, addOverhead, addSign, addGoal, addHouseGoal,
} from '../art/Terrain.js';
import HidingSpot from '../entities/HidingSpot.js';
import Mover from '../entities/Mover.js';
import Train from '../entities/Train.js';
import { addActionHint } from '../ui/KeyIcons.js';

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
//                [{ x, kind, h? }]       on the ground or a slope: 'pine', 'rock' (jump them)
//   structures   [{ kind, x, w? }]      scenery: 'trestle', 'rails', 'signalBox'
//   slopes       [{ x, w, y1, y2, launch? }]  smooth slopes (see systems/SlopeSystem.js)
//   goal         { x, label, kind? }    kind 'house' = the guest house (Winter)
//   hidingSpots  [{ x, kind, y?, w? }]   see entities/HidingSpot.js
//   keyHints     [{ x, y, actions }]     key icons shown next to an action (no words)
//   trees, flowerBeds, signs, heatZones, police, extraPolice, goal

function addSolid(scene, solids, x, y, w, h, surface = null) {
  const zone = scene.add.zone(x + w / 2, y + h / 2, w, h);
  scene.physics.add.existing(zone, true);
  zone.surface = surface; // footstep sound (config/audio.js STEPS)
  solids.push(zone);
}

function addTrigger(scene, x, y, w, h) {
  const zone = scene.add.zone(x + w / 2, y + h / 2, w, h);
  scene.physics.add.existing(zone, true);
  return zone;
}

// Top of the ground at x: slopes first, then ground segments (which can sit at
// different heights), then the layout's base ground line.
function groundTopAt(layout, x) {
  const slope = (layout.slopes ?? []).find((s) => x >= s.x && x <= s.x + s.w);
  if (slope) return slope.y1 + ((x - slope.x) / slope.w) * (slope.y2 - slope.y1);
  const seg = layout.ground.find((s) => x >= s.x && x < s.x + s.w);
  return seg?.y ?? layout.groundY;
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

  const groundAt = (x) => groundTopAt(layout, x);
  paintCliffs(scene, season);
  for (const x of layout.trees ?? []) {
    addArt(scene, x, groundAt(x) + 4, `tree-${season.key}`).setOrigin(0.5, 1).setDepth(DEPTH.decorBack);
  }
  paintTerrain(scene, season, groundAt);

  const ground = season.footsteps ?? 'grass';
  for (const { x, w, y = gy, kind } of layout.ground) addSolid(scene, solids, x, y, w, H - y, kind === 'rock' ? 'gravel' : ground);
  for (const plat of layout.platforms ?? []) {
    if (plat.solid !== false) addSolid(scene, solids, plat.x, plat.y, plat.w, plat.h, PLATFORM_SURFACES[plat.kind] ?? 'wood');
  }

  // Water: drawn in front of the player so they sink into it. Rivers and streams
  // fail the hurdle on contact; swimmable water lets the player swim and dive.
  for (const water of layout.water ?? []) {
    addWater(scene, p, water, surfaceY, H);
    if (water.swim) swimWaters.push({ x: water.x, w: water.w, surfaceY });
    else hazards.push(addTrigger(scene, water.x, gy + 16, water.w, H - gy));
  }

  for (const ob of layout.obstacles ?? []) {
    if (ob.w) {
      // Overhead: forgiving hitbox slightly smaller than the drawing.
      addOverhead(scene, p, ob, gy);
      obstacles.push(addTrigger(scene, ob.x + 4, ob.y, ob.w - 8, ob.h - 2));
      continue;
    }
    if (ob.kind === 'pine' || ob.kind === 'rock') {
      // Painted with the terrain; forgiving hitbox.
      const w = ob.kind === 'pine' ? 22 : 28;
      const base = groundAt(ob.x + w / 2);
      const top = base - (ob.h ?? (ob.kind === 'pine' ? 38 : 24));
      obstacles.push(addTrigger(scene, ob.x + 5, top + 6, w - 10, base - top - 6));
      continue;
    }
    if (ob.kind === 'snag') addSnag(scene, p, ob.x, ob.top, surfaceY);
    // Forgiving hitbox: narrower and lower than the drawing.
    obstacles.push(addTrigger(scene, ob.x + 4, ob.top + 6, 8, surfaceY - ob.top - 6));
  }

  const speedScale = season.moverSpeedScale ?? 1;
  // Colour-blind mode (toggled by GameScene): deadly water gets a hatch pattern and
  // every obstacle a striped outline, so hazards don't rely on colour alone.
  const colorBlindOverlay = scene.add.graphics().setDepth(DEPTH.water + 3);
  for (const water of layout.water ?? []) {
    if (water.swim) continue;
    colorBlindOverlay.lineStyle(2, 0xffffff, 0.6);
    for (let hx = water.x - (H - surfaceY); hx < water.x + water.w; hx += 14) {
      const x1 = Math.max(water.x, hx);
      const y1 = surfaceY + (x1 - hx);
      const x2 = Math.min(water.x + water.w, hx + (H - surfaceY));
      const y2 = surfaceY + (x2 - hx);
      if (x2 > x1) colorBlindOverlay.lineBetween(x1, y1, x2, y2);
    }
    colorBlindOverlay.lineStyle(3, 0xffffff, 0.9).lineBetween(water.x, surfaceY, water.x + water.w, surfaceY);
  }
  for (const zone of obstacles) {
    const { x, y, width: w, height: h } = zone.body;
    colorBlindOverlay.lineStyle(3, 0x3b2a20, 0.9).strokeRect(x, y, w, h);
    colorBlindOverlay.lineStyle(2, 0xffffff, 0.9);
    for (let sy = y + 4; sy < y + h; sy += 10) colorBlindOverlay.lineBetween(x, sy, x + w, sy - 6);
  }

  const movers = (layout.movers ?? []).map((def) =>
    def.kind === 'train' ? new Train(scene, def, speedScale, season.key) : new Mover(scene, def, speedScale),
  );
  for (const m of movers) hidingSpots.push(...m.hidingSpots);

  for (const def of layout.hidingSpots ?? []) {
    hidingSpots.push(new HidingSpot(scene, def, groundAt(def.x), season.key));
  }

  for (const { x, text } of layout.signs ?? []) addSign(scene, p, x, groundAt(x), text);

  // Key icons (no words) next to an action; GameScene fades them once used.
  const keyHints = (layout.keyHints ?? []).map((h) => {
    const icon = addActionHint(scene, h.x, h.y, h.actions).setDepth(DEPTH.popup);
    scene.tweens.add({ targets: icon, y: h.y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return { icon, actions: h.actions };
  });

  if (layout.goal.kind === 'house') addHouseGoal(scene, season, layout.goal.x, groundAt(layout.goal.x), layout.goal.label);
  else addGoal(scene, p, layout.goal, groundAt(layout.goal.x));
  const goalZone = addTrigger(scene, layout.goal.x - 20, 0, 40, H);

  // Merge the season's hurdle definitions with this layout's trigger lines.
  const hurdles = season.hurdles.map((h) => ({ ...h, ...layout.hurdles[h.key] }));

  // Footstep surface under the player: a moving platform is wood, otherwise the
  // solid they stand on, otherwise (slopes) the season's ground.
  const surfaceAt = (player) => {
    if (player.carrier) return 'wood';
    const b = player.body;
    const under = solids.find((z) => Math.abs(z.body.top - b.bottom) < 6 && b.center.x >= z.body.left && b.center.x <= z.body.right);
    return under?.surface ?? ground;
  };
  return { solids, hazards, obstacles, swimWaters, movers, hidingSpots, goalZone, hurdles, groundAt, surfaceAt, keyHints, colorBlindOverlay };
}

export { addTrigger, groundTopAt };
