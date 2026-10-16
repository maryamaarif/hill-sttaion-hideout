import { DEPTH, UI } from '../config/game.js';
import { INK } from '../art/TextureFactory.js';
import { textStyle } from './Hud.js';
import { addKeycap } from './KeyIcons.js';
import { audio } from '../systems/AudioSystem.js';
import Settings, { ACTION_LABELS, RESERVED_KEYS } from '../systems/Settings.js';
import { addPanel, setHot } from './Panels.js';

const W = 480;
const ROW = 40;
const TRACK = 200;

// Settings overlay usable in any scene. Two pages:
//   main      music / sound-effect volume, mute (M), screen shake, colour-blind mode,
//             Easy mode, Controls ›, Done
//   controls  remap each action (ENTER, then press a key), reset, back
// ↑ ↓ choose, ← → adjust, ENTER toggle/select, ESC back/close. Everything clickable.
export default class SettingsPanel {
  constructor(scene, { title = 'Settings', onClose = null } = {}) {
    this.scene = scene;
    this.title = title;
    this.onClose = onClose;
    this.isOpen = false;
    this.closedAt = -Infinity;
    this.objects = [];
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
    this.page = 'main';
    this.selected = 0;
    this.waiting = null; // action waiting for a new key
    this.keyHandler = (e) => this.onKey(e);
    this.scene.input.keyboard.on('keydown', this.keyHandler);
    this.refreshHandler = () => this.refresh();
    this.scene.events.on('update', this.refreshHandler); // M may toggle mute while open
    this.build();
  }

  rowsFor(page) {
    const toggle = (label, key, hint) => ({
      kind: 'toggle',
      label,
      hint,
      get: () => Settings.current[key],
      set: () =>
        Settings.update((st) => {
          st[key] = !st[key];
        }),
    });
    if (page === 'controls') {
      return [
        ...Object.keys(Settings.current.controls).map((action) => ({ kind: 'bind', label: ACTION_LABELS[action], action })),
        { kind: 'button', label: 'Reset controls', run: () => (Settings.resetControls(), this.build()) },
        { kind: 'button', label: '‹ Back', run: () => this.showPage('main') },
      ];
    }
    return [
      { kind: 'slider', label: 'Music', key: 'music' },
      { kind: 'slider', label: 'Sound effects', key: 'sfx' },
      { kind: 'toggle', label: 'Mute (M)', get: () => Settings.current.muted, set: () => audio.toggleMute() },
      toggle('Screen shake', 'shake'),
      toggle('Colour-blind mode', 'colorBlind', 'Patterns on vision cones and hazards'),
      toggle('Easy mode', 'easy', 'Slower detection; +1 life from the next level'),
      { kind: 'button', label: 'Controls ›', run: () => this.showPage('controls') },
      { kind: 'button', label: 'Done', run: () => this.close() },
    ];
  }

  showPage(page) {
    this.page = page;
    this.selected = 0;
    this.waiting = null;
    this.build();
  }

  ink(size, bold = false) {
    return { fontFamily: UI.font, fontSize: `${size}px`, color: '#3b2a20', fontStyle: bold ? 'bold' : 'normal' };
  }

  build() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    if (!this.isOpen) return;
    const scene = this.scene;
    const { width: SW, height: SH } = scene.scale;
    this.rows = this.rowsFor(this.page);
    const H = 96 + this.rows.length * ROW;
    const cx = SW / 2;
    const top = SH / 2 - H / 2;
    const add = (o) => {
      this.objects.push(o.setScrollFactor(0).setDepth(DEPTH.hud + 10));
      return o;
    };

    add(scene.add.rectangle(0, 0, SW, SH, 0x1d2b3a, 0.6).setOrigin(0).setInteractive());
    add(addPanel(scene, cx, SH / 2, W, H, 'paper'));
    add(scene.add.text(cx, top + 28, this.page === 'controls' ? 'Controls' : this.title, textStyle(26)).setOrigin(0.5));
    this.hint = add(scene.add.text(cx, top + H - 20, '', this.ink(13)).setOrigin(0.5));

