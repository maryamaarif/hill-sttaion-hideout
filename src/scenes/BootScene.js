import { createCommonTextures } from '../art/TextureFactory.js';
import SaveSystem from '../systems/SaveSystem.js';

// Builds shared textures and animations, then goes to the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    createCommonTextures(this);
    this.sound.mute = SaveSystem.load().settings.muted;
    this.scene.start('MenuScene');
  }
}
