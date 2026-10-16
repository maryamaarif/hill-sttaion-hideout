import { woodGrain } from './TextureFactory.js';
import {
  paintTexture, css, shade, mix, seeded, radialGlow, vGradient, roundRect, puffy, rock, contactShadow, speckle,
} from './Paint.js';

// The player's room at the guest house, painted in code (same painterly style as
// the levels). It changes with each room upgrade owned: bare bed → quilt, empty
// wall → painting, frosted glass → view, cold hearth → fire, bare floor → rug,
// plus plants. The more upgrades, the warmer the light. The static room is one
// painted texture (repainted only after a purchase); the fire and its glow animate.
// Returns a container so the scene can redraw it after a purchase.
//
// area: { x, y, w, h } where the room is drawn on screen.
const C = {
  wall: 0xecd9b8,
  wallStripe: 0xe0c89f,
  wainscot: 0xa87a52,
  floor: 0x9a6b44,
  beam: 0x5e3b26,
  frame: 0x6e4a2a,
  stone: 0xb0a598,
  mattress: 0xc9c3ba,
  quilt: [0xd94f4a, 0xf2b234, 0x6ec6ff, 0x82c86f, 0xf6b3cc],
  curtain: 0xb3262b,
  plant: 0x4f9f34,
  plantDark: 0x37702a,
  pot: 0xc0603a,
};

let roomId = 0;

function paintWindow(ctx, wx, wy, view, rnd) {
  vGradient(ctx, wx - 8, wy - 8, 136, 148, [[0, shade(C.frame, 1.15)], [1, shade(C.frame, 0.8)]]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(wx, wy, 120, 132);
  ctx.clip();
  if (view) {
    vGradient(ctx, wx, wy, 120, 132, [[0, 0xf39a5a], [0.6, 0xfbc98e], [1, 0xfde3c0]]);
    radialGlow(ctx, wx + 86, wy + 52, 40, 0xfff0b0, 0.6);
    radialGlow(ctx, wx + 86, wy + 52, 13, 0xfff6d0, 1, 9);
    ctx.fillStyle = css(0x9aa6c4);
    ctx.beginPath();
    ctx.moveTo(wx + 20, wy + 92);
    ctx.lineTo(wx + 62, wy + 40);
    ctx.lineTo(wx + 108, wy + 92);
    ctx.fill();
    ctx.fillStyle = css(0xffffff);
    ctx.beginPath();
    ctx.moveTo(wx + 50, wy + 55);
    ctx.lineTo(wx + 62, wy + 40);
    ctx.lineTo(wx + 75, wy + 55);
    ctx.lineTo(wx + 62, wy + 50);
    ctx.fill();
    puffy(ctx, [[wx + 30, wy + 124, 50], [wx + 104, wy + 132, 46]], 0x8cc84a, 0xb5e070, 0x5f9a34);
  } else {
    vGradient(ctx, wx, wy, 120, 132, [[0, 0xd8e3ea], [1, 0xb9c8d2]]);
    for (let i = 0; i < 12; i++) radialGlow(ctx, wx + 8 + rnd() * 104, wy + 8 + rnd() * 116, 8 + rnd() * 10, 0xffffff, 0.55);
  }
  // Glass sheen.
  ctx.fillStyle = css(0xffffff, 0.16);
  ctx.beginPath();
  ctx.moveTo(wx, wy + 40);
  ctx.lineTo(wx + 40, wy);
  ctx.lineTo(wx + 62, wy);
  ctx.lineTo(wx, wy + 62);
  ctx.fill();
  ctx.restore();
  vGradient(ctx, wx + 57, wy, 6, 132, [[0, shade(C.frame, 1.1)], [1, C.frame]]);
  vGradient(ctx, wx, wy + 63, 120, 6, [[0, shade(C.frame, 1.2)], [1, C.frame]]);
  woodGrain(ctx, wx - 14, wy + 136, 148, 10, C.frame, rnd, 2); // sill
}

function paintCurtain(ctx, x, top, w, h, flip) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x + w, top);
  ctx.quadraticCurveTo(x + w * (flip ? 1.1 : 0.45), top + h * 0.6, x + w * (flip ? 0.75 : 0.55), top + h);
  ctx.lineTo(x + w * (flip ? 0.25 : 0.05), top + h);
  ctx.quadraticCurveTo(x - w * (flip ? 0.05 : 0.1), top + h * 0.5, x, top);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, css(shade(C.curtain, i % 2 ? 0.72 : 1.12)));
  ctx.fillStyle = g;
  ctx.fillRect(x - 10, top, w + 20, h);
  vGradient(ctx, x - 10, top, w + 20, h, [[0, 0x000000, 0], [1, 0x000000, 0.18]]);
  ctx.restore();
}