    const left = cx - W / 2 + 26;
    const right = cx + W / 2 - 26;
    this.rows.forEach((row, i) => {
      const y = top + 66 + i * ROW;
      row.y = y;
      row.bg = add(scene.add.rectangle(cx, y, W - 24, ROW - 4, 0xffd54f, 0));
      row.bg.setInteractive({ useHandCursor: true }).on('pointerover', () => this.select(i));
      if (row.kind === 'button') {
        add(scene.add.text(cx, y, row.label, this.ink(18, true)).setOrigin(0.5));
        row.bg.on('pointerdown', () => this.activate(i));
        return;
      }
      add(scene.add.text(left, y, row.label, this.ink(17)).setOrigin(0, 0.5));
      if (row.kind === 'slider') {
        const x0 = right - TRACK - 52;
        row.x0 = x0;
        add(scene.add.rectangle(x0, y, TRACK, 8, 0xe8d3b0).setOrigin(0, 0.5).setStrokeStyle(2, INK));
        row.fill = add(scene.add.rectangle(x0, y, 0, 8, 0xd94f4a).setOrigin(0, 0.5));
        row.knob = add(scene.add.circle(x0, y, 10, 0xffd54f).setStrokeStyle(3, INK));
        row.value = add(scene.add.text(right, y, '', this.ink(14)).setOrigin(1, 0.5));
        const hit = add(scene.add.rectangle(x0 - 12, y, TRACK + 24, 32, 0xffffff, 0).setOrigin(0, 0.5));
        hit.setInteractive({ useHandCursor: true, draggable: true });
        const fromPointer = (p) => this.setVolume(row, (p.x - x0) / TRACK);
        hit.on('pointerdown', fromPointer);
        hit.on('drag', fromPointer);
      } else if (row.kind === 'toggle') {
        row.box = add(scene.add.rectangle(right - 32, y, 64, 26, 0xffffff).setStrokeStyle(3, INK));
        row.state = add(scene.add.text(right - 32, y, '', this.ink(14, true)).setOrigin(0.5));
        row.bg.on('pointerdown', () => this.activate(i));
      } else if (row.kind === 'bind') {
        const name = this.waiting === row.action ? '…' : Settings.current.controls[row.action][0] ?? '?';
        add(addKeycap(scene, right - 50, y, name));
        row.bg.on('pointerdown', () => this.activate(i));
      }
    });
    this.refresh();
  }

  select(i) {
    if (this.waiting) return;
    this.selected = (i + this.rows.length) % this.rows.length;
    this.refresh();
  }

  activate(i) {
    this.selected = i;
    const row = this.rows[i];
    audio.play('select');
    if (row.kind === 'toggle') {
      row.set();
      this.refresh();
    } else if (row.kind === 'button') {
      row.run();
    } else if (row.kind === 'bind') {
      this.waiting = row.action;
      this.build();
    }
  }

  onKey(e) {
    // Ignore the key press that opened the panel (Phaser also sends it to the
    // generic keydown listener added during that same press).
    if (performance.now() - this.openedAt < 100) return;

    if (this.waiting) {
      // Remapping: the next key becomes the action's main key.
      if (e.code !== 'Escape') {
        const codes = Phaser.Input.Keyboard.KeyCodes;
        const name = Object.keys(codes).find((k) => codes[k] === e.keyCode);
        if (!name || RESERVED_KEYS.includes(name)) {
          this.message = `${name ?? 'That key'} is used by the menus`;
          this.refresh();
          return;
        }
        Settings.bind(this.waiting, name);
      }
      this.waiting = null;
      this.build();
      return;
    }

    const row = this.rows[this.selected];
    switch (e.code) {
      case 'ArrowUp':
        this.select(this.selected - 1);
        break;
      case 'ArrowDown':
        this.select(this.selected + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        if (row.kind === 'slider') this.setVolume(row, this.volume(row) + (e.code === 'ArrowLeft' ? -0.1 : 0.1));
        break;
      case 'Enter':
      case 'Space':
        this.activate(this.selected);
        break;
      case 'Escape':
        if (this.page === 'controls') this.showPage('main');
        else this.close();
        break;
      default:
        break;
    }
  }

  volume(row) {
    return row.key === 'music' ? Settings.current.musicVolume : Settings.current.sfxVolume;
  }

  setVolume(row, v) {
    audio.setVolume(row.key, v);
    if (row.key === 'sfx') audio.play('select');
    this.refresh();
  }

  // Cheap per-frame update of values (no objects created here).
  refresh() {
    if (!this.isOpen || !this.rows) return;
    this.rows.forEach((row, i) => {
      row.bg.setFillStyle(0xffd54f, i === this.selected ? 0.85 : 0);
      if (row.kind === 'slider') {
        const v = this.volume(row);
        row.fill.width = TRACK * v;
        row.knob.x = row.x0 + TRACK * v;
        row.value.setText(`${Math.round(v * 100)}%`);
      } else if (row.kind === 'toggle') {
        const on = row.get();
        row.box.setFillStyle(on ? 0x82c86f : 0xe8d3b0);
        row.state.setText(on ? 'ON' : 'OFF');
      }
    });
    const row = this.rows[this.selected];
    let hint = row?.hint ?? (this.page === 'controls' ? 'ENTER, then press a key   ESC back' : '↑ ↓ choose   ← → adjust   ENTER select');
    if (this.waiting) hint = this.message ?? 'Press a key (ESC to cancel)';
    this.hint.setText(hint);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.closedAt = performance.now();
    this.message = null;
    this.scene.input.keyboard.off('keydown', this.keyHandler);
    this.scene.events.off('update', this.refreshHandler);
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    this.onClose?.();
  }
}
