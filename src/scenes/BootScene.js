import { createCommonTextures } from '../art/TextureFactory.js';

// Builds shared textures and animations, then goes to the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    createCommonTextures(this);
    this.scene.start('MenuScene');
  }
}
