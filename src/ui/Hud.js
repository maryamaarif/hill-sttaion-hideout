import { DEPTH, LIVES, UI } from '../config/game.js';

const textStyle = (size, extra = {}) => ({
  fontFamily: UI.font,
  fontSize: `${size}px`,
  color: UI.textColor,
  stroke: UI.strokeColor,
  strokeThickness: Math.max(3, Math.round(size / 5)),
  align: 'center',
  ...extra,
});

// On-screen HUD fixed to the camera: lives, season + hurdle progress, banners.
export default class Hud {
  constructor(scene, seasonName, hurdles) {
    this.scene = scene;
    this.hurdles = hurdles;
    const W = scene.scale.width;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.hud);

    this.hearts = [];
    this.hiddenText = fixed(scene.add.text(18, 44, 'HIDDEN', textStyle(16, { color: '#c8f7c5' })));
    this.hiddenText.setVisible(false);

    this.seasonText = fixed(scene.add.text(W / 2, 12, seasonName, textStyle(24)).setOrigin(0.5, 0));
    this.hurdleText = fixed(scene.add.text(W / 2, 44, '', textStyle(16)).setOrigin(0.5, 0));

    this.dots = fixed(scene.add.graphics());
    this.cleared = 0;
    this.drawDots();

    this.bannerTitle = fixed(scene.add.text(W / 2, 150, '', textStyle(38)).setOrigin(0.5).setAlpha(0));
    this.bannerSub = fixed(scene.add.text(W / 2, 194, '', textStyle(20)).setOrigin(0.5).setAlpha(0));
  }

  setLives(lives) {
    this.hearts.forEach((h) => h.destroy());
    this.hearts = [];
    const slots = Math.max(LIVES.start, Math.ceil(lives));
    for (let i = 0; i < slots; i++) {
      const x = 18 + i * (UI.heartSize + 4);
      const empty = this.scene.add.image(x, 14, 'heart-empty').setOrigin(0).setAlpha(0.3);
      this.hearts.push(empty.setScrollFactor(0).setDepth(DEPTH.hud));
      const fill = Math.min(1, Math.max(0, lives - i));
      if (fill > 0) {
        const heart = this.scene.add.image(x, 14, 'heart-full').setOrigin(0);
        if (fill < 1) heart.setCrop(0, 0, heart.width * fill, heart.height);
        this.hearts.push(heart.setScrollFactor(0).setDepth(DEPTH.hud));
      }
    }
  }

  setHurdle(index) {
    const h = this.hurdles[index];
    this.hurdleText.setText(`Hurdle ${index + 1}/${this.hurdles.length}: ${h.name}`);
  }

  setBetweenHurdles(text) {
    this.hurdleText.setText(text);
  }

  markCleared(count) {
    this.cleared = count;
    this.drawDots();
  }

  drawDots() {
    const W = this.scene.scale.width;
    const n = this.hurdles.length;
    this.dots.clear();
    for (let i = 0; i < n; i++) {
      const x = W - 24 - (n - 1 - i) * 26;
      this.dots.lineStyle(3, 0x3b2a20).strokeCircle(x, 26, 9);
      this.dots.fillStyle(i < this.cleared ? 0xffd54f : 0xffffff, i < this.cleared ? 1 : 0.35).fillCircle(x, 26, 8);
    }
  }

  setHidden(hidden) {
    this.hiddenText.setVisible(hidden);
  }

  showBanner(title, sub = '') {
    this.bannerTitle.setText(title);
    this.bannerSub.setText(sub);
    const targets = [this.bannerTitle, this.bannerSub];
    this.scene.tweens.killTweensOf(targets);
    targets.forEach((t) => t.setAlpha(0));
    this.scene.tweens.add({ targets, alpha: 1, duration: 250, hold: UI.bannerHoldMs, yoyo: true });
  }

  // Floating world-space text, e.g. "+½ life" above the player.
  popup(x, y, text, color = '#fff6a8') {
    const t = this.scene.add.text(x, y, text, textStyle(20, { color })).setOrigin(0.5).setDepth(DEPTH.popup);
    this.scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  showPanel(title, lines) {
    const { width: W, height: H } = this.scene.scale;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.hud + 1);
    fixed(this.scene.add.rectangle(0, 0, W, H, 0x1d2b3a, 0.55).setOrigin(0));
    fixed(this.scene.add.rectangle(W / 2, H / 2, 480, 230, 0xfff4e6).setStrokeStyle(4, 0x3b2a20));
    fixed(this.scene.add.text(W / 2, H / 2 - 66, title, textStyle(36)).setOrigin(0.5));
    fixed(
      this.scene.add
        .text(W / 2, H / 2 + 24, lines.join('\n'), { fontFamily: UI.font, fontSize: '20px', color: '#3b2a20', align: 'center', lineSpacing: 8 })
        .setOrigin(0.5),
    );
  }
}
