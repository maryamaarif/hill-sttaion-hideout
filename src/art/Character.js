import { paintTexture, css, shade } from './Paint.js';

// Characters: a jointed skeleton (hips, knees, ankles, shoulders, elbows, hands,
// head) posed procedurally, then painted with shaded limbs and clothing layers:
//   back arm → legs (skin, trousers, shoes) → pelvis → top → neckwear → head, hair,
//   hat → front arm (+ umbrella) → face accessories
// Every outfit gets every pose, so all layers move together. The player and the
// police use the same renderer, proportions and scale.
//
// Textures: player `pl-<outfitId>-<pose>`, police `police-<look>-<pose>`.

// Logical frame; painted at 2× (Paint.ART_SCALE). Feet rest at y = feet.
export const CHAR_FRAME = { width: 40, height: 64, ox: 4, oy: 12, feet: 60 };
export const POSES = [
  'idle', 'idle2', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6',
  'walk1', 'walk2', 'walk3', 'walk4', 'jump', 'fall', 'crouch', 'caught', 'ski', 'skiAir', 'glide',
];
const POLICE_POSES = ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'ski'];

const LEN = { thigh: 9, shin: 9, upper: 7, fore: 6.5, torso: 12 };

// ----- poses -----
// Angles in radians from straight down; positive = forward (facing right).
//   thigh, knee (bend back), shoulder, elbow (bend forward), lean (torso), hip offsets.
const leg = (thigh, knee) => ({ thigh, knee });
const arm = (shoulder, elbow) => ({ shoulder, elbow });

function stride(t, amp, kneeAmp, armAmp, elbow, lean) {
  return {
    lean,
    bob: -0.9 * amp * Math.abs(Math.cos(t)),
    front: leg(amp * Math.sin(t), 0.15 + kneeAmp * Math.max(0, Math.cos(t))),
    back: leg(amp * Math.sin(t + Math.PI), 0.15 + kneeAmp * Math.max(0, Math.cos(t + Math.PI))),
    frontArm: arm(-armAmp * Math.sin(t), elbow),
    backArm: arm(armAmp * Math.sin(t), elbow),
  };
}

const POSE_DEFS = {
  idle: { lean: 0.02, front: leg(0.08, 0.05), back: leg(-0.06, 0.03), frontArm: arm(0.1, 0.18), backArm: arm(-0.08, 0.12) },
  idle2: { lean: 0.02, bob: -0.45, front: leg(0.08, 0.06), back: leg(-0.06, 0.04), frontArm: arm(0.14, 0.22), backArm: arm(-0.05, 0.16) },
  jump: { lean: 0.12, front: leg(0.95, 1.5), back: leg(-0.25, 0.55), frontArm: arm(2.5, 0.35), backArm: arm(2.0, 0.25) },
  fall: { lean: 0.05, front: leg(0.5, 0.35), back: leg(-0.4, 0.5), frontArm: arm(1.9, -0.25), backArm: arm(2.5, -0.1) },
  crouch: { lean: 0.65, hipX: -3, hipY: 7, front: leg(1.2, 1.6), back: leg(0.9, 1.65), frontArm: arm(0.7, 0.7), backArm: arm(0.35, 0.6) },
  caught: { lean: -0.04, front: leg(0.06, 0.04), back: leg(-0.06, 0.03), frontArm: arm(2.95, 0.1), backArm: arm(3.05, 0.1) },
  ski: { lean: 0.3, hipY: 2, front: leg(0.55, 0.85), back: leg(0.35, 0.75), frontArm: arm(0.65, 0.55), backArm: arm(0.25, 0.5) },
  skiAir: { lean: 0.4, hipY: 1, front: leg(1.0, 1.6), back: leg(0.75, 1.5), frontArm: arm(0.9, 0.4), backArm: arm(0.6, 0.4) },
  glide: { lean: 0, front: leg(0.18, 0.28), back: leg(-0.12, 0.32), frontArm: arm(2.95, 0.04), backArm: arm(0.3, 0.2) },
};
for (let i = 0; i < 6; i++) POSE_DEFS[`run${i + 1}`] = stride((i / 6) * Math.PI * 2, 0.62, 1.05, 0.75, 1.15, 0.18);
for (let i = 0; i < 4; i++) POSE_DEFS[`walk${i + 1}`] = stride((i / 4) * Math.PI * 2, 0.34, 0.5, 0.38, 0.3, 0.04);

