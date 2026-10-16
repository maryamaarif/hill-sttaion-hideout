// Layered characters, drawn in code.
//
// PLAYER: a body plus clothing layers (bottom, shoes, top, accessories, hat). Each
// layer has its own drawer per style and follows the same pose geometry, so every
// outfit has every pose. An outfit is baked into one texture per pose
// (`pl-<outfitId>-<pose>`, outlined like the rest of the play layer); swapping
// outfits just switches the texture prefix.
//
// POLICE: plain-clothes officers in a seasonal disguise. Every disguise keeps the
// same tell: mirrored sunglasses and an earpiece with a coiled wire.

export const CHAR_FRAME = { width: 40, height: 60, ox: 4, oy: 12 }; // margin for hats / umbrella
export const POSES = ['idle', 'walk1', 'walk2', 'jump', 'fall', 'crouch', 'caught', 'ski', 'skiAir', 'glide'];

const SKIN = 0xf2c9a0;
const HAIR = 0x5a3a28;
const EYE = 0x2b2b2b;

// Leg rectangles [x, y, w, h] in the 32×48 character space; shoes go under each.
const LEGS = {
  idle: [[12, 39, 4, 7], [17, 39, 4, 7]],
  walk1: [[9, 38, 4, 7], [19, 38, 4, 7]],
  walk2: [[13, 39, 4, 7], [16, 38, 4, 6]],
  jump: [[10, 37, 4, 6], [18, 39, 4, 5]],
  fall: [[8, 38, 4, 7], [20, 38, 4, 7]],
  crouch: [[8, 43, 6, 3], [18, 43, 6, 3]],
};

// Arms: upper, lower, hand rectangles. Two entries = both arms visible.
const ARMS = {
  down: [{ upper: [17, 22, 4, 6], lower: [17, 28, 4, 5], hand: [17, 33, 4, 2] }],
  up: [{ upper: [18, 16, 4, 6], lower: [19, 11, 3, 5], hand: [19, 9, 3, 2] }],
  out: [{ upper: [19, 21, 5, 3], lower: [24, 21, 4, 3], hand: [28, 21, 2, 3] }],
  raised: [
    { upper: [10, 13, 3, 8], lower: [10, 7, 3, 6], hand: [10, 5, 3, 2] },
    { upper: [19, 13, 3, 8], lower: [19, 7, 3, 6], hand: [19, 5, 3, 2] },
  ],
  pole: [{ upper: [18, 22, 4, 5], lower: [19, 27, 3, 5], hand: [19, 32, 3, 2] }],
  umbrella: [{ upper: [19, 13, 3, 8], lower: [19, 7, 3, 6], hand: [19, 5, 3, 2] }],
};

// Pose geometry: which legs and arms, a vertical shift for crouching, skis.
const GEO = {
  idle: { legs: 'idle', arm: 'down' },
  walk1: { legs: 'walk1', arm: 'down' },
  walk2: { legs: 'walk2', arm: 'down' },
  jump: { legs: 'jump', arm: 'up' },
  fall: { legs: 'fall', arm: 'out' },
  crouch: { legs: 'crouch', arm: 'down', dy: 12 },
  caught: { legs: 'idle', arm: 'raised' },
  ski: { legs: 'idle', arm: 'pole', skis: true },
  skiAir: { legs: 'jump', arm: 'pole', skis: true },
  glide: { legs: 'jump', arm: 'umbrella' },
};

const shift = ([x, y, w, h], dy) => [x, y + dy, w, h];
const rect = (g, color, r) => g.fillStyle(color).fillRect(...r);
const darker = (c, f = 0.72) =>
  (Math.round(((c >> 16) & 0xff) * f) << 16) | (Math.round(((c >> 8) & 0xff) * f) << 8) | Math.round((c & 0xff) * f);

// ----- player layers -----

