// Every sprite is drawn in code with Graphics and baked into a texture once.
// Common textures (player, hearts, particles) are made in BootScene;
// season textures (trees, bushes) are made per season from its palette.

export const PLAYER_FRAME = { width: 32, height: 48 };

const PLAYER_COLORS = {
  hat: 0x5a3a28,
  hatBand: 0x2f1f16,
  skin: 0xf2c9a0,
  eye: 0x2b2b2b,
  scarf: 0xd94f4a,
  coat: 0x34506e,
  coatDark: 0x253b54,
  button: 0xe8c66a,
  legs: 0x2e2e36,
  shoes: 0x1c1410,
};

// Leg rectangles [x, y, w, h] per pose; shoes are drawn at each leg's foot.
const LEG_POSES = {
  idle: [[12, 39, 4, 7], [17, 39, 4, 7]],
  walk1: [[9, 38, 4, 7], [19, 38, 4, 7]],
  walk2: [[13, 39, 4, 7], [16, 38, 4, 6]],
  jump: [[10, 37, 4, 6], [18, 39, 4, 5]],
  crouch: [[8, 43, 6, 3], [18, 43, 6, 3]],
};

export const POLICE_FRAME = { width: 32, height: 50 };

// Plain-clothes officer: ordinary polo shirt and slacks. The tell that never
// changes between seasons is the black sunglasses with a white glint.
const POLICE_COLORS = {
  hair: 0x2b2018,
  skin: 0xd9a77e,
  glasses: 0x111111,
  glint: 0xffffff,
  shirt: 0xe0a83a,
  shirtDark: 0xb98428,
  collar: 0xf6e7c1,
  trousers: 0x7a5c44,
  shoes: 0x2a2a2a,
};

const POLICE_LEGS = {
  idle: [[12, 40, 4, 8], [17, 40, 4, 8]],
  walk1: [[9, 40, 4, 8], [19, 40, 4, 8]],
  walk2: [[13, 40, 4, 8], [16, 40, 4, 7]],
};

function drawPolice(g, pose) {
  const C = POLICE_COLORS;
  for (const [x, y, w, h] of POLICE_LEGS[pose]) {
    g.fillStyle(C.trousers).fillRect(x, y, w, h);
    g.fillStyle(C.shoes).fillRect(x, y + h, w + 2, 2);
  }
  g.fillStyle(C.trousers).fillRect(10, 33, 12, 8); // hips
  g.fillStyle(C.shirt).fillPoints([{ x: 10, y: 17 }, { x: 22, y: 17 }, { x: 23, y: 34 }, { x: 9, y: 34 }], true);
  g.fillStyle(C.collar).fillRect(12, 16, 9, 3);
  g.fillStyle(C.shirtDark).fillRect(16, 19, 4, 8); // sleeve
  g.fillStyle(C.skin).fillRect(16, 27, 4, 6); // forearm
  g.fillStyle(C.skin).fillRect(13, 14, 6, 3); // neck
  g.fillStyle(C.skin).fillRect(11, 4, 11, 11); // head
  g.fillStyle(C.hair).fillRect(10, 2, 12, 4);
  g.fillRect(10, 5, 3, 5);
  g.fillStyle(C.glasses).fillRect(14, 8, 9, 3);
  g.fillRect(12, 8, 2, 1); // arm of the glasses
  g.fillStyle(C.glint).fillRect(20, 8, 2, 1);
}

function makeTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

