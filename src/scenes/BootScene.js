// Loads assets, then goes to the menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {}

  create() {
    this.scene.start('MenuScene');
  }
}
