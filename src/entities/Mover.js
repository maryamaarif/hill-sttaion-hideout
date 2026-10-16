import { DEPTH, MOVERS } from '../config/game.js';

// A moving platform that drifts right (canoe, log). The player rides on its deck;
// GameScene carries the rider by the mover's movement each frame.
//
// def: { kind, mode, from, to, y, w, speed, phase? }
//   kind    'canoe' | 'log' (texture mover-<kind>)
//   mode    'ferry': waits at `from` until the player steps on, travels to `to`, stays.
//           'loop':  travels from → to, pauses, fades out, reappears at `from`.
//   from/to left edge positions; y = deck top; phase = starting point along a loop (0..1)
export default class Mover {
  constructor(scene, def, speedScale = 1) {
    this.def = def;
    this.w = def.w;
    this.deckY = def.y;
    this.speed = def.speed * speedScale;
    this.canoe = def.kind === 'canoe';

    // Canoe rim sits above the deck so the rider's feet are inside the hull.
    this.rim = this.canoe ? 8 : 0;
    this.image = scene.add
      .image(0, 0, `mover-${def.kind}`)
      .setOrigin(0, 0)
      .setDepth(this.canoe ? DEPTH.water + 1 : DEPTH.terrain);
    this.image.setDisplaySize(this.w, this.image.height);

    this.zone = scene.add.zone(0, 0, this.w, 12);
    this.zones = [this.zone]; // collision zones (a Train has several)
    this.hidingSpots = [];
    scene.physics.add.existing(this.zone);
    const body = this.zone.body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.moves = false;
    body.checkCollision.down = false; // only the deck is solid
    body.checkCollision.left = false;
    body.checkCollision.right = false;

    this.reset();
  }

  reset() {
    const { from, to, mode, phase = 0 } = this.def;
    this.x = from + (to - from) * phase;
    this.state = mode === 'ferry' ? 'docked' : 'moving';
    this.boardedAt = null;
    this.vx = 0;
    this.dx = 0;
    this.alpha = 1;
    this.zone.body.enable = true;
    this.sync(0);
  }

  // The player is standing on the deck (based on the last physics step).
  isRiding(player) {
    const b = player.body;
    const deck = this.zone.body;
    return (
      deck.enable &&
      b.velocity.y >= 0 &&
      Math.abs(b.bottom - deck.top) <= 4 &&
      b.right > deck.left + 2 &&
      b.left < deck.right - 2
    );
  }

  update(time, dt, ridden) {
    const { from, to, mode } = this.def;
    const prev = this.x;

    switch (this.state) {
      case 'docked':
        if (!ridden) this.boardedAt = null;
        else if (this.boardedAt === null) this.boardedAt = time;
        else if (time - this.boardedAt >= MOVERS.boardDelayMs) this.state = 'moving';
        break;
      case 'moving':
        this.x = Math.min(to, this.x + this.speed * dt);
        if (this.x >= to) {
          this.state = mode === 'ferry' ? 'arrived' : 'endPause';
          this.until = time + MOVERS.fadeMs * 2;
        }
        break;
      case 'endPause':
        if (time >= this.until) {
          this.state = 'fadeOut';
          this.until = time + MOVERS.fadeMs;
          this.zone.body.enable = false; // rider drops into the water
        }
        break;
      case 'fadeOut':
        this.alpha = Math.max(0, (this.until - time) / MOVERS.fadeMs);
        if (time >= this.until) {
          this.x = from;
          this.state = 'fadeIn';
          this.until = time + MOVERS.fadeMs;
        }
        break;
      case 'fadeIn':
        this.alpha = 1 - Math.max(0, (this.until - time) / MOVERS.fadeMs);
        if (time >= this.until) {
          this.alpha = 1;
          this.zone.body.enable = true;
          this.state = 'moving';
        }
        break;
      default: // 'arrived'
        break;
    }

    this.dx = this.state === 'fadeIn' ? 0 : this.x - prev;
    this.vx = this.state === 'moving' ? this.speed : 0;
    this.sync(time);
  }

  sync(time) {
    const bob = Math.sin(time / 400 + this.def.from) * MOVERS.bobPixels;
    this.image.setPosition(this.x, this.deckY - this.rim + bob).setAlpha(this.alpha);
    this.zone.setPosition(this.x + this.w / 2, this.deckY + 6);
  }
}
