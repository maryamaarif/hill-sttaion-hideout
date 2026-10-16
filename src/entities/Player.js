import { PLAYER, DEPTH } from '../config/game.js';
import { PLAYER_FRAME } from '../art/TextureFactory.js';

const moveTowards = (value, target, maxDelta) =>
  Math.abs(target - value) <= maxDelta ? target : value + Math.sign(target - value) * maxDelta;

// Shared player for every season. Season physics (runSpeed, jumpVelocity, friction)
// change how it feels; the controls never change.
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, seasonPhysics) {
    super(scene, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.seasonPhysics = seasonPhysics;
    this.setDepth(DEPTH.player);
    this.setCollideWorldBounds(true);
    this.body.maxVelocity.set(10000, PLAYER.maxFallSpeed);
    this.setStandingBody(true);

    this.keys = scene.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S', space: 'SPACE',
    });

    this.lastGroundedAt = -Infinity;
    this.jumpPressedAt = -Infinity;
    this.jumping = false;
    this.jumpCut = false;
    this.crouching = false;
    this.hidden = false;
    this.frozen = false;
    this.lockedUntil = 0;
  }

  setStandingBody(standing) {
    const { width, height, crouchHeight } = PLAYER.body;
    const h = standing ? height : crouchHeight;
    this.body.setSize(width, h);
    this.body.setOffset((PLAYER_FRAME.width - width) / 2, PLAYER_FRAME.height - h);
  }

  get onGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  update(time, delta) {
    if (this.frozen) {
      this.setVelocityX(0);
      return;
    }

    const dt = delta / 1000;
    const k = this.keys;
    const JustDown = Phaser.Input.Keyboard.JustDown;
    const locked = time < this.lockedUntil;
    const left = !locked && (k.left.isDown || k.a.isDown);
    const right = !locked && (k.right.isDown || k.d.isDown);
    const down = !locked && (k.down.isDown || k.s.isDown);
    const jumpHeld = k.up.isDown || k.w.isDown || k.space.isDown;
    const jumpPressed = JustDown(k.up) || JustDown(k.w) || JustDown(k.space);
    const grounded = this.onGround;

    if (grounded && this.body.velocity.y >= 0) {
      this.lastGroundedAt = time;
      this.jumping = false;
    }
    if (jumpPressed && !locked) this.jumpPressedAt = time;

    // Crouch (and hide) only on the ground.
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
      this.setVelocityY(-this.seasonPhysics.jumpVelocity);
      this.jumping = true;
      this.jumpCut = false;
      this.jumpPressedAt = -Infinity;
    }
    // Variable jump height: let go early for a short hop.
    if (this.jumping && !jumpHeld && !this.jumpCut && this.body.velocity.y < 0) {
      this.setVelocityY(this.body.velocity.y * PLAYER.jumpCutMultiplier);
      this.jumpCut = true;
    }

    // Horizontal: accelerate toward target speed. Season friction scales grip.
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    const maxSpeed = this.seasonPhysics.runSpeed * (this.crouching ? PLAYER.crouchSpeedMultiplier : 1);
    const grip = grounded ? (this.seasonPhysics.friction ?? 1) : PLAYER.airControl;
    const rate = (dir !== 0 ? PLAYER.acceleration : PLAYER.deceleration) * grip;
    this.setVelocityX(moveTowards(this.body.velocity.x, dir * maxSpeed, rate * dt));
    if (dir !== 0) this.setFlipX(dir < 0);

    this.updatePose(grounded);
  }

  updatePose(grounded) {
    let pose;
    if (this.crouching) pose = 'player-crouch';
    else if (!grounded) pose = 'player-jump';
    else if (Math.abs(this.body.velocity.x) > PLAYER.walkAnimThreshold) pose = 'walk';
    else pose = 'player-idle';

    if (pose === 'walk') {
      this.anims.play('player-walk', true);
    } else {
      this.anims.stop();
      this.setTexture(pose);
    }
  }

  setHidden(hidden) {
    this.hidden = hidden;
    this.setAlpha(hidden ? 0.45 : 1);
  }

  freeze() {
    this.frozen = true;
    this.setVelocity(0, 0);
    this.anims.stop();
  }

  respawn(x, y, time, lockMs) {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.crouching = false;
    this.setStandingBody(true);
    this.setHidden(false);
    this.setFlipX(false);
    this.setVisible(true);
    this.frozen = false;
    this.jumping = false;
    this.jumpPressedAt = -Infinity;
    this.lockedUntil = time + lockMs;
  }
}
