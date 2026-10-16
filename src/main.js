import { SCREEN } from './config/game.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import SeasonTransitionScene from './scenes/SeasonTransitionScene.js';
import LevelCompleteScene from './scenes/LevelCompleteScene.js';
import HubScene from './scenes/HubScene.js';
import GameOverScene from './scenes/GameOverScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.width,
  height: SCREEN.height,
  backgroundColor: SCREEN.background,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    SeasonTransitionScene,
    LevelCompleteScene,
    HubScene,
    GameOverScene,
  ],
});
