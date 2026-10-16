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
    // Hidden demo mode for judges: ?demo=1 tops coins up so the shop can be tried.
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      SaveSystem.update((d) => {
        d.coins = Math.max(d.coins, DEMO.coins);
      });
    }
    this.scene.start('MenuScene');
  }
}
