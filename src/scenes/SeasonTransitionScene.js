import { addScreenText, onKey } from './ui.js';
import { SEASON_ORDER } from '../seasons/index.js';

export default class SeasonTransitionScene extends Phaser.Scene {
  constructor() {
    super('SeasonTransitionScene');
  }

  create(data) {
    const season = SEASON_ORDER[data.seasonIndex];
    addScreenText(this, `Next: ${season.name}`, [
      season.tagline,
      `Lives carried over: ${data.lives}`,
      '',
      'Press ENTER to continue',
    ]);
    onKey(this, 'ENTER', () => this.scene.start('GameScene', data));
  }
}
