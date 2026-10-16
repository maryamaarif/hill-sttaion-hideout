import { addScreenText, onKey } from './ui.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { CAMERA, DEPTH, EASY, LIVES, PLAYER, RESPAWN } from '../config/game.js';
import { buildBackdrop } from '../art/Backdrop.js';
import { applyLighting, Shadow } from '../art/Lighting.js';
import buildLevel from '../systems/LevelBuilder.js';
import HurdleSystem from '../systems/HurdleSystem.js';
import LivesSystem from '../systems/LivesSystem.js';
import DifficultySystem from '../systems/DifficultySystem.js';
import AudioSystem from '../systems/AudioSystem.js';
import PerkSystem from '../systems/PerkSystem.js';
import ShopSystem from '../systems/ShopSystem.js';
import { MAP_SHOW_MS } from '../config/shop.js';
import SaveSystem from '../systems/SaveSystem.js';
import Player from '../entities/Player.js';
import Police from '../entities/Police.js';
import HeatSystem from '../systems/HeatSystem.js';
import CrossingSystem from '../systems/CrossingSystem.js';
import LeafSystem from '../systems/LeafSystem.js';
import SlopeSystem from '../systems/SlopeSystem.js';
import BlizzardSystem from '../systems/BlizzardSystem.js';
import FootprintSystem from '../systems/FootprintSystem.js';
import Hud, { textStyle } from '../ui/Hud.js';
import PauseMenu from '../ui/PauseMenu.js';
import Settings from '../systems/Settings.js';
import { applyEffects } from '../systems/Effects.js';
import { resolveOutfit, equippedId } from '../systems/Wardrobe.js';
import ColdSystem from '../systems/ColdSystem.js';
import WeatherSystem from '../systems/WeatherSystem.js';
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
    // the perk chosen on the transition screen, then shop items and unlocked
    // hiding places.
    const tuned = DifficultySystem.tuneSeason(SEASON_ORDER[data.seasonIndex], data.level);
    const perked = PerkSystem.apply(tuned, data.perks);
    const shopped = ShopSystem.apply(perked, data.items, data.hidingPlaces);
    // Easy mode (Settings): police take longer to spot you.
    const eased = Settings.current.easy
      ? applyEffects(shopped, [{ path: 'police.detectionTime', mul: EASY.detectionMultiplier }])
      : shopped;
    // Seasonal outfit (default or bought in the shop): its effects change the rules
    // (e.g. faster in Summer, slower but warmer in Winter, camouflage bonus).
    this.outfitId = eased.wardrobe ? equippedId(SaveSystem.load(), eased.key) : null;
    this.outfit = eased.wardrobe ? resolveOutfit(eased, this.outfitId) : null;
    this.season = this.outfit ? applyEffects(eased, this.outfit.effects) : eased;
    this.player = null;
    if (!this.season.layout) {
      this.createPlaceholder();
      return;
    }

    const { layout, physics } = this.season;
    this.events.once('shutdown', () => this.events
        .off('player-enter-water').off('player-dive').off('player-out-of-breath').off('player-launch')
        .off('player-jump').off('player-hide').off('police-suspect').off('police-alarm')
        .off('player-umbrella').off('rain-start').off('rain-stop'));
    const { width: W, height: H } = this.scale;
    this.state = 'playing';
    this.lives = new LivesSystem(data.lives);
    this.audio = new AudioSystem(this);

    this.physics.world.gravity.y = physics.gravity;
    this.physics.world.setBounds(0, 0, layout.width, H);
    this.physics.world.setBoundsCollision(true, true, false, false);

    buildBackdrop(this, this.season, layout.width);
    applyLighting(this, this.season);
    this.level = buildLevel(this, this.season);
    this.hidingSpots = this.level.hidingSpots;

    this.movers = this.level.movers;
    this.player = new Player(this, layout.spawn.x, layout.spawn.y, this.season);
    if (this.outfit) this.player.setOutfit(this.outfit);
    this.playerShadow = new Shadow(this, 28);
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
    this.cold = new ColdSystem(layout.coldZones, layout.warmSpots, this.season.cold);
    this.weather = new WeatherSystem(this, this.season.weather);
    // Fall outfit: blend into foliage (trees and leaf piles).
    this.foliageXs = [...(layout.trees ?? []), ...(layout.leafPiles ?? []).map((p) => p.x)];
    this.outfitPuff = this.add.particles(0, 0, this.season.wardrobe?.puff?.texture ?? 'puff', {
      speed: { min: 60, max: 160 },
      lifespan: 700,
      scale: { start: 1.2, end: 0.4 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: this.season.wardrobe?.puff?.tint ?? 0xffffff,
      emitting: false,
    }).setDepth(DEPTH.popup);
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
    const itemIcons = ShopSystem.items(data.items).map((i) => i.icon).join(' ');
    this.hud.setPerk([perk ? `${perk.icon} ${perk.name}` : '', itemIcons].filter(Boolean).join('   '));
    this.hud.setBetweenHurdles(this.season.tagline);

    this.hurdles = new HurdleSystem(this, this.level.hurdles, this.player, {
      onStart: (i, h) => this.startHurdle(i, h),
      onClear: (i, h) => this.clearHurdle(i, h),
    });

    // Weather particles: the season's main ambient layer plus extras (summer dust).
    for (const ambient of [this.season.ambient, ...(this.season.ambientExtra ?? [])].filter(Boolean)) {
      const { texture, ...emitter } = ambient;
      this.add
        .particles(0, -10, texture, { x: { min: 0, max: W }, ...emitter })
        .setScrollFactor(0)
        .setDepth(DEPTH.ambient);
    }
    // Breath vapour in the cold (season.breath): a small puff from the mouth.
    if (this.season.breath) {
      // One emitter per facing direction (puffs drift the way the guest faces).
      const puffs = (dir) => this.add.particles(0, 0, 'puff', {
        speedX: { min: 10 * dir, max: 26 * dir },
        speedY: { min: -14, max: -4 },
        scale: { start: 0.12, end: 0.55 },
        alpha: { start: 0.55, end: 0 },
        lifespan: 1100,
        emitting: false,
      }).setDepth(DEPTH.player + 1);
      this.breath = { 1: puffs(1), [-1]: puffs(-1) };
      this.time.addEvent({
        delay: this.season.breath.everyMs,
        loop: true,
        callback: () => {
          const pl = this.player;
          if (!pl?.visible || pl.swimming || pl.hidden) return;
          const dir = pl.flipX ? -1 : 1;
          this.breath[dir].explode(3, pl.x + 6 * dir, pl.body.top + 6);
        },
      });
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
    this.events.on('player-jump', () => this.audio.play('jump'));
    this.events.on('player-hide', () => this.audio.play('hide'));
    this.events.on('player-umbrella', () => this.audio.play('umbrella'));
    this.events.on('police-suspect', () => this.audio.play('suspect'));
    this.events.on('police-alarm', () => this.audio.play('alert'));
    this.audio.playMusic(this.season.music ?? this.season.key);

    // ESC or P: pause menu (Resume, Restart season, Settings, Quit to menu).
    this.paused = false;
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.setPaused(false),
      onRestart: () => this.leave(() => this.scene.restart(this.run)),
      onQuit: () => this.leave(() => this.scene.start('MenuScene')),
    });
    const pause = () => {
      if (!this.pauseMenu.blocking && this.state === 'playing') this.setPaused(true);
    };
    this.input.keyboard.on('keydown-ESC', pause);
    this.input.keyboard.on('keydown-P', pause);

    // Settings can change mid-game (from the pause menu): controls, colour-blind mode.
    this.onSettings = () => {
      this.player.bindKeys();
      this.level.colorBlindOverlay.setVisible(Settings.current.colorBlind);
    };
    Settings.events.on('changed', this.onSettings);
    this.events.once('shutdown', () => Settings.events.off('changed', this.onSettings));
    this.level.colorBlindOverlay.setVisible(Settings.current.colorBlind);

    // Key icons fade once the action has been used (Spring teaches with icons only).
    this.keyHints = this.level.keyHints;
    const used = (action) => this.fadeKeyHints(action);
    this.events.on('player-jump', () => used('jump'));
    this.events.on('player-hide', () => used('hide'));
    this.events.on('player-umbrella', () => used('glide'));
    this.events.on('player-out-of-breath', (p) => {
      this.audio.play('gasp');
      this.hud.popup(p.x, p.y - 40, 'Out of breath!', '#bfeaff');
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, layout.width, H);
    cam.startFollow(this.player, false, CAMERA.lerp, CAMERA.lerp);
    cam.fadeIn(400);

    // The tutorial season shows only the name: no instruction sentences.
    this.hud.showBanner(this.season.name, this.season.tutorial ? '' : `Reach the ${layout.goal.label}. Stay out of sight.`);
    if (ShopSystem.hasMap(data.items)) this.showPoliceRoutes();
  }

  fadeKeyHints(action) {
    for (const hint of this.keyHints) {
      if (hint.done || !hint.actions.includes(action)) continue;
      hint.done = true;
      this.tweens.killTweensOf(hint.icon);
      this.tweens.add({ targets: hint.icon, alpha: 0, y: hint.icon.y - 16, duration: 500, delay: 300 });
    }
  }

  // Screen shake, unless turned off in Settings.
  shake(duration, intensity) {
    if (Settings.current.shake) this.cameras.main.shake(duration, intensity);
  }

  // Unpause everything (the animation manager is shared by all scenes) before leaving.
  leave(go) {
    this.pauseMenu.close(false);
    this.setPaused(false);
    go();
  }

  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this.physics.world.pause();
      this.tweens.pauseAll();
      this.anims.pauseAll();
      this.time.paused = true;
      this.pauseMenu.open();
    } else {
      this.physics.world.resume();
      this.tweens.resumeAll();
      this.anims.resumeAll();
      this.time.paused = false;
    }
  }

  update(time, delta) {
    if (!this.player || this.paused) return;
    const dt = delta / 1000;
    const player = this.player;
    if (Math.abs(player.x - this.season.layout.spawn.x) > 60) this.fadeKeyHints('left');
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
    this.playerShadow.follow(player.x, player.body.bottom, player.onGround && !player.swimming, player.visible && !player.swimming);
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
      officer.visibility = baseVisibility * this.blizzard.visibilityAt(officer.x) * this.weather.visibility;
      return officer.update(time, delta, player, playing, blockers, clues);
    });
    const heat = playing ? this.heat.update(dt, player, Boolean(spot)) : null;
    const cold = playing ? this.cold.update(dt, player, Boolean(spot)) : null;
    this.weather.update(time);
    this.meters.update(player, [
      { kind: 'stamina', value: this.heat.stamina, show: this.heat.active && (this.heat.stamina < 1 || this.heat.standingInSun) },
      { kind: 'breath', value: player.breath, show: player.swimming || player.breath < 1 },
      { kind: 'cold', value: this.cold.warmth, show: this.cold.active && (this.cold.warmth < 1 || this.cold.inCold) },
    ]);
    if (!playing) return;

    this.hidingSpots.forEach((s) => {
      s.setPrompt(s === spot && !player.hidden && !player.swimming, player);
      s.setOccupied(s === player.hidingSpot);
    });
    // Fall outfit: in front of trees or leaf piles, police notice you more slowly.
    const foliage = this.outfit?.foliage;
    const blending = Boolean(foliage) && !player.hidden && this.foliageXs.some((x) => Math.abs(player.x - x) <= foliage.range);
    player.detectionScale = blending ? foliage.detectionRate : 1;
    this.hud.setHidden(player.hidden, blending ? 'BLENDING IN' : null);

    if (cold === 'warn') this.hud.popup(player.x, player.y - 56, 'Freezing! Find shelter', '#cfe9ff');
    if (heat === 'warn') {
      this.hud.popup(player.x, player.y - 56, 'Too hot! Find shade', '#ffd27a');
    }
    if (trainHit) {
      this.loseLife({ amount: LIVES.lossOnHurdleFail, sound: 'bonk', message: 'Too close!', banner: 'Watch the signals!', reason: 'train' });
    } else if (cold === 'freeze') {
      this.loseLife({ amount: LIVES.lossOnHurdleFail, sound: 'faint', message: 'Too cold!', banner: 'Frozen!', reason: 'cold' });
    } else if (heat === 'faint') {
      this.loseLife({ amount: LIVES.lossOnHurdleFail, sound: 'faint', message: 'Fainted!', banner: 'Too hot!', reason: 'heat' });
    } else if (catcher) {
      this.loseLife({ amount: LIVES.lossOnCaught, sound: 'caught', message: 'Caught!', banner: 'Spotted!', reason: 'caught' });
    } else if (this.player.y > this.scale.height + RESPAWN.killMarginY) {
      this.loseLife({ amount: LIVES.lossOnHurdleFail, sound: 'hit', message: '−1 life', reason: 'fell' });
    }
  }

  // Map item: every officer's patrol route drawn for a few seconds.
  showPoliceRoutes() {
    const g = this.add.graphics().setDepth(DEPTH.popup);
    const groundAt = this.level.groundAt;
    for (const officer of this.police) {
      const { from, to, y } = officer.route;
      const ry = (x) => (y ?? groundAt(x)) - 70;
      g.lineStyle(4, 0xd94f4a, 0.9);
      if (from === to) {
        g.strokeCircle(from, ry(from), 14);
      } else {
        for (let x = from; x < to; x += 24) g.lineBetween(x, ry(x), Math.min(to, x + 14), ry(Math.min(to, x + 14)));
        g.fillStyle(0xd94f4a).fillTriangle(from - 10, ry(from), from + 2, ry(from) - 8, from + 2, ry(from) + 8);
        g.fillTriangle(to + 10, ry(to), to - 2, ry(to) - 8, to - 2, ry(to) + 8);
      }
    }

    // Minimap across the top: the whole season at a glance (officers start off screen).
    const W = this.scale.width;
    const mapW = 640;
    const mx = (W - mapW) / 2;
    const my = 252; // below the season banner
    const sx = (x) => mx + (x / this.season.layout.width) * mapW;
    const mini = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    mini.fillStyle(0xfff4e6, 0.92).fillRoundedRect(mx - 10, my - 16, mapW + 20, 40, 8);
    mini.lineStyle(3, 0x3b2a20).strokeRoundedRect(mx - 10, my - 16, mapW + 20, 40, 8);
    mini.fillStyle(0x82c86f).fillRect(mx, my + 10, mapW, 4); // the path
    for (const h of this.level.hurdles) mini.fillStyle(0x3b2a20, 0.4).fillRect(sx(h.startX), my - 8, 2, 22);
    for (const spot of this.hidingSpots) mini.fillStyle(0x2f8a3a).fillCircle(sx(spot.x), my + 12, 4);
    for (const officer of this.police) {
      const { from, to } = officer.route;
      mini.fillStyle(0xd94f4a);
      if (from === to) mini.fillCircle(sx(from), my + 2, 5);
      else mini.fillRect(sx(from), my, Math.max(4, sx(to) - sx(from)), 5);
    }
    mini.fillStyle(0xd9a441).fillTriangle(sx(this.season.layout.goal.x), my - 10, sx(this.season.layout.goal.x) + 10, my - 5, sx(this.season.layout.goal.x), my);
    mini.fillStyle(0x34506e).fillCircle(sx(this.player.x), my + 12, 6);
    const label = this.add
      .text(W / 2, my - 30, '🗺️ Map: police routes (red), hiding spots (green)', textStyle(14))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.tweens.add({ targets: [g, mini, label], alpha: 0, delay: MAP_SHOW_MS - 800, duration: 800, onComplete: () => [g, mini, label].forEach((o) => o.destroy()) });
  }

  // Change outfit in place (hurdle swaps such as Summer's life jacket), with a puff.
  changeOutfit(swapKey) {
    if (!this.outfit) return;
    const outfit = resolveOutfit(this.season, this.outfitId, swapKey);
    if (outfit.id === this.player.outfit?.id) return;
    this.player.setOutfit(outfit);
    this.outfitPuff.explode(18, this.player.x, this.player.y - 6);
    this.audio.play('outfit');
  }

  startHurdle(i, hurdle) {
    if (this.season.wardrobe?.swaps?.[hurdle.key]) this.changeOutfit(hurdle.key);
    this.hud.setHurdle(i);
    this.hud.showBanner(`Hurdle ${i + 1}: ${hurdle.name}`, hurdle.hint ?? '');
  }

  clearHurdle(i, hurdle) {
    // Reward: chime, and a half heart flies from the player into the HUD.
    const { after } = this.lives.hurdleCleared();
    this.audio.play('chime');
    this.hud.flyHalfHeart(this.player.x, this.player.y - 30, after, () => {
      this.hud.setLives(this.lives.lives);
      this.audio.play('heart');
    });
    this.hud.markCleared(i + 1);
    this.hud.popup(this.player.x, this.player.y - 40, '+½ life');
    if (this.season.wardrobe?.swaps?.[hurdle.key]) this.changeOutfit(null); // back to the season outfit
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
    // Caught: hands up where the officer saw you. Other failures: gone (fell, splashed).
    if (reason === 'caught') this.player.showCaught();
    else this.player.setVisible(false);
    this.shake(200, 0.006);
    this.cameras.main.flash(250, 255, 170, 170);

    if (this.lives.isGameOver()) {
      this.audio.stopMusic();
      this.time.delayedCall(250, () => this.audio.play('gameOver'));
      this.cameras.main.fadeOut(900);
      const { level, items, hidingPlaces } = this.run;
      this.time.delayedCall(1000, () => this.scene.start('GameOverScene', { level, reason, items, hidingPlaces, seasonKey: this.season.key }));
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
      this.cold.reset();
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
      'Press ENTER (or click) to continue',
    ]);
    // ENTER or a click: whichever comes first.
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      this.finishSeason();
    };
    onKey(this, 'ENTER', go);
    this.time.delayedCall(400, () => this.input.once('pointerdown', go));
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
