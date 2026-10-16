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

function drawHeart(g, color) {
  g.fillStyle(color);
  g.fillCircle(6, 7, 5.5);
  g.fillCircle(16, 7, 5.5);
  g.fillTriangle(1, 9, 21, 9, 11, 19);
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

  makeTexture(scene, 'heart-full', 22, 20, (g) => drawHeart(g, 0xe84a5f));
  makeTexture(scene, 'heart-empty', 22, 20, (g) => drawHeart(g, 0x000000));

  makeTexture(scene, 'petal', 9, 6, (g) => {
    g.fillStyle(0xf8b8d0).fillEllipse(4.5, 3, 9, 5);
    g.fillStyle(0xfde0eb).fillEllipse(3.5, 2.5, 4, 2);
  });
  makeTexture(scene, 'droplet', 6, 6, (g) => {
    g.fillStyle(0xd8f3ff).fillCircle(3, 3, 3);
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

export function createSeasonTextures(scene, season) {
  const p = season.palette;
  const k = season.key;

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
    g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 26; i++) g.fillCircle(20 + rnd() * 100, 20 + rnd() * 90, 1.6);
  });

  makeTexture(scene, `hide-bush-${k}`, 100, 62, (g) => {
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
  });

  // Tall, dense flower bed: tall enough to cover a crouching player.
  makeTexture(scene, `hide-flowers-${k}`, 96, 44, (g) => {
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
  });
}
