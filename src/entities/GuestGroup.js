import { DEPTH } from '../config/game.js';
import { CHAR_FRAME, buildGuestLook } from '../art/Character.js';
import { Shadow } from '../art/Lighting.js';

// A small group of harmless guests (picnickers, swimmers, train passengers,
// skiers). Walking (or swimming, or skiing) right next to them blends the player
// into the crowd: police can't pick them out (Police.canSee) and their steps make
// no noise. A moving hiding spot that needs no key press.
//
// layout.guests: [{ from, to, count, mode, speed, y?, pauseMs?, looks? }]
//   mode   'walk'  stroll between from and to, pausing at each end
//          'swim'  heads above the water, drifting between from and to
//          'ski'   ski from → to, then fade out and start again at from
//   looks  indexes into season.guests.looks (default: cycle through them)
//   y      feet height (default: the ground at x; the water surface for swimmers)
// season.guests: { looks: [{ id, skin, hair, layers }], spacing, margin, swimDepth }
export default class GuestGroup {
  constructor(scene, def, config, { groundAt, swimSurfaceY = null } = {}) {
    this.scene = scene;
    this.def = def;
    this.config = config;
    this.groundAt = groundAt;
    this.mode = def.mode ?? 'walk';
    this.swimSurfaceY = swimSurfaceY;
    this.spacing = config.spacing ?? 18;
    this.margin = config.margin ?? 16;
    const looks = config.looks;
    this.members = [];
    for (let i = 0; i < (def.count ?? 3); i++) {
      const look = looks[(def.looks?.[i] ?? i) % looks.length];
      buildGuestLook(scene, look.id, look);
      const tex = `guest-${look.id}-${this.mode === 'ski' ? 'ski' : 'idle'}`;
      const sprite = scene.add.sprite(0, 0, tex)
        .setOrigin(0.5, CHAR_FRAME.feet / CHAR_FRAME.height)
        .setScale(0.5)
        .setDepth(this.mode === 'swim' ? DEPTH.water - 1 : DEPTH.police - 1);
      const shadow = this.mode === 'walk' ? new Shadow(scene, 24) : null;
      this.members.push({ sprite, shadow, look, offset: i * this.spacing, phase: Math.random() * Math.PI * 2 });
    }
    this.reset();
  }

  reset() {
    this.x = this.def.startAt === 'to' ? this.def.to : this.def.from;
    this.dir = this.def.startAt === 'to' ? -1 : 1;
    this.pauseUntil = 0;
    this.alpha = 1;
    this.sync(0, false);
  }

  get width() {
    return (this.members.length - 1) * this.spacing;
  }

  feetY(x) {
    if (this.def.y != null) return this.def.y;
    if (this.mode === 'swim') return this.swimSurfaceY + (this.config.swimDepth ?? 30);
    return this.groundAt(x);
  }

  // Is the player blending into this group right now?
  contains(player) {
    if (this.alpha < 0.6) return false;
    const left = this.x - this.margin;
    const right = this.x + this.width + this.margin;
    if (player.x < left || player.x > right) return false;
    if (this.mode === 'swim') return player.swimming;
    if (this.mode === 'ski') return player.skiing && player.onGround;
    const feet = player.body.bottom;
    return player.onGround && Math.abs(feet - this.feetY(player.x)) < 24;
  }

  update(time, dt) {
    const { from, to, speed = 50, pauseMs = 1500 } = this.def;
    let moving = false;
    if (this.mode === 'ski') {
      this.x += speed * dt;
      if (this.x >= to) {
        this.alpha = Math.max(0, this.alpha - dt * 2);
        if (this.alpha === 0) {
          this.x = from;
          this.alpha = 1;
        }
      }
      moving = true;
    } else if (time >= this.pauseUntil) {
      this.x += this.dir * speed * dt;
      moving = true;
      const end = this.dir > 0 ? to : from;
      if ((this.dir > 0 && this.x >= end) || (this.dir < 0 && this.x <= end)) {
        this.x = end;
        this.dir *= -1;
        this.pauseUntil = time + pauseMs;
      }
    }
    this.sync(time, moving);
  }

  sync(time, moving) {
    for (const m of this.members) {
      const x = this.x + m.offset;
      let y = this.feetY(x);
      if (this.mode === 'swim') y += Math.sin(time / 400 + m.phase) * 2;
      m.sprite.setPosition(x, y).setFlipX(this.dir < 0).setAlpha(this.alpha);
      if (this.mode === 'walk') {
        if (moving) m.sprite.anims.play(`guest-walk-${m.look.id}`, true);
        else {
          m.sprite.anims.stop();
          m.sprite.setTexture(`guest-${m.look.id}-idle`);
        }
      }
      m.shadow?.follow(x, y, true, this.alpha > 0.1);
    }
  }
}
