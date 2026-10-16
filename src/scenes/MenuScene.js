import { createMenu } from './ui.js';
import { textStyle } from '../ui/Hud.js';
import { buildBackdrop } from '../art/Backdrop.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { newLevelRunFromSave } from '../systems/RunState.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';
import SettingsPanel from '../ui/SettingsPanel.js';

// Title screen: the Spring hills and the guest house behind the menu.
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width: W, height: H } = this.scale;
    const save = SaveSystem.load();
    const level = save.highestLevel;
    new AudioSystem(this).playMusic('room');

    const spring = SEASON_ORDER[0];
    buildBackdrop(this, spring.palette, W);
    const { texture, ...petals } = spring.ambient;
    this.add.particles(0, -10, texture, { x: { min: 0, max: W }, ...petals });
    this.add.rectangle(0, 0, W, H, 0x1d2b3a, 0.25).setOrigin(0);

    this.add.text(W / 2, 110, 'Hill Station Hideout', textStyle(54)).setOrigin(0.5);
    this.add.text(W / 2, 162, 'Stay out of sight through four seasons.', textStyle(20, { color: '#fff6e8' })).setOrigin(0.5);

    this.settingsPanel = new SettingsPanel(this);
    const options = [
      { label: `Start Level ${level}`, action: () => this.scene.start('GameScene', newLevelRunFromSave(level, this.time.now)) },
    ];
    // The room (shop) once there is something to spend or show.
    if (save.coins > 0 || level > 1) options.push({ label: 'Your room', action: () => this.scene.start('HubScene') });
    options.push({ label: 'Settings', keepOpen: true, action: () => this.settingsPanel.open() });
    this.menu = createMenu(this, W / 2, 270, options);
    this.add.text(W / 2, H - 24, '↑ ↓ choose   ENTER select   M mute', textStyle(15)).setOrigin(0.5);
  }
}