function skeleton(def) {
  const hip = { x: 16 + (def.hipX ?? 0), y: 29 + (def.hipY ?? 0) + (def.bob ?? 0) };
  const ax = Math.sin(def.lean);
  const ay = -Math.cos(def.lean);
  const shoulder = { x: hip.x + ax * LEN.torso, y: hip.y + ay * LEN.torso };
  const head = { x: shoulder.x + ax * 6.4 + 0.6, y: shoulder.y + ay * 6.4 };
  const legPts = (l) => {
    const knee = { x: hip.x + Math.sin(l.thigh) * LEN.thigh, y: hip.y + Math.cos(l.thigh) * LEN.thigh };
    const s = l.thigh - l.knee;
    const ankle = { x: knee.x + Math.sin(s) * LEN.shin, y: knee.y + Math.cos(s) * LEN.shin };
    const foot = { x: ankle.x + Math.cos(s * 0.4) * 3.6, y: ankle.y + Math.sin(s * 0.4) * 1.2 };
    return { hip, knee, ankle, foot };
  };
  const armPts = (a, side) => {
    const sh = { x: shoulder.x + side * 0.6, y: shoulder.y + 1 };
    const elbow = { x: sh.x + Math.sin(a.shoulder) * LEN.upper, y: sh.y + Math.cos(a.shoulder) * LEN.upper };
    const f = a.shoulder + a.elbow;
    const hand = { x: elbow.x + Math.sin(f) * LEN.fore, y: elbow.y + Math.cos(f) * LEN.fore };
    return { shoulder: sh, elbow, hand };
  };
  return {
    hip, shoulder, head, lean: def.lean,
    axis: { x: ax, y: ay },
    frontLeg: legPts(def.front), backLeg: legPts(def.back),
    frontArm: armPts(def.frontArm, 1), backArm: armPts(def.backArm, -1),
  };
}

// ----- painting helpers -----

function stroke(ctx, pts, width, color, alpha = 1) {
  ctx.strokeStyle = css(color, alpha);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}
// A shaded limb: base, a darker back edge and a soft highlight on the lit side.
function limb(ctx, pts, width, color) {
  stroke(ctx, pts, width, shade(color, 0.72));
  stroke(ctx, pts.map((p) => ({ x: p.x + width * 0.08, y: p.y - width * 0.05 })), width * 0.82, color);
  stroke(ctx, pts.map((p) => ({ x: p.x + width * 0.22, y: p.y - width * 0.18 })), width * 0.3, shade(color, 1.25), 0.55);
}
const perp = (axis) => ({ x: -axis.y, y: axis.x });
function quad(ctx, pts, colorA, colorB, from, to) {
  const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  g.addColorStop(0, css(colorA));
  g.addColorStop(1, css(colorB));
  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}
// Torso outline from shoulders to hips (+ `drop` below the hips for coats).
function torsoPts(S, { top = 4.6, bottom = 4.2, drop = 0, flare = 0, lift = 0 }) {
  const n = perp(S.axis); // points toward the back
  const sh = { x: S.shoulder.x - S.axis.x * lift, y: S.shoulder.y - S.axis.y * lift };
  const low = { x: S.hip.x - S.axis.x * drop, y: S.hip.y - S.axis.y * drop };
  return [
    { x: sh.x + n.x * top, y: sh.y + n.y * top },
    { x: sh.x - n.x * top, y: sh.y - n.y * top },
    { x: low.x - n.x * (bottom + flare), y: low.y - n.y * (bottom + flare) },
    { x: low.x + n.x * (bottom + flare), y: low.y + n.y * (bottom + flare) },
  ];
}
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// ----- clothing -----