function drawBody(g, geo) {
  const dy = geo.dy ?? 0;
  for (const leg of LEGS[geo.legs]) rect(g, SKIN, leg);
  rect(g, SKIN, [11, 20 + dy, 11, geo.dy ? 12 : 17]); // under the clothes
  for (const arm of ARMS[geo.arm]) {
    rect(g, SKIN, shift(arm.upper, dy));
    rect(g, SKIN, shift(arm.lower, dy));
    rect(g, SKIN, shift(arm.hand, dy));
  }
  rect(g, SKIN, [13, 18 + dy, 6, 3]); // neck
  rect(g, SKIN, [11, 11 + dy, 11, 8]); // head
  rect(g, HAIR, [11, 9 + dy, 11, 3]);
  rect(g, HAIR, [11, 9 + dy, 3, 6]);
  rect(g, EYE, [18, 14 + dy, 2, 2]);
}

const BOTTOMS = {
  trousers: (g, geo, b) => legsFull(g, geo, b.color),
  jeans: (g, geo, b) => {
    legsFull(g, geo, b.color);
    for (const [x, y, , h] of LEGS[geo.legs]) rect(g, darker(b.color, 0.8), [x + 1, y, 1, h]);
  },
  corduroy: (g, geo, b) => {
    legsFull(g, geo, b.color);
    for (const [x, y, w, h] of LEGS[geo.legs]) for (let i = 0; i < w; i += 2) rect(g, darker(b.color), [x + i, y, 1, h]);
  },
  snowpants: (g, geo, b) => {
    legsFull(g, geo, b.color, 1);
    for (const [x, y, w] of LEGS[geo.legs]) rect(g, darker(b.color), [x - 1, y + 3, w + 2, 1]);
  },
  shorts: (g, geo, b) => legsTop(g, geo, b.color),
  swim: (g, geo, b) => legsTop(g, geo, b.color, 2),
};
function hips(g, geo, color) {
  rect(g, color, [10, geo.dy ? 40 : 35, 12, 4]);
}
function legsFull(g, geo, color, widen = 0) {
  hips(g, geo, color);
  for (const [x, y, w, h] of LEGS[geo.legs]) rect(g, color, [x - widen, y, w + widen * 2, h]);
}
function legsTop(g, geo, color, len = 3) {
  hips(g, geo, color);
  for (const [x, y, w] of LEGS[geo.legs]) rect(g, color, [x, y, w, len]);
}

const SHOES = {
  shoes: (g, [x, y, w, h], s) => rect(g, s.color, [x, y + h, w + 2, 2]),
  boots: (g, [x, y, w, h], s) => {
    rect(g, s.color, [x, y + h - 3, w + 1, 3]);
    rect(g, darker(s.color), [x, y + h, w + 2, 2]);
  },
  sneakers: (g, [x, y, w, h], s) => {
    rect(g, s.color, [x, y + h, w + 2, 2]);
    rect(g, s.trim ?? 0xd94f4a, [x + 1, y + h, 2, 1]);
  },
  ankleBoots: (g, [x, y, w, h], s) => {
    rect(g, s.color, [x, y + h - 2, w + 1, 2]);
    rect(g, darker(s.color), [x, y + h, w + 2, 2]);
  },
  snowBoots: (g, [x, y, w, h], s) => {
    rect(g, s.color, [x - 1, y + h - 3, w + 3, 5]);
    rect(g, s.trim ?? 0xffffff, [x - 1, y + h - 3, w + 3, 1]);
  },
  bare: (g, [x, y, w, h]) => rect(g, SKIN, [x, y + h, w + 1, 2]),
};

