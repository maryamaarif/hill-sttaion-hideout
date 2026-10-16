import { onKey } from './ui.js';
import { createHearts, textStyle } from '../ui/Hud.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { UI } from '../config/game.js';

// Between seasons. Lives carry forward: data.lives is passed on unchanged.
export default class SeasonTransitionScene extends Phaser.Scene {
  constructor() {
    super('SeasonTransitionScene');
  }

  create(data) {
    const { width: W, height: H } = this.scale;
    const season = SEASON_ORDER[data.seasonIndex];
    this.cameras.main.setBackgroundColor('#1f2b3c');
    this.cameras.main.fadeIn(300);

    this.add.image(W / 2, H / 2 - 130, `icon-${season.key}`).setScale(2.2);
    this.add.text(W / 2, H / 2 - 66, `Next: ${season.name}`, textStyle(44)).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 20, season.tagline, textStyle(20, { color: '#dfe8f2' })).setOrigin(0.5);

    this.add.text(W / 2, H / 2 + 30, 'Lives carried over', textStyle(16, { color: '#dfe8f2' })).setOrigin(0.5);
    const hearts = createHearts(this, 0, H / 2 + 46, data.lives);
    const rowWidth = Math.max(...hearts.map((h) => h.x)) + UI.heartSize;
    hearts.forEach((h) => h.setX(h.x + W / 2 - rowWidth / 2));

    this.add.text(W / 2, H / 2 + 120, 'Press ENTER to continue', textStyle(20)).setOrigin(0.5);
    onKey(this, 'ENTER', () => this.scene.start('GameScene', data));
  }
}
