import { createCommonTextures } from '../art/TextureFactory.js';
import AudioSystem from '../systems/AudioSystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import { DEMO } from '../config/game.js';

// Builds shared textures and animations, then goes to the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    createCommonTextures(this);
    new AudioSystem(this); // sets up the shared audio graph, volumes and the M key
    const params = new URLSearchParams(window.location.search);
    // ?reset=1 clears all saved progress (settings are kept), then the parameter is
    // dropped from the address bar so a later refresh doesn't wipe progress again.
    if (params.get('reset') === '1') {
      SaveSystem.resetProgress();
      params.delete('reset');
      const query = params.toString();
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      } catch {
        // some embeds forbid it; the reset has still happened
      }
    }
    // Hidden demo mode for judges: ?demo=1 tops coins up so the shop can be tried.
    if (params.get('demo') === '1') {
      SaveSystem.update((d) => {
        d.coins = Math.max(d.coins, DEMO.coins);
      });
    }
    this.scene.start('MenuScene');
  }
}