// Tops: torso shape + sleeves ('long', 'short', 'puffy' or none).
const TOPS = {
  coat: { sleeve: 'long', draw: (g, geo, t, top, crouch) => {
    const bottom = crouch ? 44 : 39;
    g.fillStyle(t.color).fillPoints([{ x: 10, y: top + 1 }, { x: 22, y: top + 1 }, { x: 24, y: bottom }, { x: 8, y: bottom }], true);
    rect(g, darker(t.color), [15, top + 2, 1, bottom - top - 2]);
    rect(g, darker(t.color), [9, top + 9, 15, 2]);
    rect(g, t.trim ?? 0xe8c66a, [17, top + 3, 2, 2]);
    rect(g, t.trim ?? 0xe8c66a, [17, top + 13 - (crouch ? 4 : 0), 2, 2]);
  } },
  raincoat: { sleeve: 'long', draw: (g, geo, t, top, crouch) => {
    const bottom = crouch ? 44 : 37;
    g.fillStyle(darker(t.color)).fillCircle(11, top, 3.5); // hood down at the back
    g.fillStyle(t.color).fillPoints([{ x: 10, y: top }, { x: 22, y: top }, { x: 24, y: bottom }, { x: 8, y: bottom }], true);
    rect(g, t.trim, [16, top + 2, 2, 2]);
    rect(g, t.trim, [16, top + 7, 2, 2]);
    if (!crouch) rect(g, t.trim, [16, top + 12, 2, 2]);
    rect(g, darker(t.color), [11, top + 10, 4, 3]); // pocket
  } },
  sweater: { sleeve: 'long', draw: (g, geo, t, top, crouch) => {
    const h = crouch ? 11 : 16;
    rect(g, t.color, [10, top, 13, h]);
    rect(g, t.trim, [10, top + 4, 13, 2]); // knit band
    for (let x = 11; x < 23; x += 3) rect(g, darker(t.color), [x, top + 7, 1, 1]);
    rect(g, darker(t.color), [10, top + h - 2, 13, 2]); // ribbed hem
  } },
  tshirt: { sleeve: 'short', draw: (g, geo, t, top, crouch) => {
    rect(g, t.color, [10, top, 13, crouch ? 11 : 16]);
    rect(g, t.trim ?? darker(t.color), [13, top, 6, 1]);
  } },
  lifejacket: { sleeve: 'short', draw: (g, geo, t, top, crouch) => {
    rect(g, t.under ?? 0xff8c42, [10, top, 13, crouch ? 11 : 16]);
    rect(g, t.color, [10, top, 13, crouch ? 11 : 14]);
    rect(g, darker(t.color), [10, top + 5, 13, 1]);
    rect(g, darker(t.color), [10, top + 9, 13, 1]);
    rect(g, t.trim ?? 0x3b2a20, [15, top + 4, 3, 3]); // buckle
  } },
  swimsuit: { sleeve: null, draw: (g, geo, t, top, crouch) => {
    rect(g, t.color, [11, top + 3, 11, crouch ? 9 : 13]);
    rect(g, t.color, [12, top, 2, 3]);
    rect(g, t.color, [19, top, 2, 3]);
  } },
  puffer: { sleeve: 'puffy', draw: (g, geo, t, top, crouch) => {
    const h = crouch ? 13 : 17;
    rect(g, t.color, [9, top - 1, 15, h]);
    for (let y = top + 3; y < top + h - 1; y += 4) rect(g, darker(t.color), [9, y, 15, 1]);
    rect(g, t.trim ?? darker(t.color), [11, top - 2, 10, 3]); // collar
    rect(g, darker(t.color, 0.6), [16, top, 1, h - 1]); // zip
  } },
};

function drawSleeves(g, geo, kind, color) {
  if (!kind) return;
  const dy = geo.dy ?? 0;
  for (const arm of ARMS[geo.arm]) {
    const u = shift(arm.upper, dy);
    const l = shift(arm.lower, dy);
    if (kind === 'puffy') {
      rect(g, color, [u[0] - 1, u[1], u[2] + 2, u[3]]);
      rect(g, color, [l[0] - 1, l[1], l[2] + 2, l[3]]);
    } else {
      rect(g, color, u);
      if (kind === 'long') rect(g, color, l);
    }
  }
}

