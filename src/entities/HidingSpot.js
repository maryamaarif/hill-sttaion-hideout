import { DEPTH, UI } from '../config/game.js';

// A place the player can hide by pressing Down: bush, flower bed, rock overhang,
// reeds, carriage, snow hut, etc. Drawn in front of the player so a hidden player
// sits "inside" it.
//
// def: { x, kind, y?, w? }
//   x   centre; y = base (defaults to the layout's ground); w = width for wide
//       spots such as reeds (the texture is tiled across it)
export default class HidingSpot {
  constructor(scene, def, groundY, seasonKey) {
    const { x, kind } = def;
    const baseY = def.y ?? groundY;
    const key = `hide-${kind}-${seasonKey}`;
    const tex = scene.textures.get(key).getSourceImage();

    this.kind = kind;
    this.x = x;
    this.wide = def.w != null;
    this.images = [];
    if (this.wide) {
      const count = Math.max(1, Math.round(def.w / (tex.width * 0.8)));
      const step = def.w / count;
      for (let i = 0; i < count; i++) {
        const ix = x - def.w / 2 + step * (i + 0.5);
        this.images.push(scene.add.image(ix, baseY + 2, key).setOrigin(0.5, 1).setDepth(DEPTH.foreground));
      }
    } else {
      this.images.push(scene.add.image(x, baseY + 2, key).setOrigin(0.5, 1).setDepth(DEPTH.foreground));
    }

    const w = def.w ?? tex.width * 0.7;
    this.bounds = new Phaser.Geom.Rectangle(x - w / 2, baseY - tex.height, w, tex.height + 4);

    this.prompt = scene.add
      .text(x, baseY - tex.height - 16, '↓ hide', {
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
    this.images.forEach((img) => img.setAlpha(occupied ? 0.75 : 1));
  }

  // For wide spots the prompt follows the player along the spot.
  setPrompt(visible, player) {
    this.prompt.setVisible(visible);
    if (visible && this.wide && player) this.prompt.setX(player.x);
  }
}
