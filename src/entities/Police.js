import { DEPTH, POLICE, UI } from '../config/game.js';
import Settings from '../systems/Settings.js';
import { buildPoliceLook, CHAR_FRAME } from '../art/Character.js';
import { Shadow } from '../art/Lighting.js';
import { addOutline } from '../art/TextureFactory.js';

const DEG = Math.PI / 180;

function lerpColor(a, b, t) {
  const ch = (c, shift) => (c >> shift) & 0xff;
  const mix = (shift) => Math.round(ch(a, shift) + (ch(b, shift) - ch(a, shift)) * t);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

// Plain-clothes officer. Walks between route.from and route.to, pauses, turns.
// Sees the player inside a cone in front of them; a meter fills while seen.
//
// route: { from, to, startAt: 'from' | 'to', activateX?, waitFacing?, y?, tiltDeg?, pauseMs?,
//          fixed?, facing?, lengthScale?, speedScale?, skis? }
//   startAt     which end the officer starts at; they first walk toward the other end
//   activateX   if set, the officer stands still (facing waitFacing) until the
//               player passes this x, then starts the patrol
//   y           feet height for an officer on a bridge/jetty (default: the ground at x,
//               which follows slopes and ledges)
//   tiltDeg     aim the cone further down (or up, if negative)
//   pauseMs     override the season pause; from === to makes a lookout who just turns
//   fixed       stands at `from` facing `facing` (-1 left, 1 right) and never turns
//   lengthScale longer (or shorter) cone for this officer
//   speedScale  faster (or slower) patrol, e.g. skiers
//   skis        drawn on skis
//
// update() also takes:
//   blockers  rectangles that block vision (e.g. a passing train)
//   clues     footprints [{ x, y, t }]: an officer who sees one follows the trail
//             toward fresher prints, searches where it ends, then returns to the route
// `visibility` can be changed at any time (e.g. a blizzard shortens the cone).
export default class Police {
  constructor(scene, route, settings, groundY, { visibility = 1, groundAt = null } = {}) {
    this.scene = scene;
    this.route = route;
    this.settings = settings;
    this.floorY = groundY; // the cone is clipped here
    this.groundAt = groundAt;
    this.tilt = (route.tiltDeg ?? POLICE.coneTiltDeg) * DEG;
    this.pauseMs = route.pauseMs ?? settings.pauseMs;
    this.speed = settings.patrolSpeed * (route.speedScale ?? 1);
    this.visibility = visibility;

    this.cone = scene.add.graphics().setDepth(DEPTH.cone);
    // Seasonal disguise (tourist, beachgoer, passenger, skier); the sunglasses and
    // earpiece tell is the same on every look.
    this.look = settings.disguise ?? 'plain';
    buildPoliceLook(scene, this.look, addOutline);
    this.idleTexture = `police-${this.look}-${route.skis ? 'ski' : 'idle'}`;
    // Painted at 2×; origin at the feet.
    this.sprite = scene.add.sprite(0, groundY, this.idleTexture).setOrigin(0.5, CHAR_FRAME.feet / CHAR_FRAME.height).setScale(0.5).setDepth(DEPTH.police);
    this.shadow = new Shadow(scene, 26);
    this.meter = scene.add.graphics().setDepth(DEPTH.popup);
    this.icon = scene.add
      .text(0, 0, '', {
        fontFamily: UI.font,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: UI.strokeColor,
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.popup);

    this.reset();
  }

  reset() {
    const { from, to, startAt = 'from', activateX, waitFacing } = this.route;
    this.x = startAt === 'to' ? to : from;
    this.walkDir = this.route.fixed ? (this.route.facing ?? -1) : startAt === 'to' ? -1 : 1;
    this.waiting = activateX != null;
    this.dir = this.waiting ? (waitFacing ?? this.walkDir) : this.walkDir;
    this.paused = false;
    this.pauseUntil = 0;
    this.detection = 0;
    this.seeing = false;
    this.mode = 'patrol'; // 'patrol' | 'look' | 'track' | 'search' | 'return'
    this.clue = null;
    this.hearCooldownUntil = 0;
    this.draw();
  }

  get groundY() {
    return this.route.y ?? this.groundAt?.(this.x) ?? this.floorY;
  }

  get length() {
    return this.settings.visionLength * this.visibility * (this.route.lengthScale ?? 1);
  }

  eye() {
    return { x: this.x + this.dir * 6, y: this.groundY - POLICE.eyeHeight };
  }

  // Is (x, y) inside the cone and not hidden behind a blocker?
  seesPoint(x, y, blockers = []) {
    const eye = this.eye();
    const dx = (x - eye.x) * this.dir;
    const dy = y - eye.y;
    if (dx <= 0) return false;
    if (Math.hypot(dx, dy) > this.length) return false;
    if (Math.abs(Math.atan2(dy, dx) - this.tilt) > (this.settings.visionAngleDeg / 2) * DEG) return false;
    return !this.blocked(eye, x, y, blockers);
  }

  canSee(player, time, blockers = []) {
    if ((player.hidden && !player.exposed) || !player.visible || time < player.graceUntil) return false;
    if (player.inCrowd) return false; // blending into a group of guests
    const b = player.body;
    return [b.top + 4, b.center.y, b.bottom - 4].some((y) => this.seesPoint(b.center.x, y, blockers));
  }

  // Does any blocker cut the line from the eye to (x, y)?
  blocked(eye, x, y, blockers) {
    if (!blockers.length) return false;
    const line = new Phaser.Geom.Line(eye.x, eye.y, x, y);
    return blockers.some((rect) => Phaser.Geom.Intersects.LineToRectangle(line, rect));
  }

  // Nearest point where the ray eye→(x, y) hits a blocker (for drawing the cone's shadow).
  clipRay(eye, x, y, blockers) {
    let best = { x, y };
    let bestD = Math.hypot(x - eye.x, y - eye.y);
    const line = new Phaser.Geom.Line(eye.x, eye.y, x, y);
    for (const rect of blockers) {
      for (const pt of Phaser.Geom.Intersects.GetLineToRectangle(line, rect)) {
        const d = Math.hypot(pt.x - eye.x, pt.y - eye.y);
        if (d < bestD) {
          bestD = d;
          best = { x: pt.x, y: pt.y };
        }
      }
    }
    return best;
  }

  // Returns true when the meter is full (player caught).
  update(time, delta, player, active, blockers = [], clues = []) {
    const dt = delta / 1000;
    this.blockers = blockers;
    this.clues = clues;

    if (active) {
      if (this.waiting && player.x >= this.route.activateX) {
        this.waiting = false;
        this.dir = this.walkDir;
      }
      this.seeing = this.canSee(player, time, blockers);
      // player.detectionScale < 1 = harder to notice (e.g. blending into autumn foliage).
      const rate = (dt / this.settings.detectionTime) * (player.detectionScale ?? 1);
      const before = this.detection;
      this.detection = this.seeing
        ? Math.min(1, this.detection + rate)
        : Math.max(0, this.detection - rate * POLICE.drainRate);
      // Sound cues: first "?" and the "!" alarm.
      if (before === 0 && this.detection > 0) this.scene.events.emit('police-suspect', this);
      if (before < POLICE.alarmAt && this.detection >= POLICE.alarmAt) this.scene.events.emit('police-alarm', this);
      if (!this.route.fixed && clues.length) this.followClues(time, clues, blockers);
    } else {
      this.seeing = false;
    }

    const halted = this.route.fixed || this.waiting || (POLICE.stopWhenSuspicious && this.seeing);
    let moving = false;
    if (!halted) moving = this.move(time, dt);

    if (moving && !this.route.skis) this.sprite.anims.play(`police-walk-${this.look}`, true);
    else {
      this.sprite.anims.stop();
      this.sprite.setTexture(this.idleTexture);
    }

    this.draw();
    return active && this.detection >= 1;
  }

  // ----- hearing -----

  // A footstep inside the season's noise ring (NoiseSystem). A patrolling officer
  // turns toward the sound and looks for a moment. Fixed lookouts and officers
  // waiting for a teaching moment don't react. Returns true if they turned.
  hear(x, time) {
    if (this.route.fixed || this.waiting || this.mode !== 'patrol' || time < this.hearCooldownUntil) return false;
    this.mode = 'look';
    this.dir = Math.sign(x - this.x) || this.dir;
    this.lookUntil = time + POLICE.hearLookMs;
    this.hearCooldownUntil = time + POLICE.hearLookMs + POLICE.hearCooldownMs;
    this.scene.events.emit('police-hear', this);
    return true;
  }

  // Spring shower: an open umbrella over the officer (the cone is shorter too, via
  // `visibility`).
  setUmbrella(on) {
    if (on && !this.umbrella) this.umbrella = this.scene.add.image(0, 0, 'police-umbrella').setScale(0.5).setDepth(DEPTH.police + 1);
    this.umbrella?.setVisible(on);
  }

  // ----- footprints -----

  followClues(time, clues, blockers) {
    if (this.mode === 'patrol' || this.mode === 'return') {
      // Spot the freshest footprint in view and start following the trail.
      let best = null;
      for (const c of clues) {
        if ((!best || c.t > best.t) && this.seesPoint(c.x, c.y - 3, blockers)) best = c;
      }
      if (best) {
        this.mode = 'track';
        this.clue = best;
      }
    }
  }

  // Next footprint along the trail: the oldest one fresher than the current, nearby.
  nextClue(clues) {
    let next = null;
    for (const c of clues) {
      if (c.t > this.clue.t && Math.abs(c.x - this.x) < POLICE.trailStepRange && (!next || c.t < next.t)) next = c;
    }
    return next;
  }

  // Returns true while walking.
  move(time, dt) {
    if (this.mode === 'look') {
      if (time < this.lookUntil) return false;
      this.mode = 'patrol';
      this.dir = this.walkDir;
      return false;
    }
    if (this.mode === 'track') {
      const dx = this.clue.x - this.x;
      if (Math.abs(dx) < 4) {
        const next = this.nextClue(this.clues);
        if (next) this.clue = next;
        else {
          this.mode = 'search';
          this.searchUntil = time + POLICE.searchMs;
        }
        return false;
      }
      this.dir = Math.sign(dx);
      this.x += this.dir * Math.min(Math.abs(dx), this.speed * POLICE.trackSpeedScale * dt);
      return true;
    }
    if (this.mode === 'search') {
      // Look both ways where the trail ran out.
      this.dir = Math.floor(time / 600) % 2 === 0 ? 1 : -1;
      if (time >= this.searchUntil) this.mode = 'return';
      return false;
    }
    if (this.mode === 'return') {
      const { from, to } = this.route;
      const target = Math.min(to, Math.max(from, this.x));
      const dx = target - this.x;
      if (Math.abs(dx) < 4) {
        this.mode = 'patrol';
        this.dir = this.walkDir;
        return false;
      }
      this.dir = Math.sign(dx);
      this.x += this.dir * Math.min(Math.abs(dx), this.speed * dt);
      return true;
    }
    return this.patrol(time, dt);
  }

  patrol(time, dt) {
    const { from, to } = this.route;
    if (this.paused) {
      if (time < this.pauseUntil) return false;
      this.paused = false;
      this.walkDir *= -1;
      this.dir = this.walkDir;
    }
    this.x += this.walkDir * this.speed * dt;
    const end = this.walkDir > 0 ? to : from;
    if ((this.walkDir > 0 && this.x >= end) || (this.walkDir < 0 && this.x <= end)) {
      this.x = end;
      this.paused = true;
      this.pauseUntil = time + this.pauseMs;
    }
    return !this.paused;
  }

  draw() {
    this.sprite.setPosition(this.x, this.groundY + 1).setFlipX(this.dir < 0);
    this.umbrella?.setPosition(this.x - this.dir * 2, this.groundY - POLICE.umbrellaOffsetY);
    this.shadow.follow(this.x, this.groundY + 1, true, this.sprite.visible ? this.sprite.alpha : 0);

    // Vision cone: a fan clipped to the ground, warming to red as the meter fills.
    const eye = this.eye();
    const half = (this.settings.visionAngleDeg / 2) * DEG;
    const tilt = this.tilt;
    const steps = Math.max(2, Math.ceil((half * 2) / (POLICE.coneStepDeg * DEG)));
    const points = [eye];
    for (let i = 0; i <= steps; i++) {
      const a = tilt - half + (i / steps) * half * 2;
      const end = {
        x: eye.x + this.dir * Math.cos(a) * this.length,
        y: Math.min(Math.max(this.floorY, this.groundY), eye.y + Math.sin(a) * this.length),
      };
      points.push(this.blockers?.length ? this.clipRay(eye, end.x, end.y, this.blockers) : end);
    }
    const color = lerpColor(this.settings.coneColor ?? POLICE.coneColor, POLICE.alertColor, this.detection);
    this.cone.clear();
    this.cone.fillStyle(color, POLICE.coneAlpha + this.detection * 0.15).fillPoints(points, true);
    const edge = lerpColor(this.settings.coneEdgeColor ?? POLICE.coneEdgeColor, POLICE.alertColor, this.detection);
    if (Settings.current.colorBlind) {
      // Pattern as well as colour: a fan of ray lines and a thick dark edge; when
      // the officer is alarmed the rays double up.
      const every = this.detection >= POLICE.alarmAt ? 1 : 2;
      this.cone.lineStyle(2, 0x3b2a20, 0.45);
      for (let i = 1; i < points.length; i += every) this.cone.lineBetween(eye.x, eye.y, points[i].x, points[i].y);
      this.cone.lineStyle(4, 0x3b2a20, 0.9).strokePoints(points, true);
    } else {
      this.cone.lineStyle(2, edge, 0.7).strokePoints(points, true);
    }

    // Detection meter: "?" while suspicious, "!" once alarmed. A lone "?" while
    // following footprints.
    this.meter.clear();
    const top = this.groundY - POLICE.meterOffsetY;
    if (this.detection <= 0) {
      const tracking = this.mode === 'track' || this.mode === 'search' || this.mode === 'look';
      this.icon.setText(tracking ? '?' : '').setColor('#ffd84a').setPosition(this.x, top + 4).setScale(0.9);
      return;
    }
    const alarmed = this.detection >= POLICE.alarmAt;
    const w = POLICE.meterWidth;
    this.meter.fillStyle(0x3b2a20, 0.85).fillRoundedRect(this.x - w / 2 - 2, top - 2, w + 4, 9, 3);
    this.meter.fillStyle(alarmed ? 0xff4a3a : 0xffd84a).fillRect(this.x - w / 2, top, w * this.detection, 5);
    this.icon
      .setText(alarmed ? '!' : '?')
      .setColor(alarmed ? '#ff4a3a' : '#ffd84a')
      .setPosition(this.x, top - 4)
      .setScale(alarmed ? 1.2 : 1);
  }
}
