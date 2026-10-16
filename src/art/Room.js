import { seededRandom } from './TextureFactory.js';

// The player's room at the guest house, drawn in code. It changes with each room
// upgrade owned: bare bed → quilt, empty wall → painting, frosted glass → view,
// cold hearth → fire, bare floor → rug, plus plants. The more upgrades, the warmer
// the light. Returns a container so the scene can redraw it after a purchase.
//
// area: { x, y, w, h } where the room is drawn on screen.
const C = {
  wall: 0xe8d3b0,
  wallStripe: 0xdcc49c,
  wainscot: 0xa87a52,
  wainscotDark: 0x7d5638,
  floor: 0x9a6b44,
  floorLine: 0x7d5638,
  beam: 0x5e3b26,
  frame: 0x6e4a2a,
  stone: 0xa59a8e,
  stoneDark: 0x7d7268,
  mattress: 0xb8b2aa,
  quilt: [0xd94f4a, 0xf2b234, 0x6ec6ff, 0x82c86f, 0xf6b3cc],
  curtain: 0xb3262b,
  plant: 0x4f9f34,
  plantDark: 0x37702a,
  pot: 0xc0603a,
};

export function drawRoom(scene, area, owned) {
  const has = (k) => owned.includes(k);
  const { x: X, y: Y, w: W, h: H } = area;
  const floorY = Y + H * 0.7;
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  c.add(g);

  // Ceiling beam, wallpaper, wainscot, floorboards.
  g.fillStyle(C.wall).fillRect(X, Y, W, floorY - Y);
  g.fillStyle(C.wallStripe);
  for (let sx = X + 12; sx < X + W; sx += 26) g.fillRect(sx, Y, 6, floorY - Y);
  g.fillStyle(C.wainscot).fillRect(X, floorY - 60, W, 60);
  g.fillStyle(C.wainscotDark).fillRect(X, floorY - 62, W, 5);
  for (let sx = X + 30; sx < X + W; sx += 60) g.fillRect(sx, floorY - 55, 3, 52);
  g.fillStyle(C.floor).fillRect(X, floorY, W, Y + H - floorY);
  g.fillStyle(C.floorLine);
  for (let fy = floorY + 18; fy < Y + H; fy += 20) g.fillRect(X, fy, W, 2);
  const rnd = seededRandom(5);
  for (let i = 0; i < 14; i++) g.fillRect(X + rnd() * W, floorY + rnd() * (Y + H - floorY), 2, 18);
  g.fillStyle(C.beam).fillRect(X, Y, W, 14);

  // Window (left): frosted glass, or a view of the hills with curtains.
  const wx = X + 40;
  const wy = Y + 56;
  g.fillStyle(C.frame).fillRect(wx - 8, wy - 8, 136, 148);
  if (has('window')) {
    g.fillGradientStyle(0xf6a45c, 0xf6a45c, 0xfde3c0, 0xfde3c0, 1).fillRect(wx, wy, 120, 132);
    g.fillStyle(0xffe08a).fillCircle(wx + 86, wy + 52, 14);
    g.fillStyle(0xb5d64e).fillEllipse(wx + 30, wy + 120, 140, 70);
    g.fillStyle(0x78c43c).fillEllipse(wx + 100, wy + 130, 120, 60);
    g.fillStyle(0xffffff).fillTriangle(wx + 40, wy + 70, wx + 70, wy + 30, wx + 100, wy + 70);
  } else {
    g.fillStyle(0xc9d6df).fillRect(wx, wy, 120, 132);
    g.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 9; i++) g.fillCircle(wx + 10 + rnd() * 100, wy + 10 + rnd() * 112, 6 + rnd() * 8);
  }
  g.fillStyle(C.frame).fillRect(wx + 57, wy, 6, 132).fillRect(wx, wy + 63, 120, 6);
  g.fillRect(wx - 14, wy + 136, 148, 10); // sill
  if (has('window')) {
    g.fillStyle(C.curtain).fillPoints([{ x: wx - 22, y: wy - 18 }, { x: wx + 18, y: wy - 18 }, { x: wx - 4, y: wy + 150 }, { x: wx - 24, y: wy + 150 }], true);
    g.fillPoints([{ x: wx + 102, y: wy - 18 }, { x: wx + 142, y: wy - 18 }, { x: wx + 144, y: wy + 150 }, { x: wx + 124, y: wy + 150 }], true);
    g.fillStyle(C.frame).fillRect(wx - 26, wy - 22, 172, 6);
  }

  // Fireplace (centre): cold stone hearth, or a lit fire with a warm glow.
  const fx = X + W * 0.5;
  const fTop = floorY - 130;
  g.fillStyle(C.stoneDark).fillRect(fx - 74, fTop, 148, 130);
  g.fillStyle(C.stone);
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) g.fillRect(fx - 70 + col * 28 + (row % 2) * 12, fTop + 4 + row * 21, 24, 17);
  }
  g.fillStyle(C.beam).fillRect(fx - 86, fTop - 12, 172, 14); // mantel
  g.fillStyle(0x1e1612).fillRoundedRect(fx - 42, floorY - 80, 84, 80, { tl: 40, tr: 40, bl: 0, br: 0 });
  if (has('fireplace')) {
    const glow = scene.add.circle(fx, floorY - 30, 150, 0xffa040, 0.16);
    c.add(glow);
    scene.tweens.add({ targets: glow, alpha: 0.24, duration: 700, yoyo: true, repeat: -1 });
    // Flames drawn around their base so the flicker (scaleY) grows from the logs.
    const flames = scene.add.graphics().setPosition(fx, floorY - 6);
    flames.fillStyle(0xff7a1a).fillTriangle(-30, 0, 0, -60, 30, 0);
    flames.fillStyle(0xffc12e).fillTriangle(-18, 0, 2, -40, 20, 0);
    flames.fillStyle(0xfff3a0).fillTriangle(-8, 0, 0, -22, 8, 0);
    c.add(flames);
    scene.tweens.add({ targets: flames, scaleY: 0.82, scaleX: 1.06, duration: 170, yoyo: true, repeat: -1 });
    g.fillStyle(0x6e4a2a).fillRect(fx - 34, floorY - 8, 68, 6); // logs
  } else {
    g.fillStyle(0x6d6d73).fillEllipse(fx, floorY - 6, 60, 10); // cold ash
  }

  // Painting above the mantel: a nail on an empty wall, or the Four Seasons.
  const px = fx;
  const py = fTop - 92;
  if (has('painting')) {
    g.fillStyle(0xd9a441).fillRect(px - 64, py - 4, 128, 76);
    const panels = [0xf6b3cc, 0x6ec6ff, 0xe8692a, 0xe6eef5];
    panels.forEach((col, i) => g.fillStyle(col).fillRect(px - 58 + i * 29, py + 2, 28, 64));
    g.fillStyle(0x82c86f).fillRect(px - 58, py + 46, 29, 20);
    g.fillStyle(0xf2d77e).fillRect(px - 29, py + 46, 29, 20);
    g.fillStyle(0xb9683a).fillRect(px, py + 46, 29, 20);
    g.fillStyle(0xffffff).fillRect(px + 29, py + 46, 29, 20);
  } else {
    g.lineStyle(2, C.wallStripe).strokeRect(px - 60, py, 120, 68);
    g.fillStyle(0x3b2a20).fillCircle(px, py - 8, 2);
  }

  // Bed (right): bare mattress, or a quilt and pillows.
  const bx = X + W - 190;
  const by = floorY - 26;
  g.fillStyle(C.frame).fillRect(bx + 152, by - 70, 14, 110); // headboard
  g.fillRect(bx - 6, by - 20, 14, 60);
  g.fillRect(bx, by + 18, 160, 16);
  g.fillStyle(C.mattress).fillRoundedRect(bx, by - 8, 158, 28, 6);
  if (has('bed')) {
    g.fillStyle(0xffffff).fillRoundedRect(bx + 112, by - 24, 40, 20, 8);
    g.fillStyle(0xf6e7c1).fillRoundedRect(bx + 104, by - 18, 36, 16, 8);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(C.quilt[i % C.quilt.length]).fillRect(bx + 4 + i * 17, by - 10, 17, 16);
      g.fillStyle(C.quilt[(i + 2) % C.quilt.length]).fillRect(bx + 4 + i * 17, by + 6, 17, 14);
    }
  }

  // Rug on the floor.
  if (has('rug')) {
    g.fillStyle(0x7a1f2b).fillEllipse(X + W * 0.42, Y + H - 34, 280, 46);
    g.fillStyle(0xd9a441).fillEllipse(X + W * 0.42, Y + H - 34, 230, 34);
    g.fillStyle(0x6ec6ff).fillEllipse(X + W * 0.42, Y + H - 34, 150, 20);
  }

  // Plants: a big pot in the corner, one on the windowsill, one hanging.
  if (has('plants')) {
    const potX = X + 26;
    g.fillStyle(C.pot).fillRect(potX - 16, floorY + 30, 32, 34);
    g.fillStyle(C.plantDark).fillEllipse(potX - 10, floorY + 6, 26, 50);
    g.fillStyle(C.plant).fillEllipse(potX + 10, floorY + 2, 24, 56);
    g.fillEllipse(potX, floorY - 14, 20, 40);
    g.fillStyle(C.pot).fillRect(wx + 90, wy + 120, 22, 16);
    g.fillStyle(C.plant).fillCircle(wx + 101, wy + 114, 10);
    g.lineStyle(2, C.frame).lineBetween(X + W - 60, Y + 14, X + W - 60, Y + 70);
    g.fillStyle(C.pot).fillRect(X + W - 72, Y + 70, 24, 16);
    g.fillStyle(C.plant).fillEllipse(X + W - 66, Y + 98, 14, 40);
    g.fillEllipse(X + W - 52, Y + 94, 12, 34);
  }

  // Bedside lamp, always there.
  g.fillStyle(C.frame).fillRect(X + W - 228, floorY - 36, 30, 36);
  g.fillStyle(0xffd889).fillTriangle(X + W - 230, floorY - 52, X + W - 196, floorY - 52, X + W - 213, floorY - 72);

  // Light: cold blue when bare, warmer with every upgrade (and the fire).
  const coldness = Math.max(0, 0.32 - owned.length * 0.055);
  if (coldness > 0) c.add(scene.add.rectangle(X, Y, W, H, 0x1d2b4a, coldness).setOrigin(0));
  if (has('fireplace')) c.add(scene.add.rectangle(X, Y, W, H, 0xffa040, 0.07).setOrigin(0));

  // The player, at home.
  c.add(scene.add.image(X + W * 0.3, floorY + 64, 'player-idle').setOrigin(0.5, 1).setScale(2.2));
  return c;
}
