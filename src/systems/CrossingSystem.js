import { DEPTH } from '../config/game.js';
import { paintTexture, trackForCleanup, addArt, css, shade, vGradient, roundRect, contactShadow } from '../art/Paint.js';

const TRAIN_HEIGHT = 150;
const TRAIN_SPEED = 900; // px/s the wagons stream past

// Level crossings (layout.crossings): tracks that cross the path. On a fixed timetable
// a signal warns (flashing red + bell), then a train passes across the crossing.
// While it passes it is deadly to touch and it blocks police vision (a vision
// blocker), which is the safe moment to move behind it.
//
// def: { x, w, periodMs, offsetMs, warnMs, passMs }
export default class CrossingSystem {
  // timing < 1 (harder levels) shortens the warning before each train.
  constructor(scene, defs = [], groundY, palette, audio, timing = 1) {
    this.scene = scene;
    this.timing = timing;
    this.audio = audio;
    this.groundY = groundY;
    this.crossings = defs.map((def) => this.build(def, palette));
  }

  build(def, p) {
    const { scene, groundY } = this;
    const { x, w } = def;

    // Track receding into the distance (sleepers narrowing, converging rails) and a
    // signal post with a crossbuck: painted once.
    const px = x - 12;
    const key = `crossing-${x}-${Math.random().toString(36).slice(2, 6)}`;
    const left = px - 24;
    const top = groundY - 112;
    paintTexture(scene, key, x + w - left + 4, groundY + 16 - top, (ctx) => {
      ctx.translate(-left, -top);
      vGradient(ctx, x, groundY - 4, w, 16, [[0, p.dirtDark], [1, shade(p.dirtDark, 0.75)]]);
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const y = groundY + 8 - t * 92;
        const half = (w / 2 - 6) * (1 - t * 0.8);
        ctx.globalAlpha = 1 - t * 0.6;
        vGradient(ctx, x + w / 2 - half, y, half * 2, 5 - t * 3, [[0, shade(p.woodDark, 1.25)], [1, p.woodDark]]);
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      for (const [w1, c] of [[3.5, 0x4a4d55], [1.4, 0xd8dde3]]) {
        ctx.strokeStyle = css(c);
        ctx.lineWidth = w1;
        ctx.beginPath();
        ctx.moveTo(x + 14, groundY + 10);
        ctx.lineTo(x + w / 2 - 6, groundY - 86);
        ctx.moveTo(x + w - 14, groundY + 10);
        ctx.lineTo(x + w / 2 + 6, groundY - 86);
        ctx.stroke();
      }
      contactShadow(ctx, px, groundY, 14, 3, 0.35);
      vGradient(ctx, px - 3, groundY - 96, 6, 96, [[0, 0x55585f], [1, 0x24252a]]);
      ctx.lineWidth = 6;
      ctx.strokeStyle = css(0x3b2a20);
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        ctx.moveTo(px - 14, groundY - 104);
        ctx.lineTo(px + 14, groundY - 88);
        ctx.moveTo(px - 14, groundY - 88);
        ctx.lineTo(px + 14, groundY - 104);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = css(0xffffff);
      }
      roundRect(ctx, px - 10, groundY - 80, 20, 22, 5);
      ctx.fillStyle = css(0x1e1e22);
      ctx.fill();
    }, { outline: 1 });
    trackForCleanup(scene, key);
    addArt(scene, left, top, key).setOrigin(0).setDepth(DEPTH.decorBack);
    const lamp = scene.add.graphics().setDepth(DEPTH.decor + 1);

    const tile = scene.add
      .tileSprite(x, groundY - TRAIN_HEIGHT + 8, w, TRAIN_HEIGHT, 'crossing-train')
      .setOrigin(0, 0)
      .setTileScale(0.5) // painted at 2×
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
    if (t >= def.periodMs - def.passMs - def.warnMs * this.timing) return 'warn';
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
            this.scene.shake?.(c.def.passMs, 0.002);
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
    // Barrier arm: up when clear, down across the track when a train is due
    // (a shape cue as well as the lamp colour).
    const armY = this.groundY - 46;
    if (state === 'idle') {
      c.lamp.fillStyle(0xffffff).fillRect(c.lampX - 2, armY - 60, 6, 60);
    } else {
      const w = c.def.w + 18;
      c.lamp.fillStyle(0xffffff).fillRect(c.lampX, armY - 3, w, 7);
      c.lamp.fillStyle(0xd94f4a);
      for (let x = c.lampX + 6; x < c.lampX + w; x += 22) c.lamp.fillRect(x, armY - 3, 11, 7);
      c.lamp.lineStyle(2, 0x3b2a20).strokeRect(c.lampX, armY - 3, w, 7);
    }
    c.lamp.fillStyle(color).fillCircle(c.lampX, y, 6);
    if (color !== 0x5a1a16) c.lamp.fillStyle(color, 0.3).fillCircle(c.lampX, y, 12);
  }

  // Rectangles that currently block police vision.
  blockers() {
    return this.crossings.filter((c) => c.state === 'passing').map((c) => c.blockRect);
  }
}
