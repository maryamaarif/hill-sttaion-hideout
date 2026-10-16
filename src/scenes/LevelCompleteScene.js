import { addScreenText, onKey } from './ui.js';
import LivesSystem from '../systems/LivesSystem.js';
import SaveSystem from '../systems/SaveSystem.js';

export default class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super('LevelCompleteScene');
  }

  create(data) {
    const lifeCoins = LivesSystem.livesToCoins(data.lives);
    const bonus = LivesSystem.speedBonus(data.elapsedSeconds);

    const save = SaveSystem.load();
    save.coins += lifeCoins + bonus;
    save.highestLevel = Math.max(save.highestLevel, data.level + 1);
    SaveSystem.save(save);

    addScreenText(this, `Level ${data.level} Complete!`, [
      `Lives ${data.lives} → ${lifeCoins} coins`,
      `Speed bonus: ${bonus} coins`,
      `Total coins: ${save.coins}`,
      '',
      'Press ENTER to return to the guest house',
    ]);
    onKey(this, 'ENTER', () => this.scene.start('HubScene', { level: data.level + 1 }));
  }
}