const BOTTOMS = {
  trousers: { reach: 'full', width: 4.1 },
  jeans: { reach: 'full', width: 4.1, seam: true },
  corduroy: { reach: 'full', width: 4.2, ridges: true },
  snowpants: { reach: 'full', width: 5 },
  shorts: { reach: 'thigh', width: 4.6 },
  swim: { reach: 'short', width: 4.4 },
};

function drawLeg(ctx, L, o, back) {
  const skin = back ? shade(o.skin, 0.85) : o.skin;
  limb(ctx, [L.hip, L.knee, L.ankle], 3.4, skin);
  const b = o.layers.bottom;
  const spec = b && BOTTOMS[b.style];
  if (spec) {
    const c = back ? shade(b.color, 0.8) : b.color;
    if (spec.reach === 'full') limb(ctx, [L.hip, L.knee, L.ankle], spec.width, c);
    else if (spec.reach === 'thigh') limb(ctx, [L.hip, lerp(L.hip, L.knee, 1.08)], spec.width, c);
    else limb(ctx, [L.hip, lerp(L.hip, L.knee, 0.45)], spec.width, c);
    if (spec.seam) stroke(ctx, [L.hip, L.knee, L.ankle], 0.5, shade(c, 1.35), 0.7);
    if (spec.ridges) for (const off of [-1, 1]) stroke(ctx, [L.hip, L.knee, L.ankle].map((p) => ({ x: p.x + off, y: p.y })), 0.4, shade(c, 0.7), 0.6);
  }
  drawShoe(ctx, L, o.layers.shoes, back);
}

function drawShoe(ctx, L, s, back) {
  const style = s?.style ?? 'shoes';
  const c = back ? shade(s?.color ?? 0x2a2a2e, 0.8) : s?.color ?? 0x2a2a2e;
  const { ankle: a, foot: f } = L;
  if (style === 'bare' || style === 'flipflops') {
    stroke(ctx, [a, f], 2.4, back ? 0xc79b78 : 0xe0b48e);
    if (style === 'flipflops') stroke(ctx, [{ x: a.x - 0.5, y: a.y + 1.3 }, { x: f.x + 0.5, y: f.y + 1.3 }], 1, 0xffd23f);
    return;
  }
  if (style === 'boots' || style === 'snowBoots') {
    limb(ctx, [lerp(L.knee, a, 0.45), a], style === 'snowBoots' ? 5 : 4.4, c);
  }
  if (style === 'ankleBoots') limb(ctx, [lerp(L.knee, a, 0.75), a], 4.2, c);
  const w = style === 'snowBoots' ? 3.6 : style === 'sneakers' ? 2.9 : 2.8;
  stroke(ctx, [{ x: a.x - 0.6, y: a.y + 0.3 }, f], w, c);
  stroke(ctx, [{ x: a.x - 0.4, y: a.y - 0.4 }, { x: f.x - 0.4, y: f.y - 0.6 }], w * 0.35, shade(c, 1.3), 0.6);
  if (style === 'sneakers') {
    stroke(ctx, [{ x: a.x - 0.8, y: a.y + 1.4 }, { x: f.x + 0.6, y: f.y + 1.2 }], 1, 0xffffff);
    stroke(ctx, [lerp(a, f, 0.2), lerp(a, f, 0.7)], 0.8, s.trim ?? 0xd94f4a);
  }
}

// Tops: torso shape + sleeve length. `pattern` adds prints.
const TOPS = {
  coat: { sleeve: 'long', shape: { drop: -7, flare: 1.4 }, buttons: true, belt: true },
  raincoat: { sleeve: 'long', shape: { drop: -6, flare: 1.2 }, buttons: true, hood: true },
  trench: { sleeve: 'long', shape: { drop: -8, flare: 1.6 }, belt: true, collar: true },
  sweater: { sleeve: 'long', shape: { drop: -1 }, knit: true },
  tshirt: { sleeve: 'short', shape: { drop: -0.5 } },
  shirt: { sleeve: 'short', shape: { drop: -0.5 }, collar: true, buttons: true },
  polo: { sleeve: 'short', shape: { drop: -0.5 }, collar: true },
  hawaiian: { sleeve: 'short', shape: { drop: -0.5 }, flowers: true, collar: true },
  lifejacket: { sleeve: 'short', shape: { drop: -0.5 }, vest: true },
  swimsuit: { sleeve: null, shape: { top: 3.4, drop: 1 }, straps: true },
  puffer: { sleeve: 'puffy', shape: { top: 5.6, bottom: 5.2, drop: -2, lift: 0.6 }, quilted: true },
};

