import { DEPTH, LIVES, UI } from '../config/game.js';
import { addPanel, setHot } from './Panels.js';

const HEART_GAP = 4;
// Painted HUD art is 2× and shown at half size.
const ART = 0.5;

export const textStyle = (size, extra = {}) => ({
  fontFamily: size >= UI.titleMinSize ? UI.titleFont : UI.font,
  fontStyle: size >= UI.titleMinSize ? '700' : '800',
  fontSize: `${size}px`,
  color: UI.textColor,
  stroke: UI.strokeColor,
  strokeThickness: Math.max(3, Math.round(size / 5)),
  align: 'center',
  ...extra,
});

// Draws a row of hearts (full, half, empty) with top-left at (x, y).
// Shows at least LIVES.start slots so lost lives read as empty hearts.
export function createHearts(scene, x, y, lives) {
  const objects = [];
  const size = UI.heartSize;
  const slots = Math.max(LIVES.start, Math.ceil(lives));
  for (let i = 0; i < slots; i++) {
    const hx = x + i * (size + HEART_GAP);
    objects.push(scene.add.image(hx, y, 'heart-empty').setOrigin(0).setScale(ART).setAlpha(0.75));
    const fill = Math.min(1, Math.max(0, lives - i));
    if (fill > 0) {
      const heart = scene.add.image(hx, y, 'heart-full').setOrigin(0).setScale(ART);
      if (fill < 1) heart.setCrop(0, 0, heart.width * fill, heart.height);
      objects.push(heart);
    }
  }
  return objects;
}

// On-screen HUD fixed to the camera.
//   left:   hearts (+ HIDDEN indicator)
//   centre: season icon + name, hurdle dots ●●○, hurdle name
//   right:  coins
export default class Hud {
  constructor(scene, season, hurdles, coins) {
    this.scene = scene;
    this.hurdles = hurdles;
    const W = scene.scale.width;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.hud);
    this.fixed = fixed;

    // Wooden plaques behind each HUD group.
    const plaque = (x, y, w, h, ox) => addPanel(scene, x, y, w, h, 'wood').setOrigin(ox, 0).setScrollFactor(0).setDepth(DEPTH.hud - 1).setAlpha(0.94);
    plaque(8, 6, 100, 38, 0);
    plaque(W / 2, 4, 320, 84, 0.5);
    this.coinPlaque = plaque(W - 8, 6, 100, 38, 1);

    this.heartsX = 18;
    this.heartsY = 15;
    this.hearts = [];
    this.hiddenText = fixed(scene.add.text(16, 50, 'HIDDEN', textStyle(16, { color: '#c8f7c5' }))).setVisible(false);

    this.seasonIcon = fixed(scene.add.image(0, 26, `icon-${season.key}`).setScale(ART));
    this.seasonText = fixed(scene.add.text(0, 26, season.name, textStyle(24)).setOrigin(0, 0.5));
    const iw = this.seasonIcon.displayWidth;
    const total = iw + 8 + this.seasonText.width;
    this.seasonIcon.setX(W / 2 - total / 2 + iw / 2);
    this.seasonText.setX(W / 2 - total / 2 + iw + 8);

    this.dots = fixed(scene.add.graphics());
    this.cleared = 0;
    this.active = -1;
    this.hurdleText = fixed(scene.add.text(W / 2, 66, '', textStyle(15)).setOrigin(0.5, 0));
    this.drawDots();

    this.coinText = fixed(scene.add.text(W - 20, 25, '', textStyle(22)).setOrigin(1, 0.5));
    this.perkText = fixed(scene.add.text(W - 16, 50, '', textStyle(14, { color: '#fff1c9' })).setOrigin(1, 0));
    this.coinIcon = fixed(scene.add.image(0, 26, 'coin').setScale(ART));
    this.setCoins(coins);