function paintStaticRoom(ctx, A, owned, rnd) {
  const has = (k) => owned.includes(k);
  const { x: X, y: Y, w: W, h: H } = A;
  const floorY = Y + H * 0.7;

  // Wallpaper with soft stripes and a faint damask dot pattern.
  vGradient(ctx, X, Y, W, floorY - Y, [[0, shade(C.wall, 1.04)], [1, shade(C.wall, 0.94)]]);
  for (let sx = X + 12; sx < X + W; sx += 26) vGradient(ctx, sx, Y, 7, floorY - Y, [[0, C.wallStripe, 0.8], [1, shade(C.wallStripe, 0.92), 0.8]]);
  for (let sx = X + 25; sx < X + W; sx += 26) {
    for (let sy = Y + 30; sy < floorY - 70; sy += 30) radialGlow(ctx, sx, sy + ((sx / 26) % 2) * 15, 3, shade(C.wallStripe, 0.9), 0.7);
  }
  // Wainscot panels.
  woodGrain(ctx, X, floorY - 60, W, 60, C.wainscot, rnd, 8);
  vGradient(ctx, X, floorY - 64, W, 7, [[0, shade(C.wainscot, 1.25)], [1, shade(C.wainscot, 0.7)]]);
  for (let sx = X + 14; sx < X + W - 30; sx += 60) {
    roundRect(ctx, sx, floorY - 52, 46, 42, 3);
    ctx.strokeStyle = css(shade(C.wainscot, 0.7), 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Floorboards in perspective-ish rows, with a shadow at the wall line.
  woodGrain(ctx, X, floorY, W, Y + H - floorY, C.floor, rnd, 14);
  for (let fy = floorY + 18; fy < Y + H; fy += 20) {
    ctx.fillStyle = css(shade(C.floor, 0.7), 0.8);
    ctx.fillRect(X, fy, W, 1.5);
    for (let i = 0; i < 4; i++) ctx.fillRect(X + rnd() * W, fy - 18, 1.5, 18);
  }
  vGradient(ctx, X, floorY, W, 16, [[0, 0x000000, 0.28], [1, 0x000000, 0]]);
  // Ceiling beam.
  woodGrain(ctx, X, Y, W, 14, C.beam, rnd, 3);
  vGradient(ctx, X, Y + 14, W, 10, [[0, 0x000000, 0.22], [1, 0x000000, 0]]);

  // Window (left): frosted glass, or a sunset view of the hills with curtains.
  const wx = X + 40;
  const wy = Y + 56;
  paintWindow(ctx, wx, wy, has('window'), rnd);
  if (has('window')) {
    vGradient(ctx, wx - 28, wy - 24, 176, 6, [[0, shade(C.frame, 1.2)], [1, C.frame]]);
    paintCurtain(ctx, wx - 24, wy - 18, 44, 168, false);
    paintCurtain(ctx, wx + 104, wy - 18, 44, 168, true);
  }

  // Fireplace (centre).
  const fx = X + W * 0.5;
  const fTop = floorY - 130;
  vGradient(ctx, fx - 74, fTop, 148, 130, [[0, shade(C.stone, 0.75)], [1, shade(C.stone, 0.6)]]);
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) rock(ctx, fx - 72 + col * 28 + (row % 2) * 12, fTop + 3 + row * 21, 26, 18, shade(C.stone, 0.9 + rnd() * 0.2), rnd);
  }
  woodGrain(ctx, fx - 86, fTop - 12, 172, 14, C.beam, rnd, 3); // mantel
  vGradient(ctx, fx - 86, fTop + 2, 172, 6, [[0, 0x000000, 0.3], [1, 0x000000, 0]]);
  // Firebox.
  ctx.beginPath();
  ctx.moveTo(fx - 42, floorY);
  ctx.lineTo(fx - 42, floorY - 40);
  ctx.arc(fx, floorY - 40, 42, Math.PI, 0);
  ctx.lineTo(fx + 42, floorY);
  ctx.closePath();
  const fb = ctx.createLinearGradient(0, floorY - 82, 0, floorY);
  fb.addColorStop(0, css(0x120c0a));
  fb.addColorStop(1, css(has('fireplace') ? 0x5a2a12 : 0x2a201c));
  ctx.fillStyle = fb;
  ctx.fill();
  if (has('fireplace')) {
    for (const [lx, ang] of [[-14, 0.15], [12, -0.18]]) {
      ctx.save();
      ctx.translate(fx + lx, floorY - 7);
      ctx.rotate(ang);
      roundRect(ctx, -22, -4, 44, 8, 4);
      ctx.fillStyle = css(0x6e4a2a);
      ctx.fill();
      ctx.restore();
    }
    radialGlow(ctx, fx, floorY - 6, 30, 0xff8a30, 0.6);
  } else {
    contactShadow(ctx, fx, floorY - 4, 30, 5, 0.25);
    speckle(ctx, fx - 26, floorY - 9, 52, 7, [0x8a8a90, 0x5a5a60], 40, rnd, [0.6, 1.6], 0.9);
  }

  // Painting above the mantel: a nail and a pale patch, or the Four Seasons.
  const px = fx;
  const py = fTop - 92;
  if (has('painting')) {
    contactShadow(ctx, px + 4, py + 76, 60, 6, 0.25);
    roundRect(ctx, px - 66, py - 6, 132, 80, 3);
    const gf = ctx.createLinearGradient(px - 66, py - 6, px + 66, py + 74);
    gf.addColorStop(0, css(0xf0c860));
    gf.addColorStop(0.5, css(0xb8862e));
    gf.addColorStop(1, css(0xe0b04a));
    ctx.fillStyle = gf;
    ctx.fill();
    const seasons = [
      [0xbfe3f5, 0xf6b3cc, 0x82c86f],
      [0x5fb8f0, 0xffe27a, 0xe8c24e],
      [0xf6c48c, 0xe8692a, 0xb9683a],
      [0xd6e2ec, 0xffffff, 0xe6eef5],
    ];
    seasons.forEach(([sky, accent, ground], i) => {
      const sx = px - 58 + i * 29;
      vGradient(ctx, sx, py + 2, 28, 64, [[0, sky], [1, mix(sky, 0xffffff, 0.4)]]);
      ctx.fillStyle = css(ground);
      ctx.beginPath();
      ctx.moveTo(sx, py + 66);
      ctx.quadraticCurveTo(sx + 14, py + 38, sx + 28, py + 50);
      ctx.lineTo(sx + 28, py + 66);
      ctx.fill();
      radialGlow(ctx, sx + 14, py + 34, 9, accent, 0.95, 5);
    });
  } else {
    ctx.fillStyle = css(shade(C.wall, 1.06), 0.7);
    ctx.fillRect(px - 60, py, 120, 68);
    radialGlow(ctx, px, py - 8, 2.5, 0x3b2a20, 1, 1.5);
  }

  // Bed (right).
  const bx = X + W - 190;
  const by = floorY - 26;
  contactShadow(ctx, bx + 80, by + 36, 96, 8, 0.35);
  vGradient(ctx, bx + 152, by - 70, 14, 110, [[0, shade(C.frame, 1.2)], [1, shade(C.frame, 0.75)]]);
  radialGlow(ctx, bx + 159, by - 72, 8, shade(C.frame, 1.3), 1, 5);
  vGradient(ctx, bx - 6, by - 20, 14, 60, [[0, shade(C.frame, 1.2)], [1, shade(C.frame, 0.75)]]);
  woodGrain(ctx, bx, by + 18, 160, 16, C.frame, rnd, 3);
  roundRect(ctx, bx, by - 8, 158, 28, 7);
  const gm = ctx.createLinearGradient(0, by - 8, 0, by + 20);
  gm.addColorStop(0, css(shade(C.mattress, 1.12)));
  gm.addColorStop(1, css(shade(C.mattress, 0.82)));
  ctx.fillStyle = gm;
  ctx.fill();
  if (has('bed')) {
    for (const [ox, oy, w, h, col] of [[112, -24, 42, 22, 0xffffff], [102, -18, 38, 18, 0xf6e7c1]]) {
      roundRect(ctx, bx + ox, by + oy, w, h, 9);
      const gp = ctx.createLinearGradient(0, by + oy, 0, by + oy + h);
      gp.addColorStop(0, css(col));
      gp.addColorStop(1, css(shade(col, 0.82)));
      ctx.fillStyle = gp;
      ctx.fill();
    }
    ctx.save();
    roundRect(ctx, bx + 2, by - 12, 104, 36, 6);
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 2; j++) {
        const col = C.quilt[(i + j * 2) % C.quilt.length];
        vGradient(ctx, bx + 2 + i * 18, by - 12 + j * 18, 18, 18, [[0, shade(col, 1.12)], [1, shade(col, 0.85)]]);
      }
    }
    ctx.strokeStyle = css(0xffffff, 0.5);
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + 2 + i * 18, by - 12);
      ctx.lineTo(bx + 2 + i * 18, by + 24);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    vGradient(ctx, bx + 2, by + 14, 104, 10, [[0, 0x000000, 0], [1, 0x000000, 0.25]]);
    ctx.restore();
  }

  // Rug.
  if (has('rug')) {
    const rx = X + W * 0.42;
    const ry = Y + H - 34;
    contactShadow(ctx, rx, ry + 3, 142, 24, 0.3);
    for (const [rw, rh, col] of [[280, 46, 0x7a1f2b], [232, 36, 0xd9a441], [184, 27, 0x7a1f2b], [150, 20, 0x6ec6ff]]) {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.scale(1, rh / rw);
      const g = ctx.createRadialGradient(0, -rw * 0.1, rw * 0.1, 0, 0, rw / 2);
      g.addColorStop(0, css(shade(col, 1.15)));
      g.addColorStop(1, css(shade(col, 0.85)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rw / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Plants: a big pot in the corner, one on the windowsill, one hanging.
  if (has('plants')) {
    const pot = (x, y, w, h) => {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x + w * 0.38, y + h);
      ctx.lineTo(x - w * 0.38, y + h);
      ctx.closePath();
      const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, css(shade(C.pot, 1.2)));
      g.addColorStop(1, css(shade(C.pot, 0.7)));
      ctx.fillStyle = g;
      ctx.fill();
      vGradient(ctx, x - w / 2 - 2, y - 2, w + 4, 5, [[0, shade(C.pot, 1.3)], [1, C.pot]]);
    };
    const leaves = (x, y, r) => puffy(ctx, [[x - r * 0.5, y, r * 0.7], [x + r * 0.5, y - r * 0.1, r * 0.7], [x, y - r * 0.6, r * 0.75]], C.plant, 0x7ac85a, C.plantDark);
    const potX = X + 26;
    contactShadow(ctx, potX, floorY + 64, 20, 4, 0.35);
    leaves(potX, floorY + 4, 26);
    leaves(potX + 4, floorY - 22, 18);
    pot(potX, floorY + 30, 34, 34);
    leaves(wx + 101, wy + 116, 11);
    pot(wx + 101, wy + 120, 22, 16);
    ctx.strokeStyle = css(C.frame);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X + W - 60, Y + 14);
    ctx.lineTo(X + W - 60, Y + 70);
    ctx.stroke();
    pot(X + W - 60, Y + 70, 26, 16);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = css(i % 2 ? C.plant : C.plantDark);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X + W - 68 + i * 4, Y + 82);
      ctx.quadraticCurveTo(X + W - 76 + i * 8, Y + 100, X + W - 72 + i * 6, Y + 112 + (i % 3) * 8);
      ctx.stroke();
    }
  }

  // Bedside table with a lamp, always there.
  const lx = X + W - 213;
  woodGrain(ctx, lx - 17, floorY - 36, 34, 36, C.frame, rnd, 3);
  radialGlow(ctx, lx, floorY - 58, 46, 0xffd889, 0.35);
  ctx.fillStyle = css(0x8a6a4a);
  ctx.fillRect(lx - 2, floorY - 52, 4, 16);
  ctx.beginPath();
  ctx.moveTo(lx - 17, floorY - 50);
  ctx.lineTo(lx + 17, floorY - 50);
  ctx.lineTo(lx + 9, floorY - 72);
  ctx.lineTo(lx - 9, floorY - 72);
  ctx.closePath();
  const gl = ctx.createLinearGradient(0, floorY - 72, 0, floorY - 50);
  gl.addColorStop(0, css(0xfff1c0));
  gl.addColorStop(1, css(0xffc861));
  ctx.fillStyle = gl;
  ctx.fill();

  // Window light falling across the floor.
  if (has('window')) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = css(0xffc070, 0.1);
    ctx.beginPath();
    ctx.moveTo(wx, wy + 136);
    ctx.lineTo(wx + 120, wy + 136);
    ctx.lineTo(wx + 260, Y + H);
    ctx.lineTo(wx + 60, Y + H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Corner shading so the room feels lit from the middle.
  const vg = ctx.createRadialGradient(X + W / 2, Y + H * 0.55, W * 0.25, X + W / 2, Y + H * 0.55, W * 0.75);
  vg.addColorStop(0, 'rgba(30,18,10,0)');
  vg.addColorStop(1, 'rgba(30,18,10,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(X, Y, W, H);
}

export function drawRoom(scene, area, owned) {
  const has = (k) => owned.includes(k);
  const { x: X, y: Y, w: W, h: H } = area;
  const floorY = Y + H * 0.7;
  const c = scene.add.container(0, 0);

  roomId += 1;
  const key = `room-${roomId}`;
  paintTexture(scene, key, W, H, (ctx) => {
    ctx.translate(-X, -Y);
    paintStaticRoom(ctx, area, owned, seeded(5));
  });
  c.add(scene.add.image(X, Y, key).setOrigin(0).setScale(0.5));
  // Free the painting when the room is redrawn or the scene ends.
  c.once('destroy', () => setTimeout(() => scene.textures.exists(key) && scene.textures.remove(key), 0));

  if (has('fireplace')) {
    const fx = X + W * 0.5;
    const glow = scene.add.image(fx, floorY - 30, 'glow').setDisplaySize(300, 300).setTint(0xffa040).setAlpha(0.2).setBlendMode(Phaser.BlendModes.ADD);
    c.add(glow);
    scene.tweens.add({ targets: glow, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    // Flames painted around their base so the flicker (scaleY) grows from the logs.
    const fkey = 'room-flames';
    paintTexture(scene, fkey, 64, 66, (ctx) => {
      for (const [w, h, col] of [[30, 62, 0xff7a1a], [19, 44, 0xffc12e], [9, 24, 0xfff3a0]]) {
        const g = ctx.createLinearGradient(0, 64 - h, 0, 64);
        g.addColorStop(0, css(col, 0));
        g.addColorStop(0.35, css(col, 0.95));
        g.addColorStop(1, css(shade(col, 1.1)));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(32 - w, 64);
        ctx.bezierCurveTo(32 - w, 64 - h * 0.5, 32 - w * 0.2, 64 - h * 0.7, 32, 64 - h);
        ctx.bezierCurveTo(32 + w * 0.2, 64 - h * 0.7, 32 + w, 64 - h * 0.5, 32 + w, 64);
        ctx.closePath();
        ctx.fill();
      }
    });
    const flames = scene.add.image(fx, floorY - 6, fkey).setOrigin(0.5, 64 / 66).setScale(0.5);
    c.add(flames);
    scene.tweens.add({ targets: flames, scaleY: 0.42, scaleX: 0.53, duration: 170, yoyo: true, repeat: -1 });
  }

  // Light: cold blue when bare, warmer with every upgrade (and the fire).
  const coldness = Math.max(0, 0.32 - owned.length * 0.055);
  if (coldness > 0) c.add(scene.add.rectangle(X, Y, W, H, 0x1d2b4a, coldness).setOrigin(0));
  if (has('fireplace')) c.add(scene.add.rectangle(X, Y, W, H, 0xffa040, 0.07).setOrigin(0));

  // The player, at home, with a soft shadow.
  c.add(scene.add.image(X + W * 0.3, floorY + 64, 'shadow').setDisplaySize(44, 12));
  c.guest = scene.add.image(X + W * 0.3, floorY + 64, 'pl-home-idle').setOrigin(0.5, 60 / 64).setScale(1.1);
  c.add(c.guest);
  return c;
}
