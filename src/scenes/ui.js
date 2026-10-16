// Shared helpers for menu-style screens.
import { UI } from '../config/game.js';
import AudioSystem from '../systems/AudioSystem.js';
import { textStyle } from '../ui/Hud.js';
import { addPanel, setHot } from '../ui/Panels.js';

export function addScreenText(scene, title, lines = []) {
  const { width, height } = scene.scale;
  scene.add.text(width / 2, height / 2 - 60, title, textStyle(44)).setOrigin(0.5);
  scene.add
    .text(width / 2, height / 2 + 6, lines.join('\n'), textStyle(20, { color: '#f4f1ea', lineSpacing: 8 }))
    .setOrigin(0.5);
}

export function onKey(scene, keyName, callback) {
  scene.input.keyboard.once(`keydown-${keyName}`, callback);
}

// Vertical list of buttons. ↑/↓ (or W/S) to choose, ENTER/SPACE to confirm,
// or click. items: [{ label, action, keepOpen? }]. The first item starts selected.
export function createMenu(scene, x, y, items, spacing = 64) {
  const audio = new AudioSystem(scene);
  let selected = 0;
  let done = false;

  const buttons = items.map((item, i) => {
    const bg = addPanel(scene, x, y + i * spacing, 260, 50, 'plank');
    const label = scene.add
      .text(x, y + i * spacing - 2, item.label, { fontFamily: UI.font, fontSize: '23px', color: '#3b2a20', fontStyle: '800' })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => select(i));
    bg.on('pointerdown', () => confirm(i));
    return { bg, label };
  });

  // An overlay (settings, credits) takes the keys while it is open: the scene can
  // say so with isMenuBlocked(), or just have a scene.settingsPanel.
  const blocked = () => scene.isMenuBlocked?.() ?? scene.settingsPanel?.blocking;

  function select(i) {
    if (blocked()) return;
    if (selected !== -1 && i !== selected) audio.play('select');
    selected = (i + items.length) % items.length;
    buttons.forEach(({ bg, label }, j) => {
      const on = j === selected;
      setHot(bg, on);
      bg.setPanelScale(on ? 1.06 : 1);
      label.setScale(on ? 1.06 : 1);
    });
  }

  function confirm(i) {
    if (done || blocked()) return;
    if (!items[i].keepOpen) done = true; // keepOpen: e.g. Settings, which returns here
    audio.play('select');
    items[i].action();
  }

  const kb = scene.input.keyboard;
  kb.on('keydown-UP', () => select(selected - 1));
  kb.on('keydown-W', () => select(selected - 1));
  kb.on('keydown-DOWN', () => select(selected + 1));
  kb.on('keydown-S', () => select(selected + 1));
  kb.on('keydown-ENTER', () => confirm(selected));
  kb.on('keydown-SPACE', () => confirm(selected));

  selected = -1;
  select(0);
  return buttons;
}