    this.bannerTitle = fixed(scene.add.text(W / 2, 150, '', textStyle(38)).setOrigin(0.5).setAlpha(0));
    this.bannerSub = fixed(scene.add.text(W / 2, 194, '', textStyle(20)).setOrigin(0.5).setAlpha(0));
  }

  // ----- lives -----

  setLives(lives) {
    this.hearts.forEach((h) => h.destroy());
    this.hearts = createHearts(this.scene, this.heartsX, this.heartsY, lives).map(this.fixed);
  }

  heartCenter(index) {
    const size = UI.heartSize;
    return { x: this.heartsX + index * (size + HEART_GAP) + size / 2, y: this.heartsY + 10 };
  }

  // A half heart flies from a world position up into the heart slot it fills.
  flyHalfHeart(worldX, worldY, lives, onArrive) {
    const cam = this.scene.cameras.main;
    const target = this.heartCenter(Math.ceil(lives) - 1);
    const heart = this.fixed(this.scene.add.image(worldX - cam.scrollX, worldY - cam.scrollY, 'heart-full'));
    // Landing on a whole number fills a heart's right half; otherwise its left half.
    const rightHalf = Number.isInteger(lives);
    heart.setDepth(DEPTH.hud + 2).setScale(1.8 * ART);
    heart.setCrop(rightHalf ? heart.width / 2 : 0, 0, heart.width / 2, heart.height);
    this.scene.tweens.add({ targets: heart, x: target.x, duration: 750, ease: 'Sine.inOut' });
    this.scene.tweens.add({ targets: heart, y: target.y, duration: 750, ease: 'Back.in' });
    this.scene.tweens.add({
      targets: heart,
      scale: ART,
      duration: 750,
      onComplete: () => {
        heart.destroy();
        onArrive?.();
        this.pulseHeart(Math.ceil(lives) - 1);
      },
    });
  }

  pulseHeart(index) {
    const { x, y } = this.heartCenter(index);
    const ring = this.fixed(this.scene.add.circle(x, y, 10, 0xfff1a8, 0.9)).setDepth(DEPTH.hud - 1);
    this.scene.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
  }

  // The heart that was lost drops and fades out, then the row redraws.
  breakHeart(before, after) {
    const index = Math.max(0, Math.ceil(before) - 1);
    const { x, y } = this.heartCenter(index);
    const piece = this.fixed(this.scene.add.image(x, y, 'heart-full')).setDepth(DEPTH.hud + 2).setScale(ART);
    const fill = before - Math.floor(before) || 1;
    if (fill < 1) piece.setCrop(0, 0, piece.width * fill, piece.height);
    this.setLives(after);
    this.scene.tweens.add({
      targets: piece,
      y: y + 40,
      angle: 35,
      alpha: 0,
      scale: 1.4 * ART,
      duration: 600,
      ease: 'Quad.in',
      onComplete: () => piece.destroy(),
    });
  }

  // ----- hurdles -----

  setHurdle(index) {
    this.active = index;
    this.hurdleText.setText(this.hurdles[index].name);
    this.drawDots();
  }

  setBetweenHurdles(text) {
    this.active = -1;
    this.hurdleText.setText(text);
    this.drawDots();
  }

  markCleared(count) {
    this.cleared = count;
    this.drawDots();
  }

  // ● cleared (gold), ◉ current (white ring), ○ upcoming (faint).
  drawDots() {
    const W = this.scene.scale.width;
    const n = this.hurdles.length;
    const gap = 24;
    this.dots.clear();
    for (let i = 0; i < n; i++) {
      const x = W / 2 + (i - (n - 1) / 2) * gap;
      const y = 54;
      const done = i < this.cleared;
      const current = i === this.active;
      this.dots.lineStyle(3, 0x3b2a20).strokeCircle(x, y, 8);
      this.dots.fillStyle(done ? 0xffd54f : 0xffffff, done ? 1 : current ? 0.95 : 0.35).fillCircle(x, y, 7);
      if (current) this.dots.fillStyle(0xffd54f).fillCircle(x, y, 3);
    }
  }

  // ----- coins -----

  setCoins(coins) {
    this.coinText.setText(String(coins));
    this.coinIcon.setX(this.coinText.x - this.coinText.width - 16);
    this.coinPlaque.setSize(Math.max(100, this.coinText.width + 56) * 2, 76); // texture px (2×)
  }

  // Perk chosen for this season, shown under the coins.
  setPerk(label) {
    this.perkText.setText(label);
  }

  // ----- misc -----

  // Status under the hearts: HIDDEN, or e.g. BLENDING IN (Fall foliage).
  setHidden(hidden, label = null) {
    this.hiddenText.setVisible(hidden || Boolean(label));
    this.hiddenText.setText(hidden ? 'HIDDEN' : label ?? '');
  }

  // Weather event badge under the hearts: icon + name, and a bar for the time
  // left (blinks while the event is about to start).
  setWeather(event, status) {
    if (!this.weatherBadge && event) {
      const fixed = (o) => o.setScrollFactor(0).setDepth(DEPTH.hud);
      const panel = addPanel(this.scene, 8, 72, 176, 40, 'wood').setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.hud - 1);
      const label = fixed(this.scene.add.text(18, 80, `${event.icon} ${event.name}`, textStyle(15)).setOrigin(0, 0));
      const bar = fixed(this.scene.add.graphics());
      this.weatherBadge = { panel, label, bar, parts: [panel, label, bar] };
      this.weatherBadge.parts.forEach((o) => o.setVisible(false));
    }
    const b = this.weatherBadge;
    if (!b) return;
    const show = Boolean(status);
    b.parts.forEach((o) => o.setVisible(show));
    if (!show) return;
    const warn = status.state === 'warn';
    b.label.setAlpha(warn ? 0.5 + 0.5 * Math.abs(Math.sin(this.scene.time.now / 160)) : 1);
    b.bar.clear();
    if (!warn) {
      b.bar.fillStyle(0x3b2a20, 0.8).fillRoundedRect(18, 101, 154, 5, 2);
      b.bar.fillStyle(0x9fd3ff).fillRoundedRect(18, 101, 154 * Math.max(0, Math.min(1, status.left)), 5, 2);
    }
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
    fixed(addPanel(this.scene, W / 2, H / 2, 480, 230, 'paper'));
    fixed(this.scene.add.text(W / 2, H / 2 - 66, title, textStyle(36)).setOrigin(0.5));
    fixed(
      this.scene.add
        .text(W / 2, H / 2 + 24, lines.join('\n'), { fontFamily: UI.font, fontSize: '20px', color: '#3b2a20', align: 'center', lineSpacing: 8 })
        .setOrigin(0.5),
    );
  }
}
