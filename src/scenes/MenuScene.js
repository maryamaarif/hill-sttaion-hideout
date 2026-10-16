import { createMenu } from './ui.js';
import { textStyle } from '../ui/Hud.js';
import { buildBackdrop } from '../art/Backdrop.js';
import { INK } from '../art/TextureFactory.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { DEPTH, UI } from '../config/game.js';
import { CREDITS } from '../config/credits.js';
import { newLevelRunFromSave } from '../systems/RunState.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';
import SettingsPanel from '../ui/SettingsPanel.js';
import { addPanel, setHot } from '../ui/Panels.js';

const SEASON_MS = 3500; // each season shows this long before the next fades in
const FADE_MS = 1200;

// Title screen: the guest house on its hill while the seasons cycle behind it,
// with Play, Settings and Credits (and Your room once there is progress).
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width: W, height: H } = this.scale;
    const save = SaveSystem.load();
    const level = save.highestLevel;
    new AudioSystem(this).playMusic('room');

    // One backdrop (hills, guest house, trees) and particle emitter per season.
    this.seasons = SEASON_ORDER.map((season, i) => {
      const layers = buildBackdrop(this, season, W);
      const { texture, ...cfg } = season.ambient;
      const particles = this.add.particles(0, -10, texture, { x: { min: 0, max: W }, ...cfg }).setDepth(DEPTH.ambient);
      if (i > 0) {
        layers.forEach((l) => l.setAlpha(0));
        particles.stop();
      }
      return { layers, particles, name: season.name };
    });
    this.current = 0;
    this.seasonLabel = this.add.text(W - 16, H - 16, this.seasons[0].name, textStyle(16)).setOrigin(1, 1).setDepth(DEPTH.hud);
    this.time.addEvent({ delay: SEASON_MS, loop: true, callback: () => this.nextSeason() });
    this.add.rectangle(0, 0, W, H, 0x1d2b3a, 0.22).setOrigin(0).setDepth(DEPTH.ambient - 1);

    // Title and buttons in a left column so the guest house stays in view on its hill.
    const col = 270;
    this.add.text(col, 92, 'Hill Station\nHideout', textStyle(50, { lineSpacing: -6 })).setOrigin(0.5).setDepth(DEPTH.hud);
    this.add.text(col, 168, 'Stay out of sight through four seasons.', textStyle(18, { color: '#fff6e8' })).setOrigin(0.5).setDepth(DEPTH.hud);

    this.settingsPanel = new SettingsPanel(this);
    const options = [
      { label: level > 1 ? `Play (Level ${level})` : 'Play', action: () => this.scene.start('GameScene', newLevelRunFromSave(level, this.time.now)) },
    ];
    if (save.coins > 0 || level > 1) options.push({ label: 'Your room', action: () => this.scene.start('HubScene') });
    options.push({ label: 'Settings', keepOpen: true, action: () => this.settingsPanel.open() });
    options.push({ label: 'Credits', keepOpen: true, action: () => this.showCredits() });
    const buttons = createMenu(this, col, 238, options, 58);
    buttons.forEach(({ bg, label }) => {
      bg.setDepth(DEPTH.hud);
      label.setDepth(DEPTH.hud);
    });
    this.add.text(16, H - 16, '↑ ↓  ENTER   M mute', textStyle(15)).setOrigin(0, 1).setDepth(DEPTH.hud);
  }

  nextSeason() {
    const from = this.seasons[this.current];
    this.current = (this.current + 1) % this.seasons.length;
    const to = this.seasons[this.current];
    // Crossfade: the new season fades in while the old one fades out.
    this.tweens.add({ targets: to.layers, alpha: 1, duration: FADE_MS });
    this.tweens.add({ targets: from.layers, alpha: 0, duration: FADE_MS, delay: FADE_MS / 2 });
    from.particles.stop();
    to.particles.start();
    this.seasonLabel.setText(to.name);
  }

  showCredits() {
    const { width: W, height: H } = this.scale;
    const objs = [];
    const add = (o) => {
      objs.push(o.setDepth(DEPTH.hud + 10));
      return o;
    };
    add(this.add.rectangle(0, 0, W, H, 0x1d2b3a, 0.65).setOrigin(0).setInteractive());
    add(addPanel(this, W / 2, H / 2, 560, 380, 'paper'));
    let y = H / 2 - 160;
    for (const c of CREDITS) {
      if (c.heading) {
        y += 10;
        add(this.add.text(W / 2, y, c.heading, { fontFamily: UI.font, fontSize: '20px', color: '#3b2a20', fontStyle: 'bold' }).setOrigin(0.5));
      } else {
        add(this.add.text(W / 2, y, c.line, { fontFamily: UI.font, fontSize: '15px', color: '#5a4636' }).setOrigin(0.5));
      }
      y += 28;
    }
    add(this.add.text(W / 2, H / 2 + 166, 'ENTER / ESC to close', { fontFamily: UI.font, fontSize: '14px', color: '#3b2a20' }).setOrigin(0.5));
    // The menu underneath ignores keys while the credits are up (isMenuBlocked).
    this.creditsOpen = true;
    const close = (e) => {
      if (e && !['Enter', 'Escape', 'Space'].includes(e.code)) return;
      this.input.keyboard.off('keydown', close);
      objs.forEach((o) => o.destroy());
      this.time.delayedCall(150, () => (this.creditsOpen = false));
    };
    this.time.delayedCall(150, () => this.input.keyboard.on('keydown', close));
    objs[0].on('pointerdown', () => close());
  }

  // createMenu asks this before handling keys or clicks.
  isMenuBlocked() {
    return this.settingsPanel.blocking || this.creditsOpen;
  }
}
