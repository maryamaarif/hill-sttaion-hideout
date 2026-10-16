import { addScreenText, onKey } from './ui.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { CAMERA, DEPTH, LIVES, PLAYER, RESPAWN } from '../config/game.js';
import { buildBackdrop } from '../art/Backdrop.js';
import buildLevel from '../systems/LevelBuilder.js';
import HurdleSystem from '../systems/HurdleSystem.js';
import LivesSystem from '../systems/LivesSystem.js';
import DifficultySystem from '../systems/DifficultySystem.js';
import AudioSystem from '../systems/AudioSystem.js';
import PerkSystem from '../systems/PerkSystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import Player from '../entities/Player.js';
import Police from '../entities/Police.js';
import HeatSystem from '../systems/HeatSystem.js';
import CrossingSystem from '../systems/CrossingSystem.js';
import LeafSystem from '../systems/LeafSystem.js';
import SlopeSystem from '../systems/SlopeSystem.js';
import BlizzardSystem from '../systems/BlizzardSystem.js';
import FootprintSystem from '../systems/FootprintSystem.js';
import Hud from '../ui/Hud.js';
import PlayerMeters from '../ui/PlayerMeters.js';

// One shared engine for every season. The season config + layout decide
// physics, art, hazards, moving platforms, water, heat, police and hurdles;
// this scene never special-cases a season.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(data) {
    this.run = data;
    // Season config tuned for the level (breath, stamina, movers, crossings), then
    // the perk chosen on the transition screen.
    const tuned = DifficultySystem.tuneSeason(SEASON_ORDER[data.seasonIndex], data.level);
    this.season = PerkSystem.apply(tuned, data.perks);
    this.player = null;
    if (!this.season.layout) {
      this.createPlaceholder();
      return;
    }

    const { layout, physics } = this.season;
    this.events.once('shutdown', () => this.events.off('player-enter-water').off('player-dive').off('player-out-of-breath').off('player-launch'));
    const { width: W, height: H } = this.scale;
    this.state = 'playing';
    this.lives = new LivesSystem(data.lives);
    this.audio = new AudioSystem(this);

    this.physics.world.gravity.y = physics.gravity;
    this.physics.world.setBounds(0, 0, layout.width, H);
    this.physics.world.setBoundsCollision(true, true, false, false);

    buildBackdrop(this, this.season.palette, layout.width);
    this.level = buildLevel(this, this.season);
    this.hidingSpots = this.level.hidingSpots;

    this.movers = this.level.movers;
    this.player = new Player(this, layout.spawn.x, layout.spawn.y, this.season);
    this.physics.add.collider(this.player, this.level.solids);
    this.physics.add.collider(this.player, this.movers.flatMap((m) => m.zones));
    this.physics.add.overlap(this.player, this.level.obstacles, () =>
      this.loseLife({ amount: LIVES.lossOnHurdleFail, sound: 'bonk', message: 'Bonk!', reason: 'branch' }),
    );
    this.physics.add.overlap(this.player, this.level.hazards, () =>
      this.loseLife({ amount: LIVES.lossOnHurdleFail, splash: true, sound: 'splash', message: '−1 life', reason: 'water' }),
    );
    this.physics.add.overlap(this.player, this.level.goalZone, () => this.reachGoal());

    // Officers: layout routes (+ extra routes from level 2 on), season settings × level.
    // A season palette can recolour cones so they stand out against its scenery.
    const policeSettings = {
      ...DifficultySystem.policeSettings(this.season.police, data.level),
      coneColor: this.season.palette.cone,
      coneEdgeColor: this.season.palette.coneEdge,
    };
    const bonus = DifficultySystem.forLevel(data.level).policeCountBonus;
    const routes = [...(layout.police ?? []), ...(layout.extraPolice ?? []).slice(0, bonus)];
    this.police = routes.map(
      (route) =>
        new Police(this, route, policeSettings, layout.groundY, {
          visibility: this.season.visibility ?? 1,
          groundAt: this.level.groundAt,
        }),
    );

    this.heat = new HeatSystem(this, layout.heatZones, this.season.heat, layout.groundY);
    this.crossings = new CrossingSystem(this, layout.crossings, layout.groundY, this.season.palette, this.audio, this.season.hurdleTiming);
    this.leaves = new LeafSystem(this, layout.leafPiles, this.season.wind, layout.groundY, this.season.palette, this.audio);
    this.hidingSpots.push(...this.leaves.hidingSpots);
    this.slopes = new SlopeSystem(layout.slopes);
    this.skiZones = layout.skiZones ?? [];
    this.blizzard = new BlizzardSystem(this, layout.blizzardZones, this.season.blizzard);
    this.footprints = new FootprintSystem(this, layout.footprintZones, this.season.footprints);
    this.meters = new PlayerMeters(this);

    this.hud = new Hud(this, this.season, this.level.hurdles, SaveSystem.load().coins);
    this.hud.setLives(this.lives.lives);
    const perk = PerkSystem.activeFor(this.season.key, data.perks)[0];
    if (perk) this.hud.setPerk(`${perk.icon} ${perk.name}`);
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
    this.bubbles = this.add.particles(0, 0, 'bubble', {
      speedY: { min: -40, max: -70 },
      speedX: { min: -10, max: 10 },
      lifespan: 700,
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    }).setDepth(DEPTH.water + 1);
    this.nextBubbleAt = 0;

    this.events.on('player-enter-water', (p) => {
      this.splash.explode(8, p.x, p.body.bottom - 20);
      this.audio.play('splashSoft');
    });
    this.events.on('player-dive', () => this.audio.play('dive'));
    this.events.on('player-launch', () => this.audio.play('launch'));
    this.events.on('player-out-of-breath', (p) => {
      this.audio.play('gasp');
      this.hud.popup(p.x, p.y - 40, 'Out of breath!', '#bfeaff');
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, layout.width, H);
    cam.startFollow(this.player, false, CAMERA.lerp, CAMERA.lerp);
    cam.fadeIn(400);

    this.hud.showBanner(this.season.name, `Reach the ${layout.goal.label}. Stay out of sight.`);
  }

  update(time, delta) {
    if (!this.player) return;
    const dt = delta / 1000;
    const player = this.player;
    const playing = this.state === 'playing';

    // Moving platforms: carry whoever is standing on one.
    const rider = playing ? this.movers.find((m) => m.isRiding(player)) : null;
    this.movers.forEach((m) => m.update(time, dt, m === rider));
    if (rider) player.x += rider.dx;
    player.carrier = rider ?? null;

    // Slopes: stick to the snow; ski zones put the player on skis (they stay on
    // through the air after a jump until landing outside the zone).
    this.slopes.apply(player);
    const inSkiZone = this.skiZones.some((z) => player.x >= z.x && player.x <= z.x + z.w);
    player.skiing = inSkiZone || (player.skiing && !player.onGround);
    if (!player.skiing && player.body.gravity.y) player.body.setGravityY(0);

    // Being carried out of a wide hiding spot (reeds) uncovers the player.
    if (player.hidingSpot && !player.hidingSpot.contains(player)) player.leaveHiding();

    const spot = player.hidden ? player.hidingSpot : this.hidingSpots.find((s) => s.contains(player));
    player.nearSpot = playing ? (spot ?? null) : null;
    player.water = this.level.swimWaters.find((w) => player.x >= w.x && player.x <= w.x + w.w) ?? null;
    player.update(time, delta);
    this.cameras.main.followOffset.x = player.flipX ? CAMERA.lookAheadX : -CAMERA.lookAheadX;

    if (player.submerged && time >= this.nextBubbleAt) {
      this.bubbles.explode(1, player.x + (player.flipX ? -6 : 6), player.body.top);
      this.nextBubbleAt = time + PLAYER.swim.bubbleEveryMs;
    }

    // Wind can expose a player hiding in a leaf pile; passing trains block police vision.
    this.leaves.update(time, player);
    player.exposed = Boolean(player.hidingSpot?.exposed);
    const trainHit = this.crossings.update(time, dt, player) === 'hit' && playing;
    const blockers = this.crossings.blockers();
    // Blizzard: fog around the player, shorter police cones; footprints in the snow.
    this.blizzard.update(player);
    this.footprints.update(time, player);
    const clues = this.footprints.clues();
    const baseVisibility = this.season.visibility ?? 1;
    const catcher = this.police.find((officer) => {
      officer.visibility = baseVisibility * this.blizzard.visibilityAt(officer.x);
      return officer.update(time, delta, player, playing, blockers, clues);
    });
    const heat = playing ? this.heat.update(dt, player, Boolean(spot)) : null;
    this.meters.update(player, [
      { kind: 'stamina', value: this.heat.stamina, show: this.heat.active && (this.heat.stamina < 1 || this.heat.standingInSun) },
      { kind: 'breath', value: player.breath, show: player.swimming || player.breath < 1 },
    ]);
    if (!playing) return;

    this.hidingSpots.forEach((s) => {
      s.setPrompt(s === spot && !player.hidden && !player.swimming, player);
      s.setOccupied(s === player.hidingSpot);
    });
    this.hud.setHidden(player.hidden);

    if (heat === 'warn') {
      this.hud.popup(player.x, player.y - 56, 'Too hot! Find shade', '#ffd27a');
    }
    if (trainHit) {
      this.loseLife({ amount: LIVES.lossOnHurdleFail, sound: 'bonk', message: 'Too close!', banner: 'Watch the signals!', reason: 'train' });
    } else if (heat === 'faint') {
      this.loseLife({ amount: LIVES.lossOnHurdleFail, sound: 'faint', message: 'Fainted!', banner: 'Too hot!', reason: 'heat' });
    } else if (catcher) {
      this.loseLife({ amount: LIVES.lossOnCaught, sound: 'caught', message: 'Caught!', banner: 'Spotted!', reason: 'caught' });
    } else if (this.player.y > this.scale.height + RESPAWN.killMarginY) {
      this.loseLife({ amount: LIVES.lossOnHurdleFail, sound: 'hit', message: '−1 life', reason: 'fell' });
    }
  }

  startHurdle(i, hurdle) {
    this.hud.setHurdle(i);
    this.hud.showBanner(`Hurdle ${i + 1}: ${hurdle.name}`, hurdle.hint ?? '');
  }

  clearHurdle(i, hurdle) {
    // Reward: chime, and a half heart flies from the player into the HUD.
    const { after } = this.lives.hurdleCleared();
    this.audio.play('chime');
    this.hud.flyHalfHeart(this.player.x, this.player.y - 30, after, () => {
      this.hud.setLives(this.lives.lives);
      this.audio.play('pop');
    });
    this.hud.markCleared(i + 1);
    this.hud.popup(this.player.x, this.player.y - 40, '+½ life');
    const next = this.level.hurdles[i + 1];
    this.hud.setBetweenHurdles(next ? `${hurdle.name} cleared!` : 'Head for the exit →');
  }

  // Caught by police or failed a hurdle: lose a life, respawn at the hurdle start.
  loseLife({ amount, splash = false, sound, message, banner, reason }) {
    if (this.state !== 'playing') return;
    this.state = 'respawning';
    if (splash) this.splash.explode(14, this.player.x, this.player.body.bottom);
    if (banner) this.hud.showBanner(banner, 'Back to the start of this hurdle');
    this.player.leaveHiding();

    const { before, after } = this.lives.loseLife(amount);
    this.hud.breakHeart(before, after);
    this.audio.play(sound);
    this.player.freeze();
    this.player.setVisible(false);
    this.cameras.main.shake(200, 0.006);
    this.cameras.main.flash(250, 255, 170, 170);

    if (this.lives.isGameOver()) {
      this.time.delayedCall(250, () => this.audio.play('gameOver'));
      this.cameras.main.fadeOut(900);
      this.time.delayedCall(1000, () => this.scene.start('GameOverScene', { level: this.run.level, reason }));
      return;
    }

    this.hud.popup(this.player.x, this.player.y - 40, message, '#ffb3b3');
    this.time.delayedCall(RESPAWN.delayMs, () => {
      const x = this.hurdles.checkpointX(this.season.layout.spawn.x) + RESPAWN.offsetX;
      const y = this.level.groundAt(x) - RESPAWN.dropHeight;
      this.player.respawn(x, y, this.time.now, RESPAWN.inputLockMs);
      this.police.forEach((officer) => officer.reset());
      this.movers.forEach((m) => m.reset());
      this.heat.reset();
      this.slopes.reset();
      this.footprints.reset();
      this.player.skiing = false;
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