const HATS = {
  fedora: (g, dy, h) => {
    rect(g, h.color, [7, 9 + dy, 19, 3]);
    rect(g, h.color, [10, 2 + dy, 13, 8]);
    rect(g, h.trim ?? darker(h.color, 0.5), [10, 7 + dy, 13, 2]);
  },
  sunHat: (g, dy, h) => {
    rect(g, h.color, [3, 9 + dy, 27, 3]);
    rect(g, h.color, [10, 3 + dy, 13, 7]);
    rect(g, h.trim, [10, 7 + dy, 13, 2]);
  },
  beanie: (g, dy, h) => {
    rect(g, h.color, [10, 5 + dy, 13, 6]);
    rect(g, h.color, [11, 4 + dy, 11, 1]);
    rect(g, h.trim, [10, 9 + dy, 13, 3]);
    g.fillStyle(h.trim).fillCircle(16, 3 + dy, 2.5);
  },
};

const ACCESSORIES = {
  sunglasses: (g, geo, a) => {
    const dy = geo.dy ?? 0;
    rect(g, a.color, [14, 13 + dy, 9, 3]);
    rect(g, 0xffffff, [20, 13 + dy, 2, 1]);
  },
  goggles: (g, geo, a) => {
    const dy = geo.dy ?? 0;
    rect(g, 0x2b2b2b, [11, 13 + dy, 11, 2]);
    rect(g, a.color, [16, 12 + dy, 6, 4]);
    rect(g, 0xffffff, [20, 12 + dy, 1, 1]);
  },
  scarf: (g, geo, a) => {
    const dy = geo.dy ?? 0;
    rect(g, a.color, [10, 19 + dy, 13, 3]);
    rect(g, a.color, [10, 22 + dy, 3, geo.dy ? 4 : 6]);
    rect(g, darker(a.color), [10, 25 + dy, 3, 1]);
  },
  gloves: (g, geo, a) => {
    for (const arm of ARMS[geo.arm]) rect(g, a.color, shift(arm.hand, geo.dy ?? 0));
  },
  // Closed and hanging from the hand, or open overhead when gliding.
  umbrella: (g, geo, a) => {
    const dy = geo.dy ?? 0;
    if (geo.arm === 'umbrella') {
      g.lineStyle(2, 0x3b2a20).lineBetween(20, 6, 20, -8);
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = Math.PI + (i / 12) * Math.PI;
        pts.push({ x: 20 + Math.cos(t) * 17, y: -7 + Math.sin(t) * 7 });
      }
      g.fillStyle(a.color).fillPoints(pts, true);
      g.lineStyle(1, darker(a.color)).lineBetween(20, -14, 12, -7).lineBetween(20, -14, 28, -7);
      return;
    }
    if (geo.arm === 'down') {
      rect(g, a.color, [21, 29 + dy, 3, 13 - (geo.dy ? 6 : 0)]);
      rect(g, 0x3b2a20, [22, 27 + dy, 1, 3]);
    }
  },
};

function drawPlayerPose(g, outfit, pose) {
  const geo = GEO[pose];
  const L = outfit.layers;
  const dy = geo.dy ?? 0;
  drawBody(g, geo);
  if (L.bottom) BOTTOMS[L.bottom.style]?.(g, geo, L.bottom);
  if (L.shoes) for (const leg of LEGS[geo.legs]) SHOES[L.shoes.style]?.(g, leg, L.shoes);
  if (geo.skis) {
    rect(g, outfit.skis ?? 0x2f6fd8, [0, 46, 32, 2]);
    rect(g, outfit.skis ?? 0x2f6fd8, [30, 44, 2, 2]);
    const hand = shift(ARMS[geo.arm][0].hand, dy);
    g.lineStyle(1, 0x3b2a20).lineBetween(hand[0] + 1, hand[1], 6, 46);
  }
  if (L.top) {
    const spec = TOPS[L.top.style];
    spec?.draw(g, geo, L.top, 20 + dy, Boolean(geo.dy));
    drawSleeves(g, geo, spec?.sleeve, L.top.sleeve ?? darker(L.top.color, 0.85));
  }
  for (const a of L.accessories ?? []) ACCESSORIES[a.style]?.(g, geo, a);
  if (L.hat) HATS[L.hat.style]?.(g, dy, L.hat);
}