function drawPlayer(g, pose) {
  const C = PLAYER_COLORS;
  const crouch = pose === 'crouch';
  const dy = crouch ? 12 : 0;

  for (const [x, y, w, h] of LEG_POSES[pose]) {
    g.fillStyle(C.legs).fillRect(x, y, w, h);
    g.fillStyle(C.shoes).fillRect(x, y + h, w + 2, 2);
  }

  // Long coat.
  const coat = crouch
    ? [[9, 30], [23, 30], [26, 44], [6, 44]]
    : [[10, 21], [22, 21], [24, 39], [8, 39]];
  g.fillStyle(C.coat).fillPoints(coat.map(([x, y]) => ({ x, y })), true);
  g.fillStyle(C.coatDark);
  g.fillRect(15, coat[0][1] + 1, 1, coat[2][1] - coat[0][1] - 1); // front seam
  g.fillRect(coat[3][0] + 1, coat[0][1] + 9, coat[1][0] - coat[0][0] + 2, 2); // belt
  g.fillStyle(C.button);
  g.fillRect(17, coat[0][1] + 3, 2, 2);
  g.fillRect(17, coat[0][1] + 13, 2, 2);

  // Arm and hand.
  g.fillStyle(C.coatDark).fillRect(17, 23 + dy, 4, 10);
  g.fillStyle(C.skin).fillRect(17, 33 + dy, 4, 2);

  // Scarf with a tail.
  g.fillStyle(C.scarf).fillRect(10, 19 + dy, 13, 3);
  g.fillRect(10, 22 + dy, 3, 5);

  // Face.
  g.fillStyle(C.skin).fillRect(11, 11 + dy, 11, 8);
  g.fillStyle(C.eye).fillRect(18, 14 + dy, 2, 2);

  // Hat: brim, crown, band.
  g.fillStyle(C.hat).fillRect(7, 9 + dy, 19, 3);
  g.fillRect(10, 2 + dy, 13, 8);
  g.fillStyle(C.hatBand).fillRect(10, 7 + dy, 13, 2);
}

// Heart in a 22×20 frame, optionally shrunk toward its centre (for inner fills).
function drawHeart(g, color, scale = 1) {
  const p = (x, y) => [11 + (x - 11) * scale, 10 + (y - 10) * scale];
  g.fillStyle(color);
  g.fillCircle(...p(6, 7), 5.5 * scale);
  g.fillCircle(...p(16, 7), 5.5 * scale);
  g.fillTriangle(...p(1, 9), ...p(21, 9), ...p(11, 19));
}

