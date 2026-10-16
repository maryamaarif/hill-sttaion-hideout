import { DEPTH, UI } from '../config/game.js';
import { INK } from '../art/TextureFactory.js';
import { textStyle } from './Hud.js';
import { audio } from '../systems/AudioSystem.js';
import SaveSystem from '../systems/SaveSystem.js';

const W = 440;
const H = 270;
const TRACK = 220;

// Settings overlay usable in any scene: music and sound-effect volume sliders and
// a mute toggle (M also mutes anywhere). ↑ ↓ choose, ← → adjust, ENTER toggle/close,
// ESC close. Sliders can be clicked or dragged.
export default class SettingsPanel {
  constructor(scene, { title = 'Settings', onClose = null } = {}) {
    this.scene = scene;
    this.title = title;
    this.onClose = onClose;
    this.isOpen = false;
    this.closedAt = -Infinity;
  }

  // True while open and for a moment after closing, so the key that closed the
  // panel (e.g. ESC) is not also handled by the scene underneath.
  get blocking() {
    return this.isOpen || performance.now() - this.closedAt < 150;
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.openedAt = performance.now();
    const scene = this.scene;
    const { width: SW, height: SH } = scene.scale;
    const cx = SW / 2;
    const top = SH / 2 - H / 2;
    const fixed = (o) => o.setScrollFactor(0).setDepth(DEPTH.hud + 10);
    this.objects = [];
    const add = (o) => {
      this.objects.push(fixed(o));
      return o;
    };

    add(scene.add.rectangle(0, 0, SW, SH, 0x1d2b3a, 0.6).setOrigin(0).setInteractive());
    add(scene.add.rectangle(cx, SH / 2, W, H, 0xfff4e6).setStrokeStyle(4, INK));
    add(scene.add.text(cx, top + 30, this.title, textStyle(26)).setOrigin(0.5));

    this.rows = [
      { kind: 'slider', label: 'Music', key: 'music' },
      { kind: 'slider', label: 'Sound effects', key: 'sfx' },
      { kind: 'toggle', label: 'Mute (M)' },
      { kind: 'button', label: 'Done' },
    ];
    this.rows.forEach((row, i) => {
      const y = top + 80 + i * 46;
      row.y = y;
      row.bg = add(scene.add.rectangle(cx, y, W - 30, 40, 0xffd54f, 0));
      if (row.kind === 'button') {
        row.text = add(scene.add.text(cx, y, row.label, this.ink(20, true)).setOrigin(0.5));
        row.bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
        return;
      }
      row.text = add(scene.add.text(cx - W / 2 + 28, y, row.label, this.ink(18)).setOrigin(0, 0.5));
      if (row.kind === 'slider') {
        const x0 = cx - 54;
        row.x0 = x0;
        add(scene.add.rectangle(x0, y, TRACK, 8, 0xe8d3b0).setOrigin(0, 0.5).setStrokeStyle(2, INK));
        row.fill = add(scene.add.rectangle(x0, y, 0, 8, 0xd94f4a).setOrigin(0, 0.5));
        row.knob = add(scene.add.circle(x0, y, 11, 0xffd54f).setStrokeStyle(3, INK));
        row.value = add(scene.add.text(x0 + TRACK + 14, y, '', this.ink(15)).setOrigin(0, 0.5));
        const hit = add(scene.add.rectangle(x0 - 12, y, TRACK + 24, 34, 0xffffff, 0).setOrigin(0, 0.5));
        hit.setInteractive({ useHandCursor: true, draggable: true });
        const setFromPointer = (p) => this.setVolume(row, (p.x - x0) / TRACK);
        hit.on('pointerdown', setFromPointer);
        hit.on('drag', setFromPointer);
      } else {
        row.box = add(scene.add.rectangle(cx + 80, y, 64, 28, 0xffffff).setStrokeStyle(3, INK));
        row.state = add(scene.add.text(cx + 80, y, '', this.ink(15, true)).setOrigin(0.5));
        row.box.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleMute());
      }
    });

    this.selected = 0;
    this.keyHandler = (e) => this.onKey(e);
    scene.input.keyboard.on('keydown', this.keyHandler);
    this.refreshHandler = () => this.refresh();
    scene.events.on('update', this.refreshHandler); // M may toggle mute while open
    this.refresh();
  }

  ink(size, bold = false) {
    return { fontFamily: UI.font, fontSize: `${size}px`, color: '#3b2a20', fontStyle: bold ? 'bold' : 'normal' };
  }

  onKey(e) {
    // Ignore the key press that opened the panel (Phaser also sends it to the
    // generic keydown listener added during that same press).
    if (performance.now() - this.openedAt < 100) return;
    const row = this.rows[this.selected];
    switch (e.code) {
      case 'ArrowUp':
        this.selected = (this.selected + this.rows.length - 1) % this.rows.length;
        break;
      case 'ArrowDown':
        this.selected = (this.selected + 1) % this.rows.length;
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        if (row.kind === 'slider') this.setVolume(row, this.volume(row) + (e.code === 'ArrowLeft' ? -0.1 : 0.1));
        break;
      case 'Enter':
      case 'Space':
        if (row.kind === 'toggle') this.toggleMute();
        if (row.kind === 'button') this.close();
        break;
      case 'Escape':
        this.close();
        break;
      default:
        return;
    }
    this.refresh();
  }

  volume(row) {
    const s = SaveSystem.load().settings;
    return row.key === 'music' ? s.musicVolume : s.sfxVolume;
  }

  setVolume(row, v) {
    audio.setVolume(row.key, v);
    if (row.key === 'sfx') audio.play('select');
    this.refresh();
  }

  toggleMute() {
    audio.toggleMute();
    this.refresh();
  }

  refresh() {
    if (!this.isOpen) return;
    const muted = SaveSystem.load().settings.muted;
    this.rows.forEach((row, i) => {
      row.bg.setFillStyle(0xffd54f, i === this.selected ? 0.85 : 0);
      if (row.kind === 'slider') {
        const v = this.volume(row);
        row.fill.width = TRACK * v;
        row.knob.x = row.x0 + TRACK * v;
        row.value.setText(`${Math.round(v * 100)}%`);
      } else if (row.kind === 'toggle') {
        row.box.setFillStyle(muted ? 0xd94f4a : 0x82c86f);
        row.state.setText(muted ? 'ON' : 'OFF').setColor(muted ? '#ffffff' : '#3b2a20');
      }
    });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.closedAt = performance.now();
    this.scene.input.keyboard.off('keydown', this.keyHandler);
    this.scene.events.off('update', this.refreshHandler);
    this.objects.forEach((o) => o.destroy());
    this.onClose?.();
  }
}
