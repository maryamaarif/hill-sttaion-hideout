import { DEPTH } from '../config/game.js';

const WIDTH = 40;
const HEIGHT = 6;
const GAP = 10;

const METERS = {
  stamina: { icon: 0xffc12e, fill: 0xffa21f, low: 0xff5a3a },
  breath: { icon: 0xbfeaff, fill: 0x4fb6ff, low: 0xff5a3a },
};

// Small bars that float above the player's head: stamina (sun) and breath (bubble).
// Each only shows while it matters, so Spring's HUD stays clean.
export default class PlayerMeters {
  constructor(scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.popup);
  }

  // bars: [{ kind: 'stamina' | 'breath', value: 0..1, show: bool }]
  update(player, bars) {
    this.g.clear();
    if (!player.visible) return;
    let y = player.body.top - 14;
    for (const { kind, value, show } of bars) {
      if (!show) continue;
      const c = METERS[kind];
      const x = player.x - WIDTH / 2 + 6;
      this.g.fillStyle(0x3b2a20, 0.85).fillRoundedRect(x - 2, y - 2, WIDTH + 4, HEIGHT + 4, 3);
      this.g.fillStyle(value < 0.3 ? c.low : c.fill).fillRect(x, y, WIDTH * value, HEIGHT);
      // Icon: a little sun or a bubble.
      this.g.fillStyle(0x3b2a20).fillCircle(x - 9, y + HEIGHT / 2, 6);
      if (kind === 'stamina') this.g.fillStyle(c.icon).fillCircle(x - 9, y + HEIGHT / 2, 4);
      else this.g.lineStyle(2, c.icon).strokeCircle(x - 9, y + HEIGHT / 2, 3.5);
      y -= GAP + HEIGHT;
    }
  }
}
