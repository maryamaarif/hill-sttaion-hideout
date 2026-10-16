// Shared helpers for menu-style screens.
import { UI } from '../config/game.js';
import AudioSystem from '../systems/AudioSystem.js';

export function addScreenText(scene, title, lines = []) {
  const { width, height } = scene.scale;
  scene.add
    .text(width / 2, height / 2 - 60, title, { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff' })
    .setOrigin(0.5);
  scene.add
    .text(width / 2, height / 2 + 20, lines.join('\n'), {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#dddddd',
      align: 'center',
      lineSpacing: 8,
    })
    .setOrigin(0.5);
}

export function onKey(scene, keyName, callback) {
  scene.input.keyboard.once(`keydown-${keyName}`, callback);
}

// Vertical list of buttons. ↑/↓ (or W/S) to choose, ENTER/SPACE to confirm,
// or click. items: [{ label, action }]. The first item starts selected.
export function createMenu(scene, x, y, items, spacing = 64) {
  const audio = new AudioSystem(scene);
  let selected = 0;
  let done = false;

  const buttons = items.map((item, i) => {
    const bg = scene.add.rectangle(x, y + i * spacing, 260, 48, 0xfff4e6).setStrokeStyle(4, 0x3b2a20);
    const label = scene.add
      .text(x, y + i * spacing, item.label, { fontFamily: UI.font, fontSize: '24px', color: '#3b2a20' })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => select(i));
    bg.on('pointerdown', () => confirm(i));
    return { bg, label };
  });

  function select(i) {
    if (selected !== -1 && i !== selected) audio.play('select');
    selected = (i + items.length) % items.length;
    buttons.forEach(({ bg, label }, j) => {
      const on = j === selected;
      bg.setFillStyle(on ? 0xffd54f : 0xfff4e6);
      bg.setScale(on ? 1.06 : 1);
      label.setScale(on ? 1.06 : 1);
    });
  }

  function confirm(i) {
    if (done) return;
    done = true;
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