// Small seeded random so procedural art is identical every run.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createCommonTextures(scene) {
  for (const pose of Object.keys(LEG_POSES)) {
    makeTexture(scene, `player-${pose}`, PLAYER_FRAME.width, PLAYER_FRAME.height, (g) => drawPlayer(g, pose));
  }

  for (const pose of Object.keys(POLICE_LEGS)) {
    makeTexture(scene, `police-${pose}`, POLICE_FRAME.width, POLICE_FRAME.height, (g) => drawPolice(g, pose));
  }

  // On skis (Winter): skis under the feet with upturned tips, and a pole.
  const skis = (g, y, pole) => {
    g.fillStyle(0x2f6fd8).fillRect(0, y, 32, 2);
    g.fillRect(30, y - 2, 2, 2);
    g.lineStyle(1, 0x3b2a20).lineBetween(pole[0], pole[1], pole[2], pole[3]);
  };
  makeTexture(scene, 'player-ski', PLAYER_FRAME.width, PLAYER_FRAME.height, (g) => {
    drawPlayer(g, 'idle');
    skis(g, 46, [18, 32, 8, 46]);
  });
  makeTexture(scene, 'player-ski-air', PLAYER_FRAME.width, PLAYER_FRAME.height, (g) => {
    drawPlayer(g, 'jump');
    skis(g, 45, [18, 30, 4, 40]);
  });
  makeTexture(scene, 'police-ski', POLICE_FRAME.width, POLICE_FRAME.height, (g) => {
    drawPolice(g, 'idle');
    g.fillStyle(0xd94f4a).fillRect(0, 48, 32, 2);
    g.fillRect(30, 46, 2, 2);
    g.lineStyle(1, 0x2a2a2e).lineBetween(18, 30, 8, 48);
  });

  // Winter: snowflakes, boot prints, and a soft brush that cuts the blizzard fog.
  makeTexture(scene, 'snowflake', 6, 6, (g) => {
    g.fillStyle(0xffffff).fillCircle(3, 3, 2.5);
  });
  makeTexture(scene, 'footprint', 12, 6, (g) => {
    g.fillStyle(0x7d93a8).fillEllipse(3, 3, 6, 4);
    g.fillEllipse(9, 2, 6, 4);
  });
  makeTexture(scene, 'fog-hole', 400, 400, (g) => {
    // Overlapping circles build a soft edge: fully clear in the middle.
    for (let r = 200; r > 0; r -= 8) g.fillStyle(0xffffff, 0.09).fillCircle(200, 200, r);
    g.fillStyle(0xffffff).fillCircle(200, 200, 110);
  });

  makeTexture(scene, 'heart-full', 22, 20, (g) => drawHeart(g, 0xe84a5f));
  // Empty slot: dark outline, pale fill. Readable on light skies and dark menus.
  makeTexture(scene, 'heart-empty', 22, 20, (g) => {
    drawHeart(g, 0x3b2a20);
    drawHeart(g, 0xe9dfe6, 0.72);
  });

  makeTexture(scene, 'petal', 9, 6, (g) => {
    g.fillStyle(0xf8b8d0).fillEllipse(4.5, 3, 9, 5);
    g.fillStyle(0xfde0eb).fillEllipse(3.5, 2.5, 4, 2);
  });
  makeTexture(scene, 'droplet', 6, 6, (g) => {
    g.fillStyle(0xd8f3ff).fillCircle(3, 3, 3);
  });
  makeTexture(scene, 'bubble', 8, 8, (g) => {
    g.lineStyle(1.5, 0xe8fbff).strokeCircle(4, 4, 3);
    g.fillStyle(0xffffff).fillCircle(3, 3, 1);
  });
  makeTexture(scene, 'seed', 10, 10, (g) => {
    g.lineStyle(1, 0xffffff, 0.9);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineBetween(5, 5, 5 + Math.cos(a) * 4.5, 5 + Math.sin(a) * 4.5);
    }
    g.fillStyle(0xfff6c8).fillCircle(5, 5, 1.5);
  });
  // A soft vertical wobble of light: rises off hot ground.
  makeTexture(scene, 'shimmer', 10, 40, (g) => {
    for (let y = 0; y < 40; y += 2) {
      const x = 5 + Math.sin(y * 0.4) * 3;
      g.fillStyle(0xffffff, 0.5 * Math.sin((y / 40) * Math.PI)).fillRect(x - 1, y, 2, 2);
    }
  });

  // Moving platforms. Canoe rim sits above its deck so the rider's feet are inside.
  makeTexture(scene, 'mover-canoe', 130, 30, (g) => {
    g.fillStyle(0xb8341f).fillPoints([{ x: 0, y: 2 }, { x: 14, y: 8 }, { x: 116, y: 8 }, { x: 130, y: 2 }, { x: 116, y: 28 }, { x: 14, y: 28 }], true);
    g.fillStyle(0xe8553b).fillPoints([{ x: 4, y: 5 }, { x: 16, y: 10 }, { x: 114, y: 10 }, { x: 126, y: 5 }, { x: 114, y: 25 }, { x: 16, y: 25 }], true);
    g.fillStyle(0xffd23f).fillRect(16, 16, 98, 3);
    g.fillStyle(0x7a2414).fillRect(14, 8, 102, 3);
    g.fillStyle(0x8a5a2e).fillRect(40, 9, 4, 4);
    g.fillRect(86, 9, 4, 4);
  });
  // Vintage steam train (Fall). Carriage roof = top of the texture; wheels sit on the rail.
  makeTexture(scene, 'train-carriage', 150, 90, (g) => {
    g.fillStyle(0x3a2a2a).fillRoundedRect(0, 0, 150, 10, 4); // roof
    g.fillStyle(0x7a1f2b).fillRect(2, 8, 146, 62); // maroon body
    g.fillStyle(0xd9a441).fillRect(2, 14, 146, 3); // gold lining
    g.fillRect(2, 60, 146, 3);
    for (let wx = 12; wx < 140; wx += 32) {
      g.fillStyle(0xf6e7c1).fillRoundedRect(wx, 22, 22, 26, 3); // lit windows
      g.fillStyle(0xffd27a, 0.6).fillRect(wx + 2, 36, 18, 10);
    }
    g.fillStyle(0x1e1a1a).fillRect(6, 70, 138, 8); // underframe
    g.fillStyle(0xb3262b);
    [24, 50, 100, 126].forEach((x) => g.fillCircle(x, 80, 9));
    g.fillStyle(0x1e1a1a);
    [24, 50, 100, 126].forEach((x) => g.fillCircle(x, 80, 3));
  });
  makeTexture(scene, 'train-loco', 150, 110, (g) => {
    g.fillStyle(0x2a2a2e).fillRect(116, 0, 16, 34); // chimney
    g.fillStyle(0xd9a441).fillRect(112, 0, 24, 5);
    g.fillStyle(0xd9a441).fillRoundedRect(84, 18, 18, 16, 6); // brass dome
    g.fillStyle(0x2a2a2e).fillRoundedRect(46, 32, 102, 46, 16); // boiler
    g.fillStyle(0xd9a441).fillRect(60, 32, 3, 46);
    g.fillRect(100, 32, 3, 46);
    g.fillStyle(0x3a3a40).fillRect(0, 10, 50, 70); // cab
    g.fillStyle(0x1e1e22).fillRect(-2, 8, 54, 6); // cab roof
    g.fillStyle(0xf6e7c1).fillRect(12, 22, 24, 22); // cab window
    g.fillStyle(0xb3262b).fillRect(0, 78, 150, 8); // running board
    g.fillRect(140, 70, 10, 16); // buffer beam
    g.fillStyle(0xb3262b);
    [36, 74, 112].forEach((x) => g.fillCircle(x, 94, 15));
    g.fillStyle(0x1e1a1a);
    [36, 74, 112].forEach((x) => g.fillCircle(x, 94, 5));
    g.lineStyle(3, 0xd9a441).lineBetween(36, 94, 112, 94);
  });
  // Seen side-on at a level crossing, scrolled as a tile sprite while a train passes.
  makeTexture(scene, 'crossing-train', 220, 150, (g) => {
    g.fillStyle(0x4a3326).fillRect(6, 20, 208, 108);
    g.fillStyle(0x6b4a36);
    for (let x = 14; x < 210; x += 22) g.fillRect(x, 26, 16, 96);
    g.fillStyle(0xd9a441).fillRect(6, 64, 208, 4);
    g.fillStyle(0x1e1a1a).fillRect(0, 128, 220, 8);
    g.fillStyle(0x2a2a2e);
    [36, 70, 150, 184].forEach((x) => g.fillCircle(x, 140, 10));
    g.fillStyle(0x1e1a1a).fillRect(0, 100, 8, 6);
  });
  makeTexture(scene, 'puff', 28, 28, (g) => {
    for (let r = 13; r > 2; r -= 3) g.fillStyle(0xffffff, 0.18).fillCircle(14, 14, r);
  });
  makeTexture(scene, 'leaf', 12, 8, (g) => {
    g.fillStyle(0xffffff).fillEllipse(6, 4, 11, 6);
    g.lineStyle(1, 0xdddddd).lineBetween(1, 4, 11, 4);
  });

  makeTexture(scene, 'mover-log', 110, 20, (g) => {
    g.fillStyle(0x6b4423).fillRoundedRect(0, 0, 110, 20, 9);
    g.fillStyle(0x8a5a34).fillRoundedRect(2, 2, 106, 12, 6);
    g.lineStyle(2, 0x5a3a1c);
    g.lineBetween(20, 6, 46, 6);
    g.lineBetween(56, 11, 90, 11);
    g.fillStyle(0xd9a86a).fillEllipse(104, 10, 9, 16);
    g.lineStyle(1, 0x8a5a34).strokeEllipse(104, 10, 5, 9);
  });

  // HUD icons: one per season, plus a coin. All 28×28 except the coin.
  makeTexture(scene, 'icon-spring', 28, 28, (g) => {
    g.fillStyle(0xd76b93);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillCircle(14 + Math.cos(a) * 7, 14 + Math.sin(a) * 7, 6.5);
    }
    g.fillStyle(0xf8b8d0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillCircle(14 + Math.cos(a) * 7, 14 + Math.sin(a) * 7, 5);
    }
    g.fillStyle(0xffd84a).fillCircle(14, 14, 3.5);
  });
  makeTexture(scene, 'icon-summer', 28, 28, (g) => {
    g.lineStyle(3, 0xf2a417);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(14 + Math.cos(a) * 9, 14 + Math.sin(a) * 9, 14 + Math.cos(a) * 13, 14 + Math.sin(a) * 13);
    }
    g.fillStyle(0xf2a417).fillCircle(14, 14, 8);
    g.fillStyle(0xffd84a).fillCircle(14, 14, 6.5);
  });
  makeTexture(scene, 'icon-fall', 28, 28, (g) => {
    g.fillStyle(0xa8401a).fillPoints([{ x: 14, y: 1 }, { x: 26, y: 13 }, { x: 14, y: 25 }, { x: 2, y: 13 }], true);
    g.fillStyle(0xe0632a).fillPoints([{ x: 14, y: 3 }, { x: 24, y: 13 }, { x: 14, y: 23 }, { x: 4, y: 13 }], true);
    g.lineStyle(2, 0x7a2e12).lineBetween(14, 6, 14, 27);
    g.lineBetween(14, 13, 9, 9);
    g.lineBetween(14, 13, 19, 9);
  });
  makeTexture(scene, 'icon-winter', 28, 28, (g) => {
    const arms = (width, color) => {
      g.lineStyle(width, color);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        const dx = Math.cos(a) * 11;
        const dy = Math.sin(a) * 11;
        g.lineBetween(14 - dx, 14 - dy, 14 + dx, 14 + dy);
      }
    };
    arms(5, 0x3f6c9e);
    arms(2.5, 0xffffff);
    g.fillStyle(0xffffff).fillCircle(14, 14, 2.5);
  });
  makeTexture(scene, 'coin', 22, 22, (g) => {
    g.fillStyle(0xb7811c).fillCircle(11, 11, 10);
    g.fillStyle(0xf5c542).fillCircle(11, 11, 8);
    g.fillStyle(0xffe58a).fillCircle(8.5, 8, 3);
    g.fillStyle(0xb7811c).fillRect(10, 6, 2, 10);
  });

  if (!scene.anims.exists('player-walk')) {
    scene.anims.create({
      key: 'player-walk',
      frames: [{ key: 'player-walk1' }, { key: 'player-idle' }, { key: 'player-walk2' }, { key: 'player-idle' }],
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!scene.anims.exists('police-walk')) {
    scene.anims.create({
      key: 'police-walk',
      frames: [{ key: 'police-walk1' }, { key: 'police-idle' }, { key: 'police-walk2' }, { key: 'police-idle' }],
      frameRate: 6,
      repeat: -1,
    });
  }
}

// Hiding-spot textures by kind, drawn from the season palette.
// Only the kinds listed in a season's `hidingSpots` are generated.
const HIDE_TEXTURES = {
  bush: {
    width: 100,
    height: 62,
    draw(g, p) {
      const blobs = [[22, 42, 20], [50, 32, 27], [78, 42, 20]];
      g.fillStyle(p.bushDark);
      blobs.forEach(([x, y, r]) => g.fillCircle(x, y, r));
      g.fillRect(4, 42, 92, 20);
      g.fillStyle(p.bush);
      blobs.forEach(([x, y, r]) => g.fillCircle(x, y - 3, r - 4));
      g.fillStyle(p.bushLight);
      blobs.forEach(([x, y, r]) => g.fillCircle(x - r * 0.3, y - r * 0.45, r * 0.35));
      const rnd = seededRandom(11);
      for (let i = 0; i < 9; i++) {
        g.fillStyle(p.flowers[i % p.flowers.length]);
        g.fillCircle(12 + rnd() * 76, 14 + rnd() * 36, 2.5);
      }
    },
  },
  // Tall, dense flower bed: tall enough to cover a crouching player.
  flowers: {
    width: 96,
    height: 44,
    draw(g, p) {
      g.fillStyle(p.dirtDark).fillRoundedRect(2, 36, 92, 8, 3);
      const rnd = seededRandom(17);
      for (let i = 0; i < 26; i++) {
        const x = 6 + (i / 25) * 84 + (rnd() - 0.5) * 4;
        const top = 8 + rnd() * 12;
        g.lineStyle(3, p.grassDark).lineBetween(x, 40, x, top);
        g.fillStyle(p.bushDark).fillEllipse(x + 3, 30 - rnd() * 6, 7, 13);
      }
      g.fillStyle(p.bush).fillRect(4, 28, 88, 10);
      for (let i = 0; i < 22; i++) {
        const x = 8 + (i / 21) * 80 + (rnd() - 0.5) * 6;
        const y = 6 + rnd() * 14;
        g.fillStyle(p.flowers[i % p.flowers.length]);
        g.fillEllipse(x, y, 9, 11);
        g.fillTriangle(x - 4.5, y - 2, x - 1.5, y - 8, x + 1, y - 2);
        g.fillTriangle(x - 1, y - 2, x + 1.5, y - 8, x + 4.5, y - 2);
      }
    },
  },
  // ----- Hiding places unlocked in the shop -----
  // Potting shed (Spring).
  shed: {
    width: 104,
    height: 92,
    draw(g, p) {
      g.fillStyle(p.woodDark).fillRect(10, 30, 84, 62);
      g.fillStyle(p.wood).fillRect(14, 34, 76, 58);
      g.fillStyle(p.woodDark);
      for (let x = 24; x < 90; x += 12) g.fillRect(x, 34, 2, 58);
      g.fillStyle(0x3a2e24).fillRect(38, 50, 28, 42); // doorway
      g.fillStyle(p.house.roof).fillPoints([{ x: 0, y: 34 }, { x: 52, y: 4 }, { x: 104, y: 34 }], true);
      g.fillStyle(p.flowers[0]).fillCircle(20, 88, 6);
      g.fillStyle(p.flowers[2]).fillCircle(86, 88, 6);
    },
  },
  // Boathouse on the shore (Summer).
  boathouse: {
    width: 128,
    height: 96,
    draw(g, p) {
      g.fillStyle(p.woodDark).fillRect(8, 34, 112, 62);
      g.fillStyle(p.wood).fillRect(12, 38, 104, 58);
      g.fillStyle(p.woodDark);
      for (let y = 46; y < 96; y += 10) g.fillRect(12, y, 104, 2);
      g.fillStyle(0x20303a).fillRoundedRect(36, 52, 56, 44, { tl: 26, tr: 26, bl: 0, br: 0 }); // boat door
      g.fillStyle(p.house.roof).fillPoints([{ x: 0, y: 38 }, { x: 64, y: 2 }, { x: 128, y: 38 }], true);
      g.fillStyle(0xffffff).fillRect(54, 20, 20, 8);
    },
  },
  // Hollow oak with a dark opening (Fall).
  hollowTree: {
    width: 110,
    height: 120,
    draw(g, p) {
      g.fillStyle(p.trunk).fillRect(30, 40, 50, 80);
      g.fillStyle(0x2a1a10).fillEllipse(55, 92, 30, 50); // hollow
      g.fillStyle(p.blossomDark).fillCircle(55, 34, 34);
      g.fillStyle(p.blossom).fillCircle(32, 40, 24);
      g.fillCircle(80, 38, 26);
      g.fillStyle(p.blossomLight).fillCircle(56, 20, 18);
    },
  },
  // Ice cave mouth in a snowbank (Winter).
  iceCave: {
    width: 124,
    height: 84,
    draw(g, p) {
      g.fillStyle(p.grassDark).fillEllipse(62, 60, 124, 60);
      g.fillStyle(0xffffff).fillEllipse(62, 54, 116, 60);
      g.fillStyle(0x9cc4e4).fillEllipse(62, 70, 58, 46);
      g.fillStyle(0x3a5a78).fillEllipse(62, 76, 42, 36); // cave mouth
      g.fillStyle(0xd8f0ff);
      for (let x = 40; x < 90; x += 10) g.fillTriangle(x, 52, x + 6, 52, x + 3, 64); // icicles
    },
  },
  // Stack of old luggage trunks on a station island.
  // Small timber hut buried in snow (Winter blizzard).
  hut: {
    width: 104,
    height: 86,
    draw(g, p) {
      g.fillStyle(p.woodDark).fillRect(12, 34, 80, 52);
      g.fillStyle(p.wood).fillRect(16, 38, 72, 48);
      g.fillStyle(p.woodDark);
      for (let y = 46; y < 86; y += 10) g.fillRect(16, y, 72, 2);
      g.fillStyle(0x2b2320).fillRect(42, 52, 22, 34); // dark doorway
      g.fillStyle(p.house.window).fillRect(68, 50, 12, 10);
      g.fillStyle(0xffffff).fillPoints([{ x: 0, y: 40 }, { x: 52, y: 4 }, { x: 104, y: 40 }, { x: 96, y: 46 }, { x: 8, y: 46 }], true);
      g.fillStyle(p.grassDark).fillRect(8, 42, 88, 4);
      g.fillStyle(0xffffff).fillEllipse(30, 84, 50, 14);
      g.fillEllipse(84, 84, 40, 12);
    },
  },
  // Wind-piled snowdrift: deep enough to crouch behind.
  drift: {
    width: 108,
    height: 48,
    draw(g, p) {
      g.fillStyle(p.grassDark).fillEllipse(54, 34, 108, 30);
      g.fillStyle(0xffffff).fillEllipse(48, 30, 96, 36);
      g.fillEllipse(70, 22, 60, 30);
      g.fillStyle(p.grassDark, 0.6).fillEllipse(40, 40, 60, 8);
    },
  },
  crates: {
    width: 92,
    height: 58,
    draw(g, p) {
      g.fillStyle(p.woodDark).fillRect(2, 22, 52, 36);
      g.fillStyle(p.wood).fillRect(5, 25, 46, 30);
      g.fillStyle(p.woodDark).fillRect(5, 37, 46, 3);
      g.fillStyle(0x7a1f2b).fillRect(48, 30, 42, 28); // red trunk
      g.fillStyle(0xd9a441).fillRect(48, 40, 42, 3);
      g.fillRect(66, 30, 4, 28);
      g.fillStyle(0x5a4636).fillRoundedRect(14, 2, 54, 22, 4); // suitcase on top
      g.fillStyle(0xd9a441).fillRect(36, 0, 10, 4);
      g.fillStyle(0x3a2e24).fillRect(14, 12, 54, 2);
    },
  },
  // Rock overhang: a heavy lip of rock with cool shade beneath (shade + hiding).
  overhang: {
    width: 120,
    height: 100,
    draw(g, p) {
      g.fillStyle(0x1b2a4a, 0.32).fillRect(6, 30, 108, 70); // shade
      g.fillStyle(0x1b2a4a, 0.18).fillRect(0, 40, 120, 60);
      g.fillStyle(p.rockDark).fillRect(98, 20, 22, 80); // back pillar
      g.fillStyle(p.rock).fillRect(102, 20, 14, 80);
      g.fillStyle(p.rockDark).fillPoints([{ x: 0, y: 14 }, { x: 18, y: 2 }, { x: 70, y: 0 }, { x: 120, y: 6 }, { x: 120, y: 36 }, { x: 60, y: 42 }, { x: 10, y: 36 }], true);
      g.fillStyle(p.rock).fillPoints([{ x: 4, y: 14 }, { x: 20, y: 4 }, { x: 70, y: 2 }, { x: 118, y: 8 }, { x: 118, y: 28 }, { x: 60, y: 34 }, { x: 12, y: 30 }], true);
      g.fillStyle(p.rockLight).fillRect(22, 6, 60, 4);
      g.lineStyle(2, p.rockDark).lineBetween(40, 12, 48, 26);
      g.lineBetween(84, 10, 78, 24);
      g.fillStyle(p.rockDark);
      g.fillCircle(20, 97, 4);
      g.fillCircle(30, 98, 3);
    },
  },
  // Tall reeds and cattails standing in water; tiled along the river bank.
  reeds: {
    width: 100,
    height: 130,
    draw(g, p) {
      const rnd = seededRandom(23);
      for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < 22; i++) {
          const x = 4 + (i / 21) * 92 + (rnd() - 0.5) * 6;
          const top = 10 + rnd() * 40 + layer * 14;
          const lean = (rnd() - 0.5) * 12;
          g.lineStyle(layer ? 4 : 3, layer ? p.reed : p.reedDark).lineBetween(x, 130, x + lean, top);
          if (rnd() < 0.3) g.fillStyle(p.reedTip).fillEllipse(x + lean, top + 8, 6, 18);
        }
      }
    },
  },
};

