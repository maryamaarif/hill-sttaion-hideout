import { createMenu } from './ui.js';
import { textStyle, createHearts } from '../ui/Hud.js';
import { newLevelRun } from '../systems/RunState.js';
import { UI } from '../config/game.js';

const MESSAGES = {
  caught: 'A plain-clothes officer recognised you.',
  water: 'You ended up in the water once too often.',
  fell: 'You took one tumble too many.',
  heat: 'The summer sun got the better of you.',
  branch: 'One branch too many knocked you off.',
  train: 'The trains ran on time. You did not.',
  cold: 'The cold got to you. Huts and warm windows help.',
};

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(UI.screenBg);
    this.cameras.main.fadeIn(400);

    this.add.text(W / 2, H / 2 - 120, 'Out of lives', textStyle(48)).setOrigin(0.5);
    this.add
      .text(W / 2, H / 2 - 66, MESSAGES[data.reason] ?? MESSAGES.caught, textStyle(20, { color: '#e8dcff' }))
      .setOrigin(0.5);
    const hearts = createHearts(this, 0, H / 2 - 30, 0);
    const rowWidth = hearts.length * (UI.heartSize + 4) - 4;
    hearts.forEach((h) => h.setX(h.x + W / 2 - rowWidth / 2));

    createMenu(this, W / 2, H / 2 + 50, [
      // Retrying keeps the items brought from the shop for this level.
      {
        label: 'Try again',
        action: () =>
          this.scene.start('GameScene', newLevelRun(data.level, this.time.now, { items: data.items, hidingPlaces: data.hidingPlaces })),
      },
      { label: 'Main menu', action: () => this.scene.start('MenuScene', { level: data.level }) },
    ]);
  }
}
