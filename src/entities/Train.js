import { DEPTH, MOVERS } from '../config/game.js';
import HidingSpot from './HidingSpot.js';

// Vintage steam train: carriages (left) pulled by a locomotive (right), moving right.
// Works like a Mover ('ferry' mode: waits at the station until the player climbs
// on, runs to `to`, stops), but with several solid parts the player can stand on:
// carriage roofs, the low coupling plates between carriages, the loco cab and boiler.
// The gaps between carriages are hiding spots that travel with the train.
//
// def: { kind: 'train', from, to, y (rail top), speed, carriages }
const CARRIAGE = { w: 150, gap: 30, roof: 90 };
// Cab roof matches the carriage roofs so ducking clears the same low bridges.
const LOCO = { w: 150, cabW: 48, cabRoof: 90, boiler: 68, imageTop: 100 };
const COUPLER = 40; // coupling plate height above the rail

export default class Train {
  constructor(scene, def, speedScale = 1, seasonKey = '') {
    this.def = def;
    this.rail = def.y;
    this.speed = def.speed * speedScale;
    const count = def.carriages ?? 4;
    const pitch = CARRIAGE.w + CARRIAGE.gap;
    this.length = count * pitch + LOCO.w;

    // Parts relative to the train's left edge: [dx, top above rail, width, height].
    this.parts = [];
    this.images = [];
    for (let i = 0; i < count; i++) {
      this.parts.push({ dx: i * pitch, top: CARRIAGE.roof, w: CARRIAGE.w, h: CARRIAGE.roof - 12 });
      this.parts.push({ dx: i * pitch + CARRIAGE.w, top: COUPLER, w: CARRIAGE.gap, h: 8 });
      this.images.push({ dx: i * pitch, top: CARRIAGE.roof, img: scene.add.image(0, 0, 'train-carriage') });
    }
    const locoX = count * pitch;
    this.parts.push({ dx: locoX, top: LOCO.cabRoof, w: LOCO.cabW, h: LOCO.cabRoof - 20 });
    this.parts.push({ dx: locoX + LOCO.cabW, top: LOCO.boiler, w: LOCO.w - LOCO.cabW, h: LOCO.boiler - 20 });
    this.images.push({ dx: locoX, top: LOCO.imageTop, img: scene.add.image(0, 0, 'train-loco') });
    this.images.forEach(({ img }) => img.setOrigin(0, 0).setScale(0.5).setDepth(DEPTH.terrain + 1)); // painted at 2×

    this.zones = this.parts.map((part) => {
      const zone = scene.add.zone(0, 0, part.w, part.h);
      scene.physics.add.existing(zone);
      zone.body.setAllowGravity(false);
      zone.body.setImmovable(true);
      zone.body.moves = false;
      zone.body.checkCollision.down = false;
      part.zone = zone;
      return zone;
    });

    // Hiding spots in the gaps between carriages (and between the last carriage and loco).
    this.gaps = [];
    for (let i = 0; i < count; i++) {
      const dx = i * pitch + CARRIAGE.w + CARRIAGE.gap / 2;
      const spot = new HidingSpot(
        scene,
        { x: 0, kind: 'gap', invisible: true, w: CARRIAGE.gap + 6, h: CARRIAGE.roof - COUPLER + 10, tuck: false },
        this.rail - COUPLER,
        seasonKey,
      );
      this.gaps.push({ dx, spot });
    }
    this.hidingSpots = this.gaps.map((g) => g.spot);

    // Steam from the chimney: slow puffs at rest, a stream on the move.
    this.steam = scene.add
      .particles(0, 0, 'puff', {
        speedY: { min: -60, max: -30 },
        speedX: { min: -40, max: -10 },
        scale: { start: 0.6, end: 2.2 },
        alpha: { start: 0.85, end: 0 },
        lifespan: 1600,
        frequency: 380,
      })
      .setDepth(DEPTH.terrain + 2);

    this.reset();
  }

  reset() {
    this.x = this.def.from;
    this.state = 'docked';
    this.boardedAt = null;
    this.vx = 0;
    this.dx = 0;
    this.sync(0);
  }

  isRiding(player) {
    const b = player.body;
    if (b.velocity.y < 0) return false;
    return this.zones.some((z) => {
      const d = z.body;
      return Math.abs(b.bottom - d.top) <= 4 && b.right > d.left + 2 && b.left < d.right - 2;
    });
  }

  update(time, dt, ridden) {
    const prev = this.x;
    if (this.state === 'docked') {
      if (!ridden) this.boardedAt = null;
      else if (this.boardedAt === null) this.boardedAt = time;
      else if (time - this.boardedAt >= MOVERS.boardDelayMs) this.state = 'moving';
    } else if (this.state === 'moving') {
      this.x = Math.min(this.def.to, this.x + this.speed * dt);
      if (this.x >= this.def.to) this.state = 'arrived';
    }
    this.dx = this.x - prev;
    this.vx = this.state === 'moving' ? this.speed : 0;
    this.steam.frequency = this.state === 'moving' ? 90 : 380;
    this.sync(time);
  }

  sync(time) {
    // A gentle rattle while moving.
    const rattle = this.state === 'moving' ? Math.sin(time / 45) * 0.8 : 0;
    for (const { dx, top, img } of this.images) img.setPosition(this.x + dx, this.rail - top + rattle);
    for (const part of this.parts) part.zone.setPosition(this.x + part.dx + part.w / 2, this.rail - part.top + part.h / 2);
    for (const { dx, spot } of this.gaps) spot.setPosition(this.x + dx, this.rail - COUPLER);
    const loco = this.images[this.images.length - 1].img;
    this.steam.setPosition(loco.x + 124, loco.y + 2);
  }
}