function drawTop(ctx, S, o) {
  const t = o.layers.top;
  if (!t) return;
  const spec = TOPS[t.style] ?? TOPS.tshirt;
  const n = perp(S.axis);
  const lit = { x: S.shoulder.x - n.x * 5, y: S.shoulder.y - n.y * 5 };
  const dark = { x: S.shoulder.x + n.x * 5, y: S.shoulder.y + n.y * 5 };
  if (spec.hood) {
    ctx.fillStyle = css(shade(t.color, 0.75));
    ctx.beginPath();
    ctx.arc(S.shoulder.x + n.x * 3.6, S.shoulder.y + n.y * 3.6 - 1, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const base = spec.vest ? (t.under ?? 0xff8c42) : t.color;
  const pts = torsoPts(S, spec.shape);
  quad(ctx, pts, shade(base, 1.18), shade(base, 0.78), lit, dark);
  if (spec.vest) {
    const vest = torsoPts(S, { top: 5.2, bottom: 5, drop: 1, lift: 0.4 });
    quad(ctx, vest, shade(t.color, 1.15), shade(t.color, 0.75), lit, dark);
    for (const k of [0.35, 0.65]) stroke(ctx, [lerp(vest[1], vest[2], k), lerp(vest[0], vest[3], k)], 0.8, shade(t.color, 0.6));
    const b = lerp(lerp(vest[1], vest[2], 0.5), lerp(vest[0], vest[3], 0.5), 0.35);
    ctx.fillStyle = css(t.trim ?? 0x3b2a20);
    ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
  }
  if (spec.quilted) for (let k = 0.2; k < 1; k += 0.22) stroke(ctx, [lerp(pts[1], pts[2], k), lerp(pts[0], pts[3], k)], 0.6, shade(t.color, 0.68), 0.9);
  if (spec.knit) {
    stroke(ctx, [lerp(pts[1], pts[2], 0.3), lerp(pts[0], pts[3], 0.3)], 1.4, t.trim);
    stroke(ctx, [lerp(pts[1], pts[2], 0.94), lerp(pts[0], pts[3], 0.94)], 1.1, shade(t.color, 0.7));
  }
  if (spec.flowers) {
    for (const [a, b] of [[0.2, 0.3], [0.5, 0.7], [0.75, 0.25], [0.4, 0.45]]) {
      const p = lerp(lerp(pts[1], pts[2], a), lerp(pts[0], pts[3], a), b);
      ctx.fillStyle = css(t.trim ?? 0xffd23f);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (spec.buttons) {
    ctx.fillStyle = css(t.trim ?? 0xe8c66a);
    for (const k of [0.2, 0.45, 0.7]) {
      const p = lerp(pts[1], pts[2], k);
      ctx.beginPath();
      ctx.arc(p.x - n.x * 1.2, p.y - n.y * 1.2, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (spec.belt) stroke(ctx, [lerp(pts[1], pts[2], 0.55), lerp(pts[0], pts[3], 0.55)], 1.2, shade(t.color, 0.6));
  if (spec.collar) stroke(ctx, [lerp(pts[0], pts[1], 0.2), lerp(pts[0], pts[1], 0.8)], 1.3, shade(t.color, 0.85));
  if (spec.straps) {
    stroke(ctx, [lerp(pts[0], pts[1], 0.25), { x: S.shoulder.x, y: S.shoulder.y - 1.5 }], 0.9, t.color);
  }
}

function drawArm(ctx, A, o, back) {
  const skin = back ? shade(o.skin, 0.85) : o.skin;
  limb(ctx, [A.shoulder, A.elbow, A.hand], 2.9, skin);
  const t = o.layers.top;
  const spec = t && (TOPS[t.style] ?? TOPS.tshirt);
  if (spec?.sleeve) {
    const c = back ? shade(t.sleeve ?? t.color, 0.78) : t.sleeve ?? t.color;
    if (spec.sleeve === 'short') limb(ctx, [A.shoulder, lerp(A.shoulder, A.elbow, 0.75)], 3.6, c);
    else limb(ctx, [A.shoulder, A.elbow, lerp(A.elbow, A.hand, 0.85)], spec.sleeve === 'puffy' ? 4.4 : 3.4, c);
  }
  const gloves = o.layers.accessories?.find((a) => a.style === 'gloves');
  ctx.fillStyle = css(gloves ? (back ? shade(gloves.color, 0.8) : gloves.color) : skin);
  ctx.beginPath();
  ctx.arc(A.hand.x, A.hand.y, 1.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawHead(ctx, S, o) {
  const h = S.head;
  // Neck.
  stroke(ctx, [lerp(S.shoulder, h, 0.15), lerp(S.shoulder, h, 0.6)], 2.4, shade(o.skin, 0.9));
  // Skull with soft light from the upper left.
  const g = ctx.createRadialGradient(h.x - 1.2, h.y - 1.6, 0.5, h.x, h.y, 4.6);
  g.addColorStop(0, css(shade(o.skin, 1.12)));
  g.addColorStop(1, css(shade(o.skin, 0.82)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(h.x, h.y, 3.6, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose, ear, eye, mouth.
  ctx.fillStyle = css(shade(o.skin, 0.9));
  ctx.beginPath();
  ctx.ellipse(h.x + 3.5, h.y + 0.7, 0.9, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(shade(o.skin, 0.8));
  ctx.beginPath();
  ctx.ellipse(h.x - 0.9, h.y + 0.4, 0.9, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(0x2b2b2b);
  ctx.beginPath();
  ctx.ellipse(h.x + 1.9, h.y - 0.4, 0.55, 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, [{ x: h.x + 1.7, y: h.y + 2.4 }, { x: h.x + 2.9, y: h.y + 2.2 }], 0.45, shade(o.skin, 0.62));
  // Hair: cap over the top and back of the head.
  ctx.fillStyle = css(o.hair);
  ctx.beginPath();
  ctx.ellipse(h.x - 0.5, h.y - 1.8, 3.9, 2.9, -0.15, Math.PI * 0.95, Math.PI * 2.05);
  ctx.ellipse(h.x - 2.2, h.y - 0.2, 1.9, 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, [{ x: h.x - 2.6, y: h.y - 3.4 }, { x: h.x + 1.5, y: h.y - 4.1 }], 0.6, shade(o.hair, 1.4), 0.6);
}

const HATS = {
  fedora: (ctx, h, c) => {
    stroke(ctx, [{ x: h.x - 5.5, y: h.y - 3.4 }, { x: h.x + 5.8, y: h.y - 3.6 }], 1.6, c.color);
    quad(ctx, [{ x: h.x - 3.3, y: h.y - 3.6 }, { x: h.x + 3.6, y: h.y - 3.7 }, { x: h.x + 3, y: h.y - 8.4 }, { x: h.x - 2.8, y: h.y - 8.2 }], shade(c.color, 1.2), shade(c.color, 0.8), { x: h.x - 3, y: h.y }, { x: h.x + 3, y: h.y });
    stroke(ctx, [{ x: h.x - 3.3, y: h.y - 4.6 }, { x: h.x + 3.6, y: h.y - 4.7 }], 1.1, c.trim ?? shade(c.color, 0.5));
  },
  sunHat: (ctx, h, c) => {
    ctx.fillStyle = css(c.color);
    ctx.beginPath();
    ctx.ellipse(h.x + 0.4, h.y - 3.4, 9.2, 1.8, -0.04, 0, Math.PI * 2);
    ctx.fill();
    quad(ctx, [{ x: h.x - 3.4, y: h.y - 3.6 }, { x: h.x + 3.6, y: h.y - 3.6 }, { x: h.x + 2.8, y: h.y - 7.6 }, { x: h.x - 2.8, y: h.y - 7.6 }], shade(c.color, 1.15), shade(c.color, 0.85), { x: h.x - 3, y: h.y }, { x: h.x + 3, y: h.y });
    stroke(ctx, [{ x: h.x - 3.4, y: h.y - 4.5 }, { x: h.x + 3.6, y: h.y - 4.5 }], 1, c.trim);
  },
  beanie: (ctx, h, c) => {
    ctx.fillStyle = css(c.color);
    ctx.beginPath();
    ctx.ellipse(h.x - 0.2, h.y - 2.6, 4, 3.6, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    stroke(ctx, [{ x: h.x - 4, y: h.y - 2.2 }, { x: h.x + 3.8, y: h.y - 2.3 }], 1.8, c.trim);
    ctx.fillStyle = css(c.trim);
    ctx.beginPath();
    ctx.arc(h.x - 0.4, h.y - 6.6, 1.5, 0, Math.PI * 2);
    ctx.fill();
  },
  bucket: (ctx, h, c) => {
    quad(ctx, [{ x: h.x - 5, y: h.y - 2.6 }, { x: h.x + 5.2, y: h.y - 2.7 }, { x: h.x + 3.2, y: h.y - 7 }, { x: h.x - 3, y: h.y - 7 }], shade(c.color, 1.1), shade(c.color, 0.85), { x: h.x - 4, y: h.y }, { x: h.x + 4, y: h.y });
  },
  cap: (ctx, h, c) => {
    ctx.fillStyle = css(c.color);
    ctx.beginPath();
    ctx.ellipse(h.x - 0.2, h.y - 2.8, 4, 2.6, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    stroke(ctx, [{ x: h.x + 2, y: h.y - 2.8 }, { x: h.x + 6, y: h.y - 2.2 }], 1.3, shade(c.color, 0.8));
  },
};

function drawFaceAccessories(ctx, S, o) {
  const h = S.head;
  for (const a of o.layers.accessories ?? []) {
    if (a.style === 'sunglasses') {
      stroke(ctx, [{ x: h.x - 0.6, y: h.y - 0.5 }, { x: h.x + 3.6, y: h.y - 0.5 }], 1.7, a.color);
      stroke(ctx, [{ x: h.x + 2.2, y: h.y - 1 }, { x: h.x + 3, y: h.y - 1 }], 0.5, 0xffffff, 0.8);
    } else if (a.style === 'mirrored') {
      // The police tell: mirrored lenses with a bright glint.
      const g = ctx.createLinearGradient(h.x, h.y - 1.5, h.x, h.y + 0.6);
      g.addColorStop(0, css(0xe8f4ff));
      g.addColorStop(0.5, css(0x8fb0cc));
      g.addColorStop(1, css(0x3d5a78));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(h.x - 0.4, h.y - 0.5);
      ctx.lineTo(h.x + 3.7, h.y - 0.5);
      ctx.stroke();
      stroke(ctx, [{ x: h.x - 2.4, y: h.y - 0.6 }, { x: h.x - 0.4, y: h.y - 0.5 }], 0.5, 0x2a2a2e);
    } else if (a.style === 'earpiece') {
      ctx.fillStyle = css(0xdfe5ec);
      ctx.beginPath();
      ctx.arc(h.x - 0.9, h.y + 0.6, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css(0xdfe5ec, 0.95);
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const y = h.y + 1.2 + k * 0.6;
        ctx.lineTo(h.x - 1.4 + Math.sin(k * 1.6) * 0.5, y);
      }
      ctx.stroke();
    } else if (a.style === 'goggles') {
      stroke(ctx, [{ x: h.x - 3, y: h.y - 0.8 }, { x: h.x + 1, y: h.y - 0.8 }], 0.9, 0x2b2b2b);
      ctx.fillStyle = css(a.color);
      ctx.beginPath();
      ctx.ellipse(h.x + 2.2, h.y - 0.6, 1.8, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawNeckAndBody(ctx, S, o) {
  for (const a of o.layers.accessories ?? []) {
    if (a.style === 'scarf') {
      const n = perp(S.axis);
      const s = S.shoulder;
      stroke(ctx, [{ x: s.x - n.x * 3.2, y: s.y - n.y * 3.2 - 0.5 }, { x: s.x + n.x * 3.2, y: s.y + n.y * 3.2 - 0.5 }], 2.4, a.color);
      stroke(ctx, [{ x: s.x + n.x * 2.6, y: s.y + 0.5 }, { x: s.x + n.x * 3.4, y: s.y + 6 }], 1.8, shade(a.color, 0.85));
    } else if (a.style === 'camera') {
      const s = S.shoulder;
      stroke(ctx, [{ x: s.x - 2, y: s.y }, { x: s.x + 1, y: s.y + 6 }], 0.5, 0x2a2a2e);
      ctx.fillStyle = css(0x2a2a2e);
      ctx.fillRect(s.x - 0.5, s.y + 5, 4.2, 3);
      ctx.fillStyle = css(0x9fb4c8);
      ctx.beginPath();
      ctx.arc(s.x + 2.6, s.y + 6.5, 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.style === 'towel') {
      const s = S.shoulder;
      stroke(ctx, [{ x: s.x - 2.5, y: s.y - 1 }, { x: s.x - 3, y: s.y + 8 }], 2.6, 0xffffff);
      stroke(ctx, [{ x: s.x - 2.6, y: s.y + 3 }, { x: s.x - 2.8, y: s.y + 5 }], 2.6, 0xd94f4a);
    }
  }
}

function drawHeld(ctx, A, S, o, pose) {
  for (const a of o.layers.accessories ?? []) {
    if (a.style === 'umbrella') {
      if (pose === 'glide') {
        const top = { x: A.hand.x, y: A.hand.y - 13 };
        stroke(ctx, [A.hand, top], 0.8, 0x3b2a20);
        const g = ctx.createLinearGradient(top.x - 13, 0, top.x + 13, 0);
        g.addColorStop(0, css(shade(a.color, 1.2)));
        g.addColorStop(1, css(shade(a.color, 0.75)));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(top.x, top.y + 4, 13, 6.5, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        for (const dx of [-8, 0, 8]) stroke(ctx, [{ x: top.x, y: top.y - 2 }, { x: top.x + dx * 1.3, y: top.y + 4 }], 0.4, shade(a.color, 0.6), 0.8);
      } else if (pose.startsWith('idle') || pose.startsWith('walk') || pose.startsWith('run')) {
        stroke(ctx, [A.hand, { x: A.hand.x + 1.5, y: A.hand.y + 9 }], 1.6, a.color);
        stroke(ctx, [{ x: A.hand.x, y: A.hand.y - 1 }, { x: A.hand.x - 0.8, y: A.hand.y + 0.2 }], 0.6, 0x3b2a20);
      }
    } else if (a.style === 'newspaper') {
      ctx.fillStyle = css(0xf4f1ea);
      ctx.fillRect(A.hand.x - 1, A.hand.y - 6, 6, 8);
      ctx.fillStyle = css(0x6d6d73);
      for (let y = A.hand.y - 5; y < A.hand.y + 1; y += 1.4) ctx.fillRect(A.hand.x - 0.3, y, 4.6, 0.5);
    }
  }
}

function drawSkis(ctx, S, o) {
  const f = S.frontLeg.foot;
  const b = S.backLeg.foot;
  const y = Math.max(f.y, b.y) + 1.4;
  stroke(ctx, [{ x: Math.min(f.x, b.x) - 12, y }, { x: Math.max(f.x, b.x) + 6, y }, { x: Math.max(f.x, b.x) + 8, y: y - 2 }], 1.4, o.skis ?? 0x2f6fd8);
  stroke(ctx, [S.frontArm.hand, { x: S.frontArm.hand.x - 9, y }], 0.6, 0x3b2a20);
}

function paintCharacter(ctx, o, pose) {
  const S = skeleton(POSE_DEFS[pose]);
  ctx.save();
  ctx.translate(CHAR_FRAME.ox, CHAR_FRAME.oy);
  drawArm(ctx, S.backArm, o, true);
  drawLeg(ctx, S.backLeg, o, true);
  drawLeg(ctx, S.frontLeg, o, false);
  if (pose === 'ski' || pose === 'skiAir') drawSkis(ctx, S, o);
  // Pelvis in the trouser colour.
  const b = o.layers.bottom;
  if (b) stroke(ctx, [{ x: S.hip.x - 2.2, y: S.hip.y }, { x: S.hip.x + 2.2, y: S.hip.y }], 4.4, b.color);
  drawTop(ctx, S, o);
  drawNeckAndBody(ctx, S, o);
  drawHead(ctx, S, o);
  const hat = o.layers.hat;
  if (hat) HATS[hat.style]?.(ctx, S.head, hat);
  drawFaceAccessories(ctx, S, o);
  drawArm(ctx, S.frontArm, o, false);
  drawHeld(ctx, S.frontArm, S, o, pose);
  ctx.restore();
}

function bake(scene, key, o, pose) {
  paintTexture(scene, key, CHAR_FRAME.width, CHAR_FRAME.height, (ctx) => paintCharacter(ctx, o, pose), { outline: 2 });
}

// ----- outfits -----

// The guest's own look: navy coat, red scarf, brown hat (room, menus).
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

const PLAYER_BODY = { skin: 0xf2c9a0, hair: 0x5a3a28 };

export function buildOutfit(scene, outfit) {
  const o = { ...PLAYER_BODY, ...outfit };
  for (const pose of POSES) bake(scene, `pl-${outfit.id}-${pose}`, o, pose);
}

// ----- police -----

// Seasonal disguises. Every one also wears the tell: mirrored sunglasses + earpiece.
const TELL = [{ style: 'mirrored' }, { style: 'earpiece' }];
const DISGUISES = {
  plain: { top: { style: 'polo', color: 0xe0a83a }, bottom: { style: 'trousers', color: 0x7a5c44 }, shoes: { style: 'shoes', color: 0x2a2a2e } },
  tourist: {
    top: { style: 'shirt', color: 0xf3e3c3, trim: 0x8f7d5c },
    bottom: { style: 'trousers', color: 0x8f7d5c },
    shoes: { style: 'shoes', color: 0x6b4f3a },
    hat: { style: 'bucket', color: 0xe8d3b0 },
    accessories: [{ style: 'camera' }],
  },
  beach: {
    top: { style: 'hawaiian', color: 0x37c4b0, trim: 0xffd23f },
    bottom: { style: 'shorts', color: 0xff8c42 },
    shoes: { style: 'flipflops' },
    accessories: [{ style: 'towel' }],
  },
  passenger: {
    top: { style: 'trench', color: 0xc9a46b },
    bottom: { style: 'trousers', color: 0x4a3a2e },
    shoes: { style: 'shoes', color: 0x2a2a2e },
    hat: { style: 'cap', color: 0x5a4636 },
    accessories: [{ style: 'newspaper' }],
  },
  skier: {
    top: { style: 'puffer', color: 0xd94f4a, trim: 0xffffff },
    bottom: { style: 'snowpants', color: 0x2f2f3a },
    shoes: { style: 'snowBoots', color: 0x3a3a40, trim: 0xffffff },
    hat: { style: 'beanie', color: 0x2f6fd8, trim: 0xffffff },
    accessories: [{ style: 'gloves', color: 0x2a2a2e }],
  },
};

export function buildPoliceLook(scene, look) {
  const d = DISGUISES[look] ?? DISGUISES.plain;
  const o = {
    skin: 0xd9a77e,
    hair: 0x2b2018,
    skis: 0xd94f4a,
    layers: { ...d, accessories: [...(d.accessories ?? []), ...TELL] },
  };
  for (const pose of POLICE_POSES) bake(scene, `police-${look}-${pose}`, o, pose);
  const anim = `police-walk-${look}`;
  if (!scene.anims.exists(anim)) {
    scene.anims.create({
      key: anim,
      frames: ['walk1', 'walk2', 'walk3', 'walk4'].map((p) => ({ key: `police-${look}-${p}` })),
      frameRate: 7,
      repeat: -1,
    });
  }
}

