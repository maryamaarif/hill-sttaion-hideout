import { addScreenText, onKey } from './ui.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    addScreenText(this, 'Caught!', ['The police found you.', '', 'Press ENTER to try again']);
    onKey(this, 'ENTER', () => this.scene.start('MenuScene', { level: data.level }));
  }
}
