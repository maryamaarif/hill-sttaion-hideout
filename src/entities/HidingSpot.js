import { DEPTH, UI } from '../config/game.js';

// A place the player can hide by holding Down: bush, carriage, snow hut, etc.
// Drawn in front of the player so a hidden player sits "inside" it.
export default class HidingSpot {
  constructor(scene, x, groundY, kind, seasonKey) {
    this.kind = kind;
    this.image = scene.add
      .image(x, groundY + 2, `hide-${kind}-${seasonKey}`)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.foreground);

    const w = this.image.width * 0.7;
    this.bounds = new Phaser.Geom.Rectangle(x - w / 2, groundY - this.image.height, w, this.image.height + 4);

    this.prompt = scene.add
      .text(x, groundY - this.image.height - 16, '↓ hide', {
        fontFamily: UI.font,
        fontSize: '16px',
        color: UI.textColor,
        stroke: UI.strokeColor,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.popup)
      .setVisible(false);
    scene.tweens.add({ targets: this.prompt, y: this.prompt.y - 5, duration: 500, yoyo: true, repeat: -1 });
  }

  contains(player) {
    return this.bounds.contains(player.x, player.body.bottom - 4);
  }

  // Fade the cover a little so the player can still see where they are.
  setOccupied(occupied) {
    this.image.setAlpha(occupied ? 0.75 : 1);
  }

  setPrompt(visible) {
    this.prompt.setVisible(visible);
  }
}
