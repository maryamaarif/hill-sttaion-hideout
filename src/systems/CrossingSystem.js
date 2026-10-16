import { DEPTH } from '../config/game.js';

const TRAIN_HEIGHT = 150;
const TRAIN_SPEED = 900; // px/s the wagons stream past

// Level crossings (layout.crossings): tracks that cross the path. On a fixed timetable
// a signal warns (flashing red + bell), then a train passes across the crossing.
// While it passes it is deadly to touch and it blocks police vision (a vision
// blocker), which is the safe moment to move behind it.
//
// def: { x, w, periodMs, offsetMs, warnMs, passMs }
export default class CrossingSystem {
  constructor(scene, defs = [], groundY, palette, audio) {
    this.scene = scene;
    this.audio = audio;
    this.groundY = groundY;
    this.crossings = defs.map((def) => this.build(def, palette));
  }

  build(def, p) {
    const { scene, groundY } = this;
    const { x, w } = def;

    // Track receding into the distance: sleepers narrowing, two converging rails.
    const g = scene.add.graphics().setDepth(DEPTH.decorBack);
    g.fillStyle(p.dirtDark).fillRect(x, groundY - 4, w, 16);
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const y = groundY + 8 - t * 92;
      const half = (w / 2 - 6) * (1 - t * 0.8);
      g.fillStyle(p.woodDark, 1 - t * 0.6).fillRect(x + w / 2 - half, y, half * 2, 5 - t * 3);
    }
    g.lineStyle(3, 0x6d6d73);
    g.lineBetween(x + 14, groundY + 10, x + w / 2 - 6, groundY - 86);
    g.lineBetween(x + w - 14, groundY + 10, x + w / 2 + 6, groundY - 86);

    // Signal post with crossbuck and lamp.
    const post = scene.add.graphics().setDepth(DEPTH.decor);
    const px = x - 12;
    post.fillStyle(0x2a2a2e).fillRect(px - 2, groundY - 96, 5, 96);
    post.lineStyle(5, 0xffffff).lineBetween(px - 14, groundY - 104, px + 14, groundY - 88);
    post.lineBetween(px - 14, groundY - 88, px + 14, groundY - 104);
    post.fillStyle(0x1e1e22).fillRoundedRect(px - 10, groundY - 80, 20, 22, 5);
    const lamp = scene.add.graphics().setDepth(DEPTH.decor + 1);

    const tile = scene.add
      .tileSprite(x, groundY - TRAIN_HEIGHT + 8, w, TRAIN_HEIGHT, 'crossing-train')
      .setOrigin(0, 0)
      .setDepth(DEPTH.foreground)
      .setVisible(false);

    const steam = scene.add
      .particles(0, 0, 'puff', {
        x: { min: x, max: x + w },
        y: groundY - TRAIN_HEIGHT,
        speedY: { min: -70, max: -30 },
        speedX: { min: 40, max: 120 },
        scale: { start: 0.8, end: 2.4 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 1200,
        frequency: 70,
        emitting: false,
      })
      .setDepth(DEPTH.foreground + 1);

    return {
      def,
      lamp,
      lampX: px,
      tile,
      steam,
      state: 'idle',
      hitRect: new Phaser.Geom.Rectangle(x + 6, groundY - TRAIN_HEIGHT, w - 12, TRAIN_HEIGHT),
      blockRect: new Phaser.Geom.Rectangle(x, groundY - TRAIN_HEIGHT + 8, w, TRAIN_HEIGHT - 8),
    };
  }

  stateAt(def, time) {
    const t = (time + (def.offsetMs ?? 0)) % def.periodMs;
    if (t >= def.periodMs - def.passMs) return 'passing';
    if (t >= def.periodMs - def.passMs - def.warnMs) return 'warn';
    return 'idle';
  }

  // Returns 'hit' if the player is touching a passing train.
  update(time, dt, player) {
    let hit = false;
    const view = this.scene.cameras.main.worldView;
    for (const c of this.crossings) {
      const state = this.stateAt(c.def, time);
      const onScreen = c.def.x + c.def.w > view.x && c.def.x < view.right;
      if (state !== c.state) {
        if (state === 'warn' && onScreen) this.audio.play('bell');
        if (state === 'passing') {
          c.tile.setVisible(true).setAlpha(0);
          this.scene.tweens.add({ targets: c.tile, alpha: 1, duration: 120 });
          c.steam.start();
          if (onScreen) {
            this.audio.play('rumble');
            this.scene.cameras.main.shake(c.def.passMs, 0.002);
          }
        }
        if (c.state === 'passing') {
          this.scene.tweens.add({ targets: c.tile, alpha: 0, duration: 120, onComplete: () => c.tile.setVisible(false) });
          c.steam.stop();
        }
        c.state = state;
      }
      if (state === 'passing') {
        c.tile.tilePositionX -= TRAIN_SPEED * dt;
        const b = player.body;
        if (player.visible && Phaser.Geom.Rectangle.Overlaps(c.hitRect, new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height))) {
          hit = true;
        }
      }
      this.drawLamp(c, state, time);
    }
    return hit ? 'hit' : null;
  }

  drawLamp(c, state, time) {
    const flash = Math.floor(time / 250) % 2 === 0;
    const color = state === 'idle' ? 0x4cd964 : state === 'passing' || flash ? 0xff3b30 : 0x5a1a16;
    const y = this.groundY - 69;
    c.lamp.clear();
    c.lamp.fillStyle(color).fillCircle(c.lampX, y, 6);
    if (color !== 0x5a1a16) c.lamp.fillStyle(color, 0.3).fillCircle(c.lampX, y, 12);
  }

  // Rectangles that currently block police vision.
  blockers() {
    return this.crossings.filter((c) => c.state === 'passing').map((c) => c.blockRect);
  }
}