export function createSeasonTextures(scene, season) {
  const p = season.palette;
  const k = season.key;

  if (p.treeStyle === 'pine') {
    // Snowy pine: dark green tiers with snow on each.
    makeTexture(scene, `tree-${k}`, 140, 170, (g) => {
      g.fillStyle(p.trunk).fillRect(64, 140, 12, 30);
      for (let i = 0; i < 4; i++) {
        const y = 30 + i * 30;
        const half = 26 + i * 12;
        g.fillStyle(p.blossomDark).fillTriangle(70 - half, y + 44, 70 + half, y + 44, 70, y - 6);
        g.fillStyle(p.blossom).fillTriangle(70 - half + 6, y + 40, 70 + half - 6, y + 40, 70, y);
        g.fillStyle(p.blossomLight).fillTriangle(70 - half * 0.55, y + 16, 70 + half * 0.55, y + 16, 70, y);
      }
    });
  }
  makeTexture(scene, `tree-${k}`, 140, 170, (g) => {
    g.fillStyle(p.trunk);
    g.fillPoints([{ x: 63, y: 170 }, { x: 77, y: 170 }, { x: 73, y: 80 }, { x: 67, y: 80 }], true);
    g.lineStyle(6, p.trunk);
    g.lineBetween(70, 118, 42, 84);
    g.lineBetween(70, 104, 100, 76);
    const blobs = [[70, 60, 38], [38, 80, 26], [102, 78, 28], [52, 40, 26], [90, 42, 28], [70, 88, 26]];
    g.fillStyle(p.blossomDark);
    blobs.forEach(([x, y, r]) => g.fillCircle(x, y + 5, r));
    g.fillStyle(p.blossom);
    blobs.forEach(([x, y, r]) => g.fillCircle(x, y, r - 2));
    g.fillStyle(p.blossomLight);
    blobs.forEach(([x, y, r]) => g.fillCircle(x - r * 0.3, y - r * 0.35, r * 0.4));
    const rnd = seededRandom(7);
    g.fillStyle(p.treeSpeckle ?? 0xffffff, 0.8);
    for (let i = 0; i < 26; i++) g.fillCircle(20 + rnd() * 100, 20 + rnd() * 90, 1.6);
  });

  for (const kind of season.hidingSpots ?? []) {
    const spec = HIDE_TEXTURES[kind];
    if (spec) makeTexture(scene, `hide-${kind}-${k}`, spec.width, spec.height, (g) => spec.draw(g, p));
  }
}