// The original look: the guest's own navy coat, red scarf and brown hat. Used in
// the room and on menus.
export const HOME_OUTFIT = {
  id: 'home',
  layers: {
    top: { style: 'coat', color: 0x34506e, trim: 0xe8c66a },
    bottom: { style: 'trousers', color: 0x2e2e36 },
    shoes: { style: 'shoes', color: 0x1c1410 },
    hat: { style: 'fedora', color: 0x5a3a28, trim: 0x2f1f16 },
    accessories: [{ style: 'scarf', color: 0xd94f4a }],
  },
};

// Bake an outfit's textures (once). `outline` adds the play-layer ink outline.
export function buildOutfit(scene, outfit, outline) {
  for (const pose of POSES) {
    const key = `pl-${outfit.id}-${pose}`;
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.translateCanvas(CHAR_FRAME.ox, CHAR_FRAME.oy);
    drawPlayerPose(g, outfit, pose);
    g.generateTexture(key, CHAR_FRAME.width, CHAR_FRAME.height);
    g.destroy();
    outline?.(scene, key);
  }
}

// ----- police -----

export const POLICE_FRAME = { width: 36, height: 54, ox: 2, oy: 4 };
export const POLICE_POSES = ['idle', 'walk1', 'walk2', 'ski'];
const POLICE_LEGS = {
  idle: [[12, 40, 4, 8], [17, 40, 4, 8]],
  walk1: [[9, 40, 4, 8], [19, 40, 4, 8]],
  walk2: [[13, 40, 4, 8], [16, 40, 4, 7]],
  ski: [[12, 40, 4, 8], [17, 40, 4, 8]],
};
const POLICE_SKIN = 0xd9a77e;

// The tell, on every officer in every season: mirrored sunglasses + earpiece.
function drawTell(g) {
  rect(g, 0x9fb4c8, [14, 8, 9, 3]); // mirrored lenses
  rect(g, 0xe8f4ff, [15, 8, 3, 1]);
  rect(g, 0x5a7894, [14, 10, 9, 1]);
  rect(g, 0x2a2a2e, [12, 8, 2, 1]);
  rect(g, 0xd8dde3, [11, 9, 2, 2]); // earpiece
  g.lineStyle(1, 0xd8dde3);
  for (let y = 11; y < 17; y += 2) g.lineBetween(11, y, 12, y + 1); // coiled wire
}

// Disguise styles: shirt/legs colours plus a prop that sells the cover story.
const DISGUISES = {
  plain: { shirt: 0xe0a83a, legs: 0x7a5c44, shoes: 0x2a2a2e },
  tourist: { shirt: 0xf3e3c3, legs: 0x8f7d5c, shoes: 0x6b4f3a, hat: 'bucket', prop: 'camera' },
  beach: { shirt: 0x37c4b0, pattern: 0xffd23f, legs: 'shorts', shorts: 0xff8c42, shoes: 'flipflops', prop: 'towel' },
  passenger: { shirt: 0xc9a46b, coat: true, legs: 0x4a3a2e, shoes: 0x2a2a2e, hat: 'cap', prop: 'newspaper' },
  skier: { shirt: 0xd94f4a, puffy: true, legs: 0x2f2f3a, shoes: 0x3a3a40, hat: 'beanie' },
};

