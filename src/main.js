import { SCREEN, DEBUG } from './config/game.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import SeasonTransitionScene from './scenes/SeasonTransitionScene.js';
import LevelCompleteScene from './scenes/LevelCompleteScene.js';
import HubScene from './scenes/HubScene.js';
import GameOverScene from './scenes/GameOverScene.js';

window.__game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.width,
  height: SCREEN.height,
  backgroundColor: SCREEN.background,
  physics: {
    default: 'arcade',
    arcade: { debug: DEBUG.physics },
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
