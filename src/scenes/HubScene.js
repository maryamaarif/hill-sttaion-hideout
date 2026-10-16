import { textStyle } from '../ui/Hud.js';
import { UI } from '../config/game.js';
import { ROOM_UPGRADES, ITEMS, HIDING_PLACES } from '../config/shop.js';
import { drawRoom } from '../art/Room.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';
import { newLevelRunFromSave } from '../systems/RunState.js';
import SettingsPanel from '../ui/SettingsPanel.js';

const ROOM_AREA = { x: 16, y: 58, w: 560, h: 466 };
const PANEL = { x: 592, y: 58, w: 352, h: 420 };
const ROW_H = 46;

const TABS = [
  { label: 'Room', list: 'upgrades', entries: ROOM_UPGRADES, owned: 'In your room' },
  { label: 'Items', list: 'items', entries: ITEMS, owned: 'Packed for next level' },
  { label: 'Hiding', list: 'hidingPlaces', entries: HIDING_PLACES, owned: 'Unlocked' },
];

// The player's room at the guest house, between levels. The room changes as
// upgrades are bought; the shop sells room upgrades, items for the next level and
// extra hiding places. "Next level" starts the next level with everything bought.
//
// Keys: ← → tabs, ↑ ↓ choose, ENTER buy, N next level, ESC menu (M mutes anywhere).
export default class HubScene extends Phaser.Scene {
  constructor() {
    super('HubScene');
  }

  create(data = {}) {
    const { width: W } = this.scale;
    this.audio = new AudioSystem(this);
    this.save = SaveSystem.load();
    this.level = data.level ?? this.save.highestLevel;
    this.tab = 0;
    this.row = 0;
    this.cameras.main.setBackgroundColor(UI.screenBg);
    this.audio.playMusic('room');
    this.settingsPanel = new SettingsPanel(this);
    this.cameras.main.fadeIn(400);

    this.add.text(16, 14, 'Your room at the guest house', textStyle(26)).setOrigin(0, 0);
    this.coinText = this.add.text(W - 16, 28, '', textStyle(24, { color: '#ffd54f' })).setOrigin(1, 0.5);
    this.coinIcon = this.add.image(0, 28, 'coin').setScale(1.2);

    this.room = null;
    this.drawRoom();
    this.buildPanel();
    this.buildButtons();
    this.refresh();

    // Keys are ignored while the settings overlay is open.
    const kb = this.input.keyboard;
    const on = (key, fn) => kb.on(`keydown-${key}`, () => !this.settingsPanel.blocking && fn());
    on('LEFT', () => this.setTab(this.tab - 1));
    on('RIGHT', () => this.setTab(this.tab + 1));
    on('UP', () => this.setRow(this.row - 1));
    on('DOWN', () => this.setRow(this.row + 1));
    on('ENTER', () => this.buy());
    on('N', () => this.nextLevel());
    on('ESC', () => this.scene.start('MenuScene'));
  }

  drawRoom() {
    this.room?.destroy();
    this.room = drawRoom(this, ROOM_AREA, this.save.upgrades);
    this.room.setDepth(-1);
  }

  // ----- shop panel -----

