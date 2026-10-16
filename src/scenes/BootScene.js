import { createCommonTextures } from '../art/TextureFactory.js';
import AudioSystem from '../systems/AudioSystem.js';

// Builds shared textures and animations, then goes to the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    createCommonTextures(this);
    new AudioSystem(this); // sets up the shared audio graph, volumes and the M key
    this.scene.start('MenuScene');
  }
}
