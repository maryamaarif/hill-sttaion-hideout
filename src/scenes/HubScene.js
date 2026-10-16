import { addScreenText, onKey } from './ui.js';
import SaveSystem from '../systems/SaveSystem.js';

// Guest house room: spend coins on upgrades, items, extra hiding places. Placeholder.
export default class HubScene extends Phaser.Scene {
  constructor() {
    super('HubScene');
  }

  create(data) {
    const save = SaveSystem.load();
    addScreenText(this, 'Your Room at the Guest House', [
      `Coins: ${save.coins}`,
      '(shop coming soon)',
      '',
      'Press ENTER to continue',
    ]);
    onKey(this, 'ENTER', () => this.scene.start('MenuScene', { level: data.level }));
  }
}
