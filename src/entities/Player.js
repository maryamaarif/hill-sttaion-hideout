import { PLAYER, DEPTH, RESPAWN } from '../config/game.js';
import { CHAR_FRAME, buildOutfit } from '../art/Character.js';
import { addOutline } from '../art/TextureFactory.js';

import Settings from '../systems/Settings.js';

const RUN_CYCLE = ['run1', 'run2', 'run3', 'run4', 'run5', 'run6'];
const IDLE_CYCLE = ['idle', 'idle2']; // slow breathing
// Character art is painted at 2× and shown at half size.
const BASE_SCALE = 0.5;

const moveTowards = (value, target, maxDelta) =>
  Math.abs(target - value) <= maxDelta ? target : value + Math.sign(target - value) * maxDelta;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Shared player for every season. Season config changes how it feels:
//   physics  runSpeed, jumpVelocity, friction
//   swim     speeds and breath for water marked swim: true
//   ski      auto-run speeds on skis, and glide strength after a ski-jump launch
// The controls never change: move, jump, Down to hide (or dive in water).
// On skis Right speeds up and Left slows down instead of walking.
//
// The scene sets these each frame before update():
//   nearSpot  hiding spot the player stands in (or null)
//   water     { surfaceY } when over swimmable water (or null)
//   carrier   moving platform the player is riding (or null)
//   skiing    on skis (inside a ski zone, or airborne after leaving one)
// SlopeSystem sets slopeGrounded when the player stands on a slope.
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, season) {
    super(scene, x, y, 'pl-home-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(BASE_SCALE);
    this.setOrigin(0.5, 0.5);

    this.seasonPhysics = season.physics;
    this.swimConfig = season.swim ?? null;
    this.skiConfig = season.ski ?? null;
    this.worldGravity = season.physics.gravity;
    this.setDepth(DEPTH.player);
    this.setCollideWorldBounds(true);
    this.body.maxVelocity.set(10000, PLAYER.maxFallSpeed);
    this.setStandingBody(true);

    this.bindKeys();

    this.lastGroundedAt = -Infinity;
    this.jumpPressedAt = -Infinity;
    this.jumping = false;
    this.jumpCut = false;
    this.crouching = false;
    this.hidden = false;
    this.hidingSpot = null;
    this.nearSpot = null;
    this.water = null;
    this.carrier = null;
    this.inheritVx = 0;
    this.skiing = false;
    this.slopeGrounded = false;
    this.launched = false;
    this.swimming = false;
    this.diving = false;
    this.breath = 1;
    this.breathLocked = false;
    this.graceUntil = 0;
    this.frozen = false;
    this.lockedUntil = 0;
  }

  // Keys come from the (remappable) controls in Settings: { action: [Key, ...] }.
  bindKeys() {
    const kb = this.scene.input.keyboard;
    this.keys = {};
    for (const [action, names] of Object.entries(Settings.current.controls)) {
      this.keys[action] = names.map((n) => kb.addKey(n));
    }
  }

  isDown(action) {
    return this.keys[action]?.some((k) => k.isDown);
  }

  justDown(action) {
    // Check every key (JustDown clears its flag), then combine.
    return (this.keys[action] ?? []).map((k) => Phaser.Input.Keyboard.JustDown(k)).some(Boolean);
  }

  setStandingBody(standing) {
    const { width, height, crouchHeight } = PLAYER.body;
    const h = standing ? height : crouchHeight;
    // Body sizes are in texture pixels (scaled by the sprite), so ×2 for 2× art.
    const k = 1 / BASE_SCALE;
    this.body.setSize(width * k, h * k);
    this.body.setOffset(((CHAR_FRAME.width - width) / 2) * k, (CHAR_FRAME.feet - h) * k);
  }

  get onGround() {
    return this.body.blocked.down || this.body.touching.down || this.slopeGrounded;
  }

  get submerged() {
    return this.swimming && this.diving && this.water && this.body.top > this.water.surfaceY + 2;
  }

  get moving() {
    return Math.abs(this.body.velocity.x) > PLAYER.movingThreshold || !this.onGround || this.swimming;
  }

  update(time, delta) {
    if (this.frozen) {
      this.setVelocityX(0);
      return;
    }

    const dt = delta / 1000;
    const locked = time < this.lockedUntil;
    const left = !locked && this.isDown('left');
    const right = !locked && this.isDown('right');
    const down = !locked && this.isDown('hide');
    const jumpHeld = this.isDown('jump');
    const jumpPressed = this.justDown('jump') && !locked;
    const grounded = this.onGround;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);

    this.updateBreath(dt);
    if (this.updateSwimState()) {
      this.swim(dt, dir, down, jumpPressed);
      return;
    }

    // Hiding: press Down in a hiding spot. Moving or jumping leaves it.
    if (this.hidden) {
      if (dir === 0 && !jumpPressed) {
        this.setVelocityX(0);
        return;
      }
      this.leaveHiding();
    } else if (down && dir === 0 && grounded && this.nearSpot) {
      this.enterHiding(this.nearSpot);
      return;
    }

    if (grounded && this.body.velocity.y >= 0) {
      this.lastGroundedAt = time;
      this.jumping = false;
    }
    if (jumpPressed) this.jumpPressedAt = time;

    // Crouch only on the ground.
    const wantCrouch = grounded && down;
    if (wantCrouch !== this.crouching) {
      this.crouching = wantCrouch;
      this.setStandingBody(!wantCrouch);
    }

    // Jump with coyote time and jump buffering.
    const buffered = time - this.jumpPressedAt <= PLAYER.jumpBufferMs;
    const coyote = time - this.lastGroundedAt <= PLAYER.coyoteMs;
    if (buffered && coyote && !this.jumping) {
      if (this.crouching) {
        this.crouching = false;
        this.setStandingBody(true);
      }
      this.jumping = true;
      this.jumpCut = false;
      this.jumpPressedAt = -Infinity;
      // Jumping on a ski-jump ramp is a launch: height comes from speed, not the jump.
      if (this.rampLaunch && this.body.velocity.x > 0) this.launch(-this.body.velocity.x * this.rampLaunch);
      else {
        this.setVelocityY(-this.seasonPhysics.jumpVelocity);
        this.scene.events.emit('player-jump', this);
      }
    }
    // Variable jump height: let go early for a short hop.
    if (this.jumping && !jumpHeld && !this.jumpCut && this.body.velocity.y < 0) {
      this.setVelocityY(this.body.velocity.y * PLAYER.jumpCutMultiplier);
      this.jumpCut = true;
    }

    if (this.skiing && this.skiConfig) {
      this.ski(dt, dir, grounded, jumpHeld);
      return;
    }

    this.updateUmbrella(grounded);

    // Horizontal: accelerate toward target speed. Season friction scales grip.
    const maxSpeed = this.seasonPhysics.runSpeed * (this.crouching ? PLAYER.crouchSpeedMultiplier : 1);
    const grip = grounded ? (this.seasonPhysics.friction ?? 1) : PLAYER.airControl;
    const rate = (dir !== 0 ? PLAYER.acceleration : PLAYER.deceleration) * grip;
    this.setVelocityX(moveTowards(this.body.velocity.x, dir * maxSpeed, rate * dt));
    if (dir !== 0) this.setFlipX(dir < 0);

    // Momentum from moving platforms: keep drifting with a canoe after jumping off it.
    if (grounded) this.inheritVx = this.carrier ? this.carrier.vx : 0;
    else if (this.inheritVx) this.x += this.inheritVx * dt;

    this.updatePose(grounded);
  }

  updatePose(grounded) {
    let pose;
    if (this.crouching) pose = 'crouch';
    else if (this.umbrellaOpen) pose = 'glide';
    else if (!grounded) pose = this.body.velocity.y > PLAYER.fallPoseSpeed ? 'fall' : 'jump';
    else if (Math.abs(this.body.velocity.x) > PLAYER.walkAnimThreshold) pose = 'walk';
    else pose = 'idle';
    this.showPose(pose);
  }

  // ----- outfit -----

  // Wear an outfit (see systems/Wardrobe.js): every pose texture comes from it.
  setOutfit(outfit) {
    buildOutfit(this.scene, outfit, addOutline);
    this.outfit = outfit;
    this.texPrefix = `pl-${outfit.id}`;
    this.setTexture(`${this.texPrefix}-${this.currentPose ?? 'idle'}`);
  }

  // Umbrella (Spring outfit): hold the glide key while falling to float down.
  updateUmbrella(grounded) {
    const open = this.outfit?.ability === 'umbrella' && !grounded && !this.swimming && this.isDown('glide') && this.body.velocity.y > 0;
    if (open && !this.umbrellaOpen) this.scene.events.emit('player-umbrella', this);
    this.umbrellaOpen = open;
    if (open) this.setVelocityY(Math.min(this.body.velocity.y, PLAYER.umbrellaFallSpeed));
  }

  // ----- skiing -----

  // Auto-run right: Right speeds up, Left slows down, nothing = cruise. After a
  // ski-jump launch, holding Jump glides (lighter gravity) to clear a big gap.
  ski(dt, dir, grounded, jumpHeld) {
    const cfg = this.skiConfig;
    if (grounded && this.body.velocity.y >= 0) this.launched = false;
    const target = dir > 0 ? cfg.maxSpeed : dir < 0 ? cfg.minSpeed : cfg.cruiseSpeed;
    const rate = grounded ? cfg.acceleration : cfg.airAcceleration;
    this.setVelocityX(moveTowards(this.body.velocity.x, target, rate * dt));
    this.setFlipX(false);

    this.gliding = this.launched && !grounded && jumpHeld;
    this.body.setGravityY(this.gliding ? -this.worldGravity * (1 - cfg.glideGravity) : 0);

    this.showPose(grounded ? (this.crouching ? 'crouch' : 'ski') : 'skiAir');
  }

  // Thrown into the air off a ski-jump ramp.
  launch(vy) {
    this.setVelocityY(vy);
    this.launched = true;
    this.jumping = true;
    this.jumpCut = true; // a launch is not shortened by letting go of Jump
    this.scene.events.emit('player-launch', this);
  }

  // Poses are textures of the current outfit; the run cycle steps through frames.
  showPose(pose) {
    const now = this.scene.time.now;
    let frame = pose;
    if (pose === 'walk') frame = RUN_CYCLE[Math.floor(now / PLAYER.walkFrameMs) % RUN_CYCLE.length];
    else if (pose === 'idle') frame = IDLE_CYCLE[Math.floor(now / 700) % IDLE_CYCLE.length];
    this.currentPose = frame;
    this.setTexture(`${this.texPrefix ?? 'pl-home'}-${frame}`);
  }

  // Hands up: shown while being caught.
  showCaught() {
    this.showPose('caught');
  }

  // ----- swimming -----

  // Returns true while the player is swimming this frame.
  updateSwimState() {
    const w = this.water;
    if (this.swimming) {
      if (!w || this.body.bottom < w.surfaceY - 4) {
        this.exitSwim();
        return false;
      }
      return true;
    }
    if (w && this.body.velocity.y >= 0 && this.body.bottom > w.surfaceY + 6) {
      this.enterSwim();
      return true;
    }
    return false;
  }

  enterSwim() {
    this.leaveHiding();
    this.swimming = true;
    this.body.setAllowGravity(false);
    this.crouching = false;
    this.setStandingBody(true);
    this.inheritVx = 0;
    this.jumping = false;
    this.scene.events.emit('player-enter-water', this);
  }

  exitSwim() {
    this.swimming = false;
    this.diving = false;
    this.hidden = false;
    this.body.setAllowGravity(true);
    this.setAlpha(1).clearTint();
  }

  swim(dt, dir, down, jumpPressed) {
    const cfg = this.swimConfig;
    const surface = this.water.surfaceY;
    const wasDiving = this.diving;
    this.diving = Boolean(cfg) && down && !this.breathLocked && this.breath > 0;
    if (this.diving && !wasDiving) this.scene.events.emit('player-dive', this);

    // Settle toward floating (head above water) or diving depth.
    const floatBottom = surface + PLAYER.swim.floatDepth;
    const target = this.diving ? surface + cfg.diveDepth : floatBottom;
    const s = PLAYER.swim;
    this.setVelocityY(clamp((target - this.body.bottom) * s.verticalResponse, -s.maxVerticalSpeed, s.maxVerticalSpeed));

    const speed = this.seasonPhysics.runSpeed * (cfg ? (this.diving ? cfg.diveSpeedMultiplier : cfg.speedMultiplier) : 0.5);
    this.setVelocityX(moveTowards(this.body.velocity.x, dir * speed, PLAYER.acceleration * s.accelerationMultiplier * dt));
    if (dir !== 0) this.setFlipX(dir < 0);

    // Fully under water = hidden from police.
    this.hidden = this.submerged;
    if (this.diving) this.setAlpha(0.75).setTint(0x7fb6e6);
    else this.setAlpha(1).clearTint();

    this.showPose(dir !== 0 ? 'walk' : 'idle');

    // Jump out of the water (onto a bank or jetty) from the surface.
    if (jumpPressed && !this.diving && this.body.bottom <= floatBottom + 8) {
      this.exitSwim();
      this.setVelocityY(-this.seasonPhysics.jumpVelocity * s.jumpOutMultiplier);
      this.jumping = true;
      this.jumpCut = true;
    }
  }

  updateBreath(dt) {
    const cfg = this.swimConfig;
    if (!cfg) return;
    if (this.submerged) {
      this.breath = Math.max(0, this.breath - dt / cfg.breathSeconds);
      if (this.breath === 0 && !this.breathLocked) {
        this.breathLocked = true; // forced back up until breath recovers
        this.scene.events.emit('player-out-of-breath', this);
      }
    } else {
      this.breath = Math.min(1, this.breath + dt * cfg.refillPerSec);
      if (this.breathLocked && this.breath >= cfg.relockAt) this.breathLocked = false;
    }
  }

  // ----- hiding -----

  // Dim and tuck into the spot (static narrow spots pull the player to their centre).
  enterHiding(spot) {
    this.hidden = true;
    this.hidingSpot = spot;
    this.crouching = true;
    this.setStandingBody(false);
    this.setVelocityX(0);
    this.showPose('crouch');
    this.setAlpha(0.6).setTint(0x8a96a8);
    this.scene.events.emit('player-hide', this);
    if (spot.tuck) this.scene.tweens.add({ targets: this, x: spot.x, duration: 140, ease: 'Sine.out' });
    this.scene.tweens.add({ targets: this, scaleY: BASE_SCALE * 0.85, duration: 140, yoyo: true });
  }

  leaveHiding() {
    if (!this.hidden || this.swimming) return;
    this.hidden = false;
    this.hidingSpot = null;
    this.setAlpha(1).clearTint().setScale(BASE_SCALE);
  }

  // ----- lifecycle -----

  freeze() {
    this.frozen = true;
    this.setVelocity(0, 0);
    this.anims.stop();
  }

  respawn(x, y, time, lockMs) {
    if (this.swimming) this.exitSwim();
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.crouching = false;
    this.setStandingBody(true);
    this.leaveHiding();
    this.breath = 1;
    this.breathLocked = false;
    this.inheritVx = 0;
    this.carrier = null;
    this.launched = false;
    this.gliding = false;
    this.slopeGrounded = false;
    this.body.setGravityY(0);
    this.graceUntil = time + RESPAWN.graceMs;
    this.setFlipX(false);
    this.setVisible(true);
    this.frozen = false;
    this.jumping = false;
    this.jumpPressedAt = -Infinity;
    this.lockedUntil = time + lockMs;
  }
}
