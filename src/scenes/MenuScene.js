import { addScreenText, createMenu } from './ui.js';
import { newLevelRunFromSave } from '../systems/RunState.js';
import SaveSystem from '../systems/SaveSystem.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width: W, height: H } = this.scale;
    const save = SaveSystem.load();
    const level = save.highestLevel;
    addScreenText(this, 'Hill Station Hideout', ['Stay out of sight through four seasons.']);
    const options = [
      { label: `Start Level ${level}`, action: () => this.scene.start('GameScene', newLevelRunFromSave(level, this.time.now)) },
    ];
    // The room (shop) once there is something to spend or show.
    if (save.coins > 0 || level > 1) options.push({ label: 'Your room', action: () => this.scene.start('HubScene') });
    createMenu(this, W / 2, H / 2 + 80, options);
  }
}
