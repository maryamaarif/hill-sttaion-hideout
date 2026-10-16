import { UI } from '../config/game.js';
import { INK } from '../art/TextureFactory.js';
import Settings from '../systems/Settings.js';
import { addPanel, setHot } from './Panels.js';

// Small keyboard-key icons ("keycaps") used instead of written instructions.
// They always show the player's current key for an action (controls can be remapped).

const GLYPHS = { LEFT: '←', RIGHT: '→', UP: '↑', DOWN: '↓', SPACE: 'Space' };

export function keyLabel(name) {
  return GLYPHS[name] ?? name;
}

export function primaryKey(action) {
  return Settings.current.controls[action]?.[0] ?? '?';
}

// One keycap; returns a container centred on (x, y).
export function addKeycap(scene, x, y, name) {
  const label = keyLabel(name);
  const w = Math.max(30, label.length * 11 + 16);
  const c = scene.add.container(x, y);
  c.add(addPanel(scene, 0, 1, w + 2, 32, 'key'));
  c.add(scene.add.text(0, -1, label, { fontFamily: UI.font, fontSize: '16px', color: '#3b2a20', fontStyle: 'bold' }).setOrigin(0.5));
  c.setSize(w, 28);
  return c;
}

// Keycaps for one or more actions side by side (e.g. ['left', 'right']).
export function addActionHint(scene, x, y, actions) {
  const c = scene.add.container(x, y);
  const caps = actions.map((a) => addKeycap(scene, 0, 0, primaryKey(a)));
  const gap = 6;
  const total = caps.reduce((sum, k) => sum + k.width, 0) + gap * (caps.length - 1);
  let cx = -total / 2;
  for (const k of caps) {
    k.setPosition(cx + k.width / 2, 0);
    cx += k.width + gap;
    c.add(k);
  }
  return c;
}
