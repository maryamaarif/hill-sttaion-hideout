import { DEPTH, UI } from '../config/game.js';
import { INK } from '../art/TextureFactory.js';
import { textStyle } from './Hud.js';
import SettingsPanel from './SettingsPanel.js';
import { audio } from '../systems/AudioSystem.js';

// In-game pause menu (ESC or P): Resume, Restart season, Settings, Quit to menu.
// ↑ ↓ choose, ENTER select, ESC / P resume. Settings opens on top and returns here.
export default class PauseMenu {
  constructor(scene, { onResume, onRestart, onQuit }) {
    this.scene = scene;
    this.actions = [
      { label: 'Resume', run: () => this.close(true) },
      { label: 'Restart season', run: onRestart },
      { label: 'Settings', run: () => this.openSettings() },
      { label: 'Quit to menu', run: onQuit },
    ];
    this.onResume = onResume;
    this.isOpen = false;
    this.settings = new SettingsPanel(scene, { onClose: () => this.build() });
    this.objects = [];
  }

  // True while the menu or its settings page is up (or just closed).
  get blocking() {
    return this.isOpen || this.settings.blocking;
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.selected = 0;
    this.openedAt = performance.now();
    this.keyHandler = (e) => this.onKey(e);
    this.scene.input.keyboard.on('keydown', this.keyHandler);
    this.build();
  }

  build() {
    this.clear();
    if (!this.isOpen) return;
    const { scene } = this;
    const { width: W, height: H } = scene.scale;
    const fixed = (o) => {
      this.objects.push(o.setScrollFactor(0).setDepth(DEPTH.hud + 8));
      return o;
    };
    fixed(scene.add.rectangle(0, 0, W, H, 0x1d2b3a, 0.6).setOrigin(0).setInteractive());
    fixed(scene.add.rectangle(W / 2, H / 2, 320, 300, 0xfff4e6).setStrokeStyle(4, INK));
    fixed(scene.add.text(W / 2, H / 2 - 112, 'Paused', textStyle(30)).setOrigin(0.5));
    this.buttons = this.actions.map((a, i) => {
      const y = H / 2 - 50 + i * 52;
      const bg = fixed(scene.add.rectangle(W / 2, y, 240, 42, 0xfff4e6).setStrokeStyle(3, INK));
      fixed(scene.add.text(W / 2, y, a.label, { fontFamily: UI.font, fontSize: '19px', color: '#3b2a20' }).setOrigin(0.5));
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => this.select(i));
      bg.on('pointerdown', () => this.choose(i));
      return bg;
    });
    this.select(this.selected);
  }

  clear() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    this.buttons = [];
  }

  select(i) {
    this.selected = (i + this.actions.length) % this.actions.length;
    this.buttons.forEach((b, j) => b.setFillStyle(j === this.selected ? 0xffd54f : 0xfff4e6));
  }

  choose(i) {
    audio.play('select');
    this.actions[i].run();
  }

  onKey(e) {
    if (this.settings.blocking || performance.now() - this.openedAt < 100) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.select(this.selected - 1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.select(this.selected + 1);
    else if (e.code === 'Enter' || e.code === 'Space') this.choose(this.selected);
    else if (e.code === 'Escape' || e.code === 'KeyP') this.close(true);
  }

  openSettings() {
    this.clear(); // settings draws its own panel; this menu returns when it closes
    this.settings.open();
  }

  close(resume) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.closedAt = performance.now();
    this.scene.input.keyboard.off('keydown', this.keyHandler);
    this.clear();
    if (resume) this.onResume?.();
  }
}
