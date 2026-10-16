import { DEPTH, POLICE, UI } from '../config/game.js';

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
//          fixed?, facing?, lengthScale? }
//   startAt     which end the officer starts at; they first walk toward the other end
//   activateX   if set, the officer stands still (facing waitFacing) until the
//               player passes this x, then starts the patrol
//   y           feet height for an officer on a bridge/jetty (default: layout ground)
//   tiltDeg     aim the cone further down, e.g. from a bridge onto the river
//   pauseMs     override the season pause; from === to makes a lookout who just turns
//   fixed       stands at `from` facing `facing` (-1 left, 1 right) and never turns
//   lengthScale longer (or shorter) cone for this officer, e.g. scanning a platform
//
// Vision is blocked by `blockers` (rectangles, e.g. a passing train) passed to update().
export default class Police {
  constructor(scene, route, settings, groundY, visibility = 1) {
    this.scene = scene;
    this.route = route;
    this.settings = settings;
    this.floorY = groundY; // the cone is clipped here
    this.groundY = route.y ?? groundY; // where this officer stands
    this.tilt = (route.tiltDeg ?? POLICE.coneTiltDeg) * DEG;
    this.pauseMs = route.pauseMs ?? settings.pauseMs;
    this.visibility = visibility;

    this.cone = scene.add.graphics().setDepth(DEPTH.cone);
    this.sprite = scene.add.sprite(0, groundY, 'police-idle').setOrigin(0.5, 1).setDepth(DEPTH.police);
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
    this.draw();
  }

  get length() {
    return this.settings.visionLength * this.visibility * (this.route.lengthScale ?? 1);
  }

  eye() {
    return { x: this.x + this.dir * 6, y: this.groundY - POLICE.eyeHeight };
  }

  canSee(player, time, blockers = []) {
    if ((player.hidden && !player.exposed) || !player.visible || time < player.graceUntil) return false;
    const eye = this.eye();
    const half = (this.settings.visionAngleDeg / 2) * DEG;
    const tilt = this.tilt;
    const b = player.body;
    const points = [
      { x: b.center.x, y: b.top + 4 },
      { x: b.center.x, y: b.center.y },
      { x: b.center.x, y: b.bottom - 4 },
    ];
    return points.some(({ x, y }) => {
      const dx = (x - eye.x) * this.dir;
      const dy = y - eye.y;
      if (dx <= 0) return false;
      if (Math.hypot(dx, dy) > this.length) return false;
      if (Math.abs(Math.atan2(dy, dx) - tilt) > half) return false;
      return !this.blocked(eye, x, y, blockers);
    });
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
  update(time, delta, player, active, blockers = []) {
    const dt = delta / 1000;
    this.blockers = blockers;

    if (active) {
      if (this.waiting && player.x >= this.route.activateX) {
        this.waiting = false;
        this.dir = this.walkDir;
      }
      this.seeing = this.canSee(player, time, blockers);
      const rate = dt / this.settings.detectionTime;
      this.detection = this.seeing
        ? Math.min(1, this.detection + rate)
        : Math.max(0, this.detection - rate * POLICE.drainRate);
    } else {
      this.seeing = false;
    }

    const halted = this.route.fixed || this.waiting || (POLICE.stopWhenSuspicious && this.seeing);
    if (!halted) this.patrol(time, dt);

    const walking = !halted && !this.paused;
    if (walking) this.sprite.anims.play('police-walk', true);
    else {
      this.sprite.anims.stop();
      this.sprite.setTexture('police-idle');
    }

    this.draw();
    return active && this.detection >= 1;
  }

  patrol(time, dt) {
    const { from, to } = this.route;
    if (this.paused) {
      if (time < this.pauseUntil) return;
      this.paused = false;
      this.walkDir *= -1;
      this.dir = this.walkDir;
    }
    this.x += this.walkDir * this.settings.patrolSpeed * dt;
    const end = this.walkDir > 0 ? to : from;
    if ((this.walkDir > 0 && this.x >= end) || (this.walkDir < 0 && this.x <= end)) {
      this.x = end;
      this.paused = true;
      this.pauseUntil = time + this.pauseMs;
    }
  }

  draw() {
    this.sprite.setPosition(this.x, this.groundY + 2).setFlipX(this.dir < 0);

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
    this.cone.lineStyle(2, edge, 0.7).strokePoints(points, true);

    // Detection meter: "?" while suspicious, "!" once alarmed.
    this.meter.clear();
    if (this.detection <= 0) {
      this.icon.setText('');
      return;
    }
    const alarmed = this.detection >= POLICE.alarmAt;
    const w = POLICE.meterWidth;
    const top = this.groundY - POLICE.meterOffsetY;
    this.meter.fillStyle(0x3b2a20, 0.85).fillRoundedRect(this.x - w / 2 - 2, top - 2, w + 4, 9, 3);
    this.meter.fillStyle(alarmed ? 0xff4a3a : 0xffd84a).fillRect(this.x - w / 2, top, w * this.detection, 5);
    this.icon
      .setText(alarmed ? '!' : '?')
      .setColor(alarmed ? '#ff4a3a' : '#ffd84a')
      .setPosition(this.x, top - 4)
      .setScale(alarmed ? 1.2 : 1);
  }
}