function drawPolice(g, pose, d) {
  const legs = POLICE_LEGS[pose];
  for (const [x, y, w, h] of legs) {
    if (d.legs === 'shorts') {
      rect(g, POLICE_SKIN, [x, y, w, h]);
      rect(g, d.shorts, [x, y, w, 3]);
    } else rect(g, d.legs, [x, y, w, h]);
    if (d.shoes === 'flipflops') rect(g, 0xffd23f, [x, y + h, w + 2, 1]);
    else rect(g, d.shoes, [x, y + h, w + 2, 2]);
  }
  rect(g, d.legs === 'shorts' ? d.shorts : d.legs, [10, 33, 12, 8]); // hips
  // Shirt / coat.
  if (d.coat) g.fillStyle(d.shirt).fillPoints([{ x: 10, y: 16 }, { x: 22, y: 16 }, { x: 24, y: 40 }, { x: 8, y: 40 }], true);
  else rect(g, d.shirt, [d.puffy ? 9 : 10, 16, d.puffy ? 15 : 13, 18]);
  if (d.pattern) {
    g.fillStyle(d.pattern);
    [[12, 19], [19, 22], [13, 27], [20, 30], [16, 24]].forEach(([x, y]) => g.fillCircle(x, y, 1.5));
  }
  if (d.puffy) for (let y = 20; y < 34; y += 4) rect(g, darker(d.shirt), [9, y, 15, 1]);
  rect(g, darker(d.shirt, 0.85), [16, 18, 4, 9]); // sleeve
  rect(g, POLICE_SKIN, [16, 27, 4, 6]); // forearm
  rect(g, POLICE_SKIN, [13, 14, 6, 3]); // neck
  rect(g, POLICE_SKIN, [11, 4, 11, 11]); // head
  rect(g, 0x2b2018, [10, 2, 12, 4]); // hair
  rect(g, 0x2b2018, [10, 5, 3, 5]);
  drawTell(g);
  if (d.hat === 'bucket') {
    rect(g, 0xe8d3b0, [8, 2, 17, 2]);
    rect(g, 0xe8d3b0, [11, -2, 11, 4]);
  } else if (d.hat === 'cap') {
    rect(g, 0x5a4636, [10, 0, 13, 4]);
    rect(g, 0x5a4636, [20, 3, 5, 2]);
  } else if (d.hat === 'beanie') {
    rect(g, 0x2f6fd8, [10, -1, 13, 5]);
    g.fillStyle(0xffffff).fillCircle(16, -2, 2);
  }
  if (d.prop === 'camera') {
    g.lineStyle(1, 0x2a2a2e).lineBetween(12, 17, 15, 26).lineBetween(21, 17, 19, 26);
    rect(g, 0x2a2a2e, [13, 25, 8, 5]);
    g.fillStyle(0x9fb4c8).fillCircle(17, 27.5, 1.5);
  } else if (d.prop === 'towel') {
    rect(g, 0xffffff, [9, 15, 4, 12]);
    rect(g, 0xd94f4a, [9, 19, 4, 2]);
  } else if (d.prop === 'newspaper') {
    rect(g, 0xf4f1ea, [18, 22, 9, 11]);
    g.fillStyle(0x6d6d73);
    for (let y = 24; y < 32; y += 2) g.fillRect(19, y, 7, 1);
  }
  if (pose === 'ski') {
    rect(g, 0xd94f4a, [0, 48, 32, 2]);
    rect(g, 0xd94f4a, [30, 46, 2, 2]);
    g.lineStyle(1, 0x2a2a2e).lineBetween(18, 30, 8, 48);
  }
}

// Bake one disguise ("look"): police-<look>-<pose> and the walk animation.
export function buildPoliceLook(scene, look, outline) {
  const d = DISGUISES[look] ?? DISGUISES.plain;
  for (const pose of POLICE_POSES) {
    const key = `police-${look}-${pose}`;
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.translateCanvas(POLICE_FRAME.ox, POLICE_FRAME.oy);
    drawPolice(g, pose, d);
    g.generateTexture(key, POLICE_FRAME.width, POLICE_FRAME.height);
    g.destroy();
    outline?.(scene, key);
  }
  const anim = `police-walk-${look}`;
  if (!scene.anims.exists(anim)) {
    scene.anims.create({
      key: anim,
      frames: ['walk1', 'idle', 'walk2', 'idle'].map((p) => ({ key: `police-${look}-${p}` })),
      frameRate: 6,
      repeat: -1,
    });
  }
}
