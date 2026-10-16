import { CAMERA, DEPTH, JUICE } from '../config/game.js';
import Settings from './Settings.js';

// Game feel ("juice"), with no effect on the rules:
//   camera     smooth look-ahead in the running direction; a gentle zoom-out on big
//              jumps (train roofs, the ski jump, long drops). HUD and screen overlays
//              are drawn by a second, unzoomed UI camera so they never shrink.
//   squash     stretch on jump, squash on landing (Player.squashTo: visual only)
//   landing    a puff of the season's ground (season.landing) when landing
//   hit-stop   a brief freeze when caught
//   slow-mo    a short slow-motion beat when a hurdle is cleared
// Tunables: JUICE in src/config/game.js.
export default class JuiceSystem {
  constructor(scene, season, player) {
    this.scene = scene;
    this.player = player;
    const { width: W, height: H } = scene.scale;
    const main = scene.cameras.main;
    this.main = main;
    // Room above the world so a zoomed-out view keeps the ground at the bottom edge.
    main.setBounds(0, -JUICE.zoomHeadroom, season.layout.width, H + JUICE.zoomHeadroom);
    this.ui = scene.cameras.add(0, 0, W, H);
    this.ui.transparent = true;
    this.lookAhead = 0;
    this.zoom = 1;
    this.timeScale = 1;
    this.freezeUntil = 0;
    this.slowUntil = 0;
    this.wasGrounded = true;
    this.lastVy = 0;
    this.airborneSince = null;

    const landing = season.landing ?? {};
    this.puff = scene.add.particles(0, 0, landing.texture ?? 'puff', {
      speedX: { min: -90, max: 90 },
      speedY: { min: -70, max: -15 },
      gravityY: landing.gravity ?? 160,
      scale: { start: landing.scale ?? 0.35, end: 0.05 },
      alpha: { start: 0.85, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan: 550,
      tint: landing.tint ?? 0xffffff,
      emitting: false,
    }).setDepth(DEPTH.player + 1);
    this.landingCount = landing.count ?? 8;

    scene.events.on('player-jump', () => player.squashTo(0.82, 1.2, 180));
    scene.events.on('player-launch', () => player.squashTo(0.75, 1.28, 260));
    scene.events.once('shutdown', () => this.restoreTime());
  }

  // Show HUD/overlays only on the UI camera and the world only on the main camera.
  // Screen-space = scroll factor 0 at overlay depths (the sky stays in the world).
  routeCameras() {
    for (const o of this.scene.children.list) {
      if (o.juiceDepth === o.depth && o.juiceSf === o.scrollFactorX) continue;
      o.juiceDepth = o.depth;
      o.juiceSf = o.scrollFactorX;
      const screen = o.scrollFactorX === 0 && o.scrollFactorY === 0 && o.depth >= JUICE.screenDepth;
      o.cameraFilter = screen ? this.main.id : this.ui.id;
    }
  }

  // ----- time -----

  hitStop(ms = JUICE.hitStopMs) {
    this.freezeUntil = performance.now() + ms;
    this.setTime(0.0001);
  }

  slowMo(scale = JUICE.slowMoScale, ms = JUICE.slowMoMs) {
    this.slowUntil = performance.now() + ms;
    this.setTime(scale);
  }

  // Scales physics, tweens, timers, animations and particles together.
  setTime(scale) {
    if (scale === this.timeScale) return;
    const s = this.scene;
    this.timeScale = scale;
    s.physics.world.timeScale = 1 / scale;
    s.tweens.timeScale = scale;
    s.time.timeScale = scale;
    s.anims.globalTimeScale = scale;
  }

  restoreTime() {
    this.setTime(1);
  }

  updateTime() {
    const now = performance.now();
    if (this.timeScale === 1) return;
    if (now >= this.freezeUntil && now >= this.slowUntil) this.restoreTime();
    else if (now >= this.freezeUntil && this.timeScale < 0.01) this.setTime(JUICE.slowMoScale);
  }

  zoomPunch(amount = JUICE.punchZoom) {
    this.punch = amount;
  }

  // ----- every frame -----

  update(delta, playing) {
    this.routeCameras();
    this.updateTime();
    const p = this.player;
    const dt = delta / 1000;
    const vx = p.body.velocity.x;
    const run = Math.max(1, Math.abs(vx));

    // Look ahead in the direction of travel (eased, so turning never snaps).
    const want = Math.abs(vx) > 30 ? -Math.sign(vx) * CAMERA.lookAheadX * Math.min(1, run / 200) : this.lookAhead * 0.98;
    this.lookAhead += (want - this.lookAhead) * Math.min(1, dt * JUICE.lookAheadRate);
    this.main.followOffset.x = this.lookAhead;

    // Gentle zoom-out for big moments: riding the train, a ski-jump launch, a long drop.
    const grounded = p.onGround;
    if (grounded) this.airborneSince = null;
    else if (this.airborneSince === null) this.airborneSince = performance.now();
    const longAir = this.airborneSince !== null && performance.now() - this.airborneSince > JUICE.longAirMs;
    const big = playing && (p.launched || Boolean(p.carrier?.parts) || (longAir && !p.swimming));
    const target = big ? JUICE.bigZoom : 1;
    this.zoom += (target - this.zoom) * Math.min(1, dt * (big ? JUICE.zoomOutRate : JUICE.zoomInRate));
    if (this.punch) {
      this.zoom += this.punch;
      this.punch = 0;
    }
    this.main.setZoom(this.zoom);

    // Landing: squash and a puff of the season's ground.
    if (grounded && !this.wasGrounded && this.lastVy > JUICE.landSpeed && playing && !p.swimming) {
      const k = Math.min(1, (this.lastVy - JUICE.landSpeed) / 500);
      p.squashTo(1 + 0.25 * (0.5 + k), 1 - 0.22 * (0.5 + k), 170);
      this.puff.explode(Math.round(this.landingCount * (0.6 + k)), p.x, p.body.bottom - 2);
      if (k > 0.6 && Settings.current.shake) this.main.shake(90, 0.002);
    }
    this.wasGrounded = grounded;
    this.lastVy = p.body.velocity.y;
  }
}
