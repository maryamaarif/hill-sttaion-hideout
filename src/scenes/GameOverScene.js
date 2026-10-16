import { createMenu } from './ui.js';
import { textStyle, createHearts } from '../ui/Hud.js';
import { newLevelRun } from '../systems/RunState.js';
import { UI } from '../config/game.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { buildBackdrop } from '../art/Backdrop.js';
import { addPanel } from '../ui/Panels.js';

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
    // The season where it ended, dimmed, behind a wooden board.
    const season = SEASON_ORDER.find((s) => s.key === data.seasonKey) ?? SEASON_ORDER[0];
    buildBackdrop(this, season, W).forEach((o) => o.depth > -20 && o.setDepth(-20));
    this.add.rectangle(0, 0, W, H, 0x1d1a2e, 0.55).setOrigin(0).setDepth(-19);
    addPanel(this, W / 2, H / 2 - 30, 520, 340, 'wood').setDepth(-18);

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
