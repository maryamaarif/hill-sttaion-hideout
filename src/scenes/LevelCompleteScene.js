import { onKey } from './ui.js';
import { createHearts, textStyle } from '../ui/Hud.js';
import { COINS, UI } from '../config/game.js';
import LivesSystem from '../systems/LivesSystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { buildBackdrop } from '../art/Backdrop.js';
import { addPanel } from '../ui/Panels.js';

// All four seasons done: remaining lives are redeemed for coins, plus a speed bonus.
export default class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super('LevelCompleteScene');
  }

  create(data) {
    const { width: W, height: H } = this.scale;
    const lifeCoins = LivesSystem.livesToCoins(data.lives);
    const bonus = LivesSystem.speedBonus(data.elapsedSeconds);

    const save = SaveSystem.load();
    save.coins += lifeCoins + bonus;
    save.highestLevel = Math.max(save.highestLevel, data.level + 1);
    SaveSystem.save(save);

    this.cameras.main.setBackgroundColor(UI.screenBg);
    const audio = new AudioSystem(this);
    audio.playMusic('room');
    let lastTick = 0;
    this.cameras.main.fadeIn(500);
    // Safe back at the guest house: the snowy evening outside, warm light within.
    const winter = SEASON_ORDER[SEASON_ORDER.length - 1];
    buildBackdrop(this, winter, W).forEach((o) => o.depth > -20 && o.setDepth(-20));
    this.add.rectangle(0, 0, W, H, 0x1d1a2e, 0.5).setOrigin(0).setDepth(-19);
    this.add.image(W / 2, H / 2 - 40, 'glow').setDisplaySize(620, 620).setTint(0xffc861).setAlpha(0.18).setDepth(-18);
    addPanel(this, W / 2, 262, 560, 420, 'wood').setDepth(-17);

    this.add.text(W / 2, 70, `Level ${data.level} complete!`, textStyle(44)).setOrigin(0.5);
    this.add.text(W / 2, 118, 'Safe back at the guest house.', textStyle(20, { color: '#f3e6d0' })).setOrigin(0.5);

    const hearts = createHearts(this, 0, 160, data.lives);
    const rowWidth = Math.max(...hearts.map((h) => h.x)) + UI.heartSize;
    hearts.forEach((h) => h.setX(h.x + W / 2 - rowWidth / 2));

    const minutes = Math.floor(data.elapsedSeconds / 60);
    const seconds = String(Math.floor(data.elapsedSeconds % 60)).padStart(2, '0');
    const lines = [
      `Lives left: ${data.lives}   →   ${lifeCoins} coins`,
      `(${COINS.perLife} per life, ${COINS.perHalfLife} per half life)`,
      `Time ${minutes}:${seconds}   →   speed bonus ${bonus} coins`,
    ];
    lines.forEach((line, i) => {
      this.add.text(W / 2, 220 + i * 34, line, textStyle(i === 1 ? 15 : 20, { color: i === 1 ? '#cdbfd9' : '#ffffff' })).setOrigin(0.5);
    });

    const total = this.add.text(W / 2, 350, `+0 coins`, textStyle(34, { color: '#ffd54f' })).setOrigin(0.5);
    this.add.image(W / 2 - 110, 350, 'coin').setScale(0.75);
    const earned = lifeCoins + bonus;
    const counter = { value: 0 };
    this.tweens.add({
      targets: counter,
      value: earned,
      duration: 1200,
      delay: 400,
      ease: 'Cubic.out',
      onUpdate: () => {
        total.setText(`+${Math.round(counter.value)} coins`);
        if (this.time.now - lastTick > 55) {
          lastTick = this.time.now;
          audio.play('coin');
        }
      },
      onComplete: () => audio.play('chime'),
    });
    this.add.text(W / 2, 395, `Total: ${save.coins} coins`, textStyle(18, { color: '#f3e6d0' })).setOrigin(0.5);

    this.add.text(W / 2, H - 60, 'Press ENTER to go to your room', textStyle(20)).setOrigin(0.5);
    onKey(this, 'ENTER', () => this.scene.start('HubScene', { level: data.level + 1 }));
  }
}
