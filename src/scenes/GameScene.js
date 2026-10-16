import { addScreenText, onKey } from './ui.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { CAMERA, DEPTH, LIVES, RESPAWN } from '../config/game.js';
import { buildBackdrop } from '../art/Backdrop.js';
import buildLevel from '../systems/LevelBuilder.js';
import HurdleSystem from '../systems/HurdleSystem.js';
import LivesSystem from '../systems/LivesSystem.js';
import DifficultySystem from '../systems/DifficultySystem.js';
import Player from '../entities/Player.js';
import Police from '../entities/Police.js';
import Hud from '../ui/Hud.js';

// One shared engine for every season. The season config + layout decide
// physics, art, hazards, police and hurdles; this scene never special-cases a season.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(data) {
    this.run = data;
    this.season = SEASON_ORDER[data.seasonIndex];
    this.player = null;
    if (!this.season.layout) {
      this.createPlaceholder();
      return;
    }

    const { layout, physics } = this.season;
    const { width: W, height: H } = this.scale;
    this.state = 'playing';
    this.lives = new LivesSystem(data.lives);

    this.physics.world.gravity.y = physics.gravity;
    this.physics.world.setBounds(0, 0, layout.width, H);
    this.physics.world.setBoundsCollision(true, true, false, false);

    buildBackdrop(this, this.season.palette, layout.width);
    this.level = buildLevel(this, this.season);
    this.hidingSpots = this.level.hidingSpots;

    this.player = new Player(this, layout.spawn.x, layout.spawn.y, physics);
    this.physics.add.collider(this.player, this.level.solids);
    this.physics.add.overlap(this.player, this.level.hazards, () =>
      this.loseLife({ amount: LIVES.lossOnHurdleFail, splash: true, message: '−1 life' }),
    );
    this.physics.add.overlap(this.player, this.level.goalZone, () => this.reachGoal());

    // Officers: layout routes (+ extra routes from level 2 on), season settings × level.
    const policeSettings = DifficultySystem.policeSettings(this.season.police, data.level);
    const bonus = DifficultySystem.forLevel(data.level).policeCountBonus;
    const routes = [...(layout.police ?? []), ...(layout.extraPolice ?? []).slice(0, bonus)];
    this.police = routes.map(
      (route) => new Police(this, route, policeSettings, layout.groundY, this.season.visibility ?? 1),
    );

    this.hud = new Hud(this, this.season.name, this.level.hurdles);
    this.hud.setLives(this.lives.lives);
    this.hud.setBetweenHurdles(this.season.tagline);

    this.hurdles = new HurdleSystem(this, this.level.hurdles, this.player, {
      onStart: (i, h) => this.startHurdle(i, h),
      onClear: (i, h) => this.clearHurdle(i, h),
    });

    if (this.season.ambient) {
      const { texture, ...emitter } = this.season.ambient;
      this.add
        .particles(0, -10, texture, { x: { min: 0, max: W }, ...emitter })
        .setScrollFactor(0)
        .setDepth(DEPTH.ambient);
    }
    this.splash = this.add.particles(0, 0, 'droplet', {
      speed: { min: 90, max: 220 },
      angle: { min: 230, max: 310 },
      gravityY: 700,
      lifespan: 600,
      scale: { start: 1, end: 0.4 },
      emitting: false,
    }).setDepth(DEPTH.water + 1);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, layout.width, H);
    cam.startFollow(this.player, false, CAMERA.lerp, CAMERA.lerp);
    cam.fadeIn(400);

    this.hud.showBanner(this.season.name, `Reach the ${layout.goal.label}. Stay out of sight.`);
  }

  update(time, delta) {
    if (!this.player) return;
    const playing = this.state === 'playing';
    const spot = this.player.hidden
      ? this.player.hidingSpot
      : this.hidingSpots.find((s) => s.contains(this.player));
    this.player.nearSpot = playing ? (spot ?? null) : null;
    this.player.update(time, delta);
    this.cameras.main.followOffset.x = this.player.flipX ? CAMERA.lookAheadX : -CAMERA.lookAheadX;

    const catcher = this.police.find((officer) => officer.update(time, delta, this.player, playing));
    if (!playing) return;

    this.hidingSpots.forEach((s) => {
      s.setPrompt(s === spot && !this.player.hidden);
      s.setOccupied(s === this.player.hidingSpot);
    });
    this.hud.setHidden(this.player.hidden);

    if (catcher) {
      this.loseLife({ amount: LIVES.lossOnCaught, message: 'Caught!', banner: 'Spotted!' });
    } else if (this.player.y > this.scale.height + RESPAWN.killMarginY) {
      this.loseLife({ amount: LIVES.lossOnHurdleFail, message: '−1 life' });
    }
  }

  startHurdle(i, hurdle) {
    this.hud.setHurdle(i);
    this.hud.showBanner(`Hurdle ${i + 1}: ${hurdle.name}`, hurdle.hint ?? '');
  }

  clearHurdle(i, hurdle) {
    this.lives.hurdleCleared();
    this.hud.setLives(this.lives.lives);
    this.hud.markCleared(i + 1);
    this.hud.popup(this.player.x, this.player.y - 40, '+½ life');
    const next = this.level.hurdles[i + 1];
    this.hud.setBetweenHurdles(next ? `${hurdle.name} cleared!` : 'Head for the exit →');
  }

  // Caught by police or failed a hurdle: lose a life, respawn at the hurdle start.
  loseLife({ amount, splash = false, message, banner }) {
    if (this.state !== 'playing') return;
    this.state = 'respawning';
    if (splash) this.splash.explode(14, this.player.x, this.player.body.bottom);
    if (banner) this.hud.showBanner(banner, 'Back to the start of this hurdle');
    this.player.leaveHiding();

    this.lives.loseLife(amount);
    this.hud.setLives(this.lives.lives);
    this.player.freeze();
    this.player.setVisible(false);
    this.cameras.main.shake(200, 0.006);
    this.cameras.main.flash(250, 255, 170, 170);

    if (this.lives.isGameOver()) {
      this.cameras.main.fadeOut(600);
      this.time.delayedCall(700, () => this.scene.start('GameOverScene', { level: this.run.level }));
      return;
    }

    this.hud.popup(this.player.x, this.player.y - 40, message, '#ffb3b3');
    this.time.delayedCall(RESPAWN.delayMs, () => {
      const x = this.hurdles.checkpointX(this.season.layout.spawn.x) + RESPAWN.offsetX;
      const y = this.season.layout.groundY - RESPAWN.dropHeight;
      this.player.respawn(x, y, this.time.now, RESPAWN.inputLockMs);
      this.police.forEach((officer) => officer.reset());
      this.hud.setHidden(false);
      this.state = 'playing';
    });
  }

  reachGoal() {
    if (this.state !== 'playing' || !this.hurdles.allCleared) return;
    this.state = 'complete';
    this.player.freeze();
    this.hud.showPanel(`${this.season.name} complete!`, [
      `Lives: ${this.lives.lives}`,
      '',
      'Press ENTER to continue',
    ]);
    onKey(this, 'ENTER', () => this.finishSeason());
  }

  finishSeason() {
    const run = { ...this.run, lives: this.lives?.lives ?? this.run.lives };
    const next = run.seasonIndex + 1;
    if (next < SEASON_ORDER.length) {
      this.scene.start('SeasonTransitionScene', { ...run, seasonIndex: next });
    } else {
      const elapsedSeconds = (this.time.now - run.startTime) / 1000;
      this.scene.start('LevelCompleteScene', { ...run, elapsedSeconds });
    }
  }

  // Seasons without a layout yet: a stand-in screen so the full flow still works.
  createPlaceholder() {
    this.cameras.main.setBackgroundColor(this.season.palette.skyTop);
    addScreenText(this, this.season.name, [
      this.season.tagline,
      `Level ${this.run.level} · Lives ${this.run.lives}`,
      '',
      '(stage not built yet)',
      'Press N to finish this season',
    ]);
    onKey(this, 'N', () => this.finishSeason());
  }
}
