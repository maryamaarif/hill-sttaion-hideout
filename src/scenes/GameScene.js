import { addScreenText, onKey } from './ui.js';
import { SEASON_ORDER } from '../seasons/index.js';

// Placeholder: will build the stage from the current season config.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(data) {
    this.run = data;
    const season = SEASON_ORDER[data.seasonIndex];
    this.cameras.main.setBackgroundColor(season.colors.sky);

    addScreenText(this, season.name, [
      season.tagline,
      `Level ${data.level} · Lives ${data.lives}`,
      '',
      'N: finish season   G: game over',
    ]);

    onKey(this, 'N', () => this.finishSeason());
    onKey(this, 'G', () => this.scene.start('GameOverScene', { level: data.level }));
  }

  finishSeason() {
    const next = this.run.seasonIndex + 1;
    if (next < SEASON_ORDER.length) {
      this.scene.start('SeasonTransitionScene', { ...this.run, seasonIndex: next });
    } else {
      const elapsedSeconds = (this.time.now - this.run.startTime) / 1000;
      this.scene.start('LevelCompleteScene', { ...this.run, elapsedSeconds });
    }
  }
}