  buildPanel() {
    const { x, y, w, h } = PANEL;
    this.add.rectangle(x, y, w, h, 0xfff4e6).setOrigin(0).setStrokeStyle(4, 0x3b2a20);
    const tabW = w / TABS.length;
    this.tabButtons = TABS.map((t, i) => {
      const bg = this.add.rectangle(x + i * tabW, y, tabW, 40, 0xe8d3b0).setOrigin(0).setStrokeStyle(3, 0x3b2a20);
      const label = this.add.text(x + i * tabW + tabW / 2, y + 20, t.label, this.ink(18, true)).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setTab(i));
      return { bg, label };
    });
    this.rows = [];
    for (let i = 0; i < 6; i++) {
      const ry = y + 52 + i * ROW_H;
      const bg = this.add.rectangle(x + 8, ry, w - 16, ROW_H - 6, 0xffffff, 0).setOrigin(0);
      const icon = this.add.text(x + 30, ry + 20, '', { fontSize: '22px' }).setOrigin(0.5);
      const name = this.add.text(x + 52, ry + 20, '', this.ink(16)).setOrigin(0, 0.5);
      const price = this.add.text(x + w - 18, ry + 20, '', this.ink(15, true)).setOrigin(1, 0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => (this.row === i ? this.buy() : this.setRow(i)));
      this.rows.push({ bg, icon, name, price });
    }
    this.desc = this.add
      .text(x + 16, y + h - 92, '', { ...this.ink(14), wordWrap: { width: w - 32 } })
      .setOrigin(0, 0);
    this.hint = this.add.text(x + w / 2, y + h - 18, '', this.ink(13)).setOrigin(0.5);
  }

  ink(size, bold = false) {
    return { fontFamily: UI.font, fontSize: `${size}px`, color: '#3b2a20', fontStyle: bold ? 'bold' : 'normal' };
  }

  buildButtons() {
    const y = 506;
    const make = (x, w, label, action, primary = false) => {
      const bg = this.add.rectangle(x, y, w, 40, primary ? 0xffd54f : 0xfff4e6).setStrokeStyle(4, 0x3b2a20);
      const text = this.add.text(x, y, label, this.ink(primary ? 19 : 16, primary)).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', action);
      return text;
    };
    make(PANEL.x + 56, 104, 'Menu (Esc)', () => this.scene.start('MenuScene'));
    make(PANEL.x + 172, 116, 'Settings', () => this.settingsPanel.open());
    make(PANEL.x + 290, 124, `Level ${this.level} ▶ (N)`, () => this.nextLevel(), true);
  }

  setTab(i) {
    this.tab = (i + TABS.length) % TABS.length;
    this.row = 0;
    this.audio.play('select');
    this.refresh();
  }

  setRow(i) {
    const n = TABS[this.tab].entries.length;
    this.row = (i + n) % n;
    this.refresh();
  }

  refresh() {
    const { width: W } = this.scale;
    const tab = TABS[this.tab];
    const owned = this.save[tab.list];
    this.coinText.setText(String(this.save.coins));
    this.coinIcon.setX(W - 16 - this.coinText.width - 18);

    this.tabButtons.forEach(({ bg }, i) => bg.setFillStyle(i === this.tab ? 0xffd54f : 0xe8d3b0));
    this.rows.forEach((r, i) => {
      const e = tab.entries[i];
      const visible = Boolean(e);
      [r.bg, r.icon, r.name, r.price].forEach((o) => o.setVisible(visible));
      if (!e) return;
      const have = owned.includes(e.key);
      const afford = this.save.coins >= e.cost;
      r.icon.setText(e.icon);
      r.name.setText(e.name);
      r.price.setText(have ? '✔' : `${e.cost}`).setColor(have ? '#2f8a3a' : afford ? '#3b2a20' : '#b04040');
      r.bg.setFillStyle(i === this.row ? 0xffd54f : 0xffffff, i === this.row ? 0.9 : 0);
    });

    const e = tab.entries[this.row];
    const have = owned.includes(e.key);
    this.desc.setText(`${e.desc}${have ? `\n${tab.owned}.` : ''}`);
    this.hint.setText(have ? '← → tabs   ↑ ↓ choose' : `ENTER to buy for ${e.cost} coins   ← → tabs`);
  }

  buy() {
    const tab = TABS[this.tab];
    const e = tab.entries[this.row];
    if (!SaveSystem.buy(tab.list, e.key, e.cost)) {
      this.audio.play('bonk');
      const r = this.rows[this.row];
      this.tweens.add({ targets: [r.name, r.price], x: '+=6', duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    this.save = SaveSystem.load();
    this.audio.play('chime');
    if (tab.list === 'upgrades') {
      this.drawRoom();
      this.cameras.main.flash(250, 255, 230, 180);
    }
    this.refresh();
  }

  nextLevel() {
    this.scene.start('GameScene', newLevelRunFromSave(this.level, this.time.now));
  }
}
