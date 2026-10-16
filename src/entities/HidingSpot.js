import { DEPTH } from '../config/game.js';
import { addActionHint } from '../ui/KeyIcons.js';
import { addArt, artSize } from '../art/Paint.js';

// A place the player can hide by pressing Down: bush, flower bed, rock overhang,
// reeds, luggage, the gap between train carriages, a leaf pile, etc. Drawn in
// front of the player so a hidden player sits "inside" it.
//
// def: { x, kind, y?, w?, h?, invisible?, tuck? }
//   x          centre; y = base (defaults to the ground at x)
//   w          width for wide spots such as reeds (the texture is tiled across it)
//   invisible  no image of its own (something else draws the cover: a train, leaves);
//              then w and h give the size
//   tuck       pull the hiding player to the centre (default: narrow, static spots)
//
// Other systems may move a spot (setPosition) or mark it `exposed` (wind gusts):
// police can see a player hiding in an exposed spot.
export default class HidingSpot {
  constructor(scene, def, groundY, seasonKey) {
    const { x, kind } = def;
    const baseY = def.y ?? groundY;
    const key = `hide-${kind}-${seasonKey}`;
    const invisible = def.invisible || !scene.textures.exists(key);
    const tex = invisible ? { width: def.w ?? 40, height: def.h ?? 50 } : artSize(scene, key);

    this.kind = kind;
    this.x = x;
    this.wide = def.w != null && !invisible;
    this.tuck = def.tuck ?? !this.wide;
    this.exposed = false;
    this.images = [];
    if (!invisible && this.wide) {
      const count = Math.max(1, Math.round(def.w / (tex.width * 0.8)));
      const step = def.w / count;
      for (let i = 0; i < count; i++) {
        const ix = x - def.w / 2 + step * (i + 0.5);
        this.images.push(addArt(scene, ix, baseY + 2, key).setOrigin(0.5, 1).setDepth(DEPTH.foreground));
      }
    } else if (!invisible) {
      this.images.push(addArt(scene, x, baseY + 2, key).setOrigin(0.5, 1).setDepth(DEPTH.foreground));
    }

    this.width = def.w ?? tex.width * 0.7;
    this.height = tex.height;
    this.bounds = new Phaser.Geom.Rectangle(0, 0, this.width, this.height + 4);

    // A key icon (no words): the player's current Hide key.
    this.prompt = addActionHint(scene, x, 0, ['hide']).setDepth(DEPTH.popup).setVisible(false);
    this.bob = 0;
    scene.tweens.add({ targets: this, bob: -5, duration: 500, yoyo: true, repeat: -1 });
    this.setPosition(x, baseY);
  }

  // Move the spot (used by spots that ride on a train).
  setPosition(x, baseY) {
    this.x = x;
    this.baseY = baseY;
    this.bounds.setPosition(x - this.width / 2, baseY - this.height);
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
    if (!visible) return;
    const px = this.wide && player ? player.x : this.x;
    this.prompt.setPosition(px, this.baseY - this.height - 16 + this.bob);
  }
}
