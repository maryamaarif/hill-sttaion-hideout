import { addScreenText, onKey } from './ui.js';
import { newLevelRun } from '../systems/RunState.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(data = {}) {
    const level = data.level ?? 1;
    addScreenText(this, 'Hill Station Hideout', [
      'Stay out of sight through four seasons.',
      '',
      `Level ${level}`,
      'Press ENTER to start',
    ]);
    onKey(this, 'ENTER', () => {
      this.scene.start('GameScene', newLevelRun(level, this.time.now));
    });
  }
}
