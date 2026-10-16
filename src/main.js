import { SCREEN, DEBUG } from './config/game.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import SeasonTransitionScene from './scenes/SeasonTransitionScene.js';
import LevelCompleteScene from './scenes/LevelCompleteScene.js';
import HubScene from './scenes/HubScene.js';
import GameOverScene from './scenes/GameOverScene.js';

// Canvas text needs the web fonts loaded first; start anyway after a short wait
// (offline, or the font CDN is slow) and fall back to system fonts.
async function loadFonts() {
  if (!document.fonts?.load) return;
  const fonts = Promise.all([
    document.fonts.load('800 20px "Nunito"'),
    document.fonts.load('600 20px "Nunito"'),
    document.fonts.load('700 20px "Lora"'),
  ]);
  await Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 2500))]).catch(() => {});
}

await loadFonts();

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
