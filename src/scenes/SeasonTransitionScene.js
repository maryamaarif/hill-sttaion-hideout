import { createHearts, textStyle } from '../ui/Hud.js';
import { SEASON_ORDER } from '../seasons/index.js';
import { TRANSITION, UI } from '../config/game.js';
import AudioSystem from '../systems/AudioSystem.js';
import PerkSystem from '../systems/PerkSystem.js';

const { Color } = Phaser.Display;
const mix = (a, b, t) => {
  const c = Color.Interpolate.ColorWithColor(Color.IntegerToColor(a), Color.IntegerToColor(b), 100, t * 100);
  return Color.GetColor(c.r, c.g, c.b);
};

// Between seasons: a short animated change (the old season's particles and icon
// give way to the next season's), the lives carried forward, then a choice of one
// perk for the next season. ENTER skips the animation.
export default class SeasonTransitionScene extends Phaser.Scene {
  constructor() {
    super('SeasonTransitionScene');
  }

  create(data) {
    const { width: W, height: H } = this.scale;
    this.run = data;
    this.next = SEASON_ORDER[data.seasonIndex];
    this.prev = SEASON_ORDER[data.seasonIndex - 1] ?? this.next;
    this.audio = new AudioSystem(this);
    this.blend = { t: 0 };
    this.stage = 'intro';
    this.cards = null;
    const T = TRANSITION;

    // Sky and a strip of ground that blend from the old season's colours to the new.
    this.bg = this.add.graphics();
    this.drawBackground();
    this.tweens.add({ targets: this.blend, t: 1, delay: T.swapMs, duration: T.blendMs, onUpdate: () => this.drawBackground() });

    // Old season's particles, then the new season's.
    const emitter = (season) => {
      const { texture, ...cfg } = season.ambient;
      return this.add.particles(0, -10, texture, { x: { min: 0, max: W }, ...cfg, frequency: cfg.frequency / 2 });
    };
    const prevParticles = emitter(this.prev);
    this.time.delayedCall(T.swapMs, () => {
      prevParticles.stop();
      emitter(this.next);
      this.audio.play('seasonChange');
      this.audio.playMusic(this.next.music ?? this.next.key);
    });

    // Old icon spins away; new icon pops in.
    const prevIcon = this.add.image(W / 2, H / 2 - 120, `icon-${this.prev.key}`).setScale(3);
    const nextIcon = this.add.image(W / 2, H / 2 - 120, `icon-${this.next.key}`).setScale(0);
    this.tweens.add({ targets: prevIcon, scale: 0, angle: 180, alpha: 0, delay: T.swapMs - 200, duration: 400 });
    this.tweens.add({ targets: nextIcon, scale: 3, delay: T.swapMs + 200, duration: 500, ease: 'Back.out' });

    // Season name, then lives carried forward.
    const title = this.add.text(W / 2, H / 2 - 52, this.next.name, textStyle(48)).setOrigin(0.5).setAlpha(0);
    const tagline = this.add.text(W / 2, H / 2 - 14, this.next.tagline, textStyle(18, { color: '#f4f1ea' })).setOrigin(0.5).setAlpha(0);
    const livesLine = this.add
      .text(W / 2, H / 2 + 24, `❤ x ${data.lives} carried into ${this.next.name}`, textStyle(20, { color: '#ffd6dc' }))
      .setOrigin(0.5)
      .setAlpha(0);
    const hearts = createHearts(this, 0, H / 2 + 44, data.lives);
    const rowWidth = Math.max(...hearts.map((h) => h.x)) + UI.heartSize;
    hearts.forEach((h) => h.setX(h.x + W / 2 - rowWidth / 2));
    this.heartAlpha = hearts.map((h) => h.alpha);
    hearts.forEach((h) => h.setAlpha(0));
    this.hearts = hearts;
    this.texts = [title, tagline, livesLine];
    this.tweens.add({ targets: [title, tagline], alpha: 1, delay: T.titleMs, duration: 400 });
    this.tweens.add({ targets: livesLine, alpha: 1, delay: T.livesMs, duration: 400 });
    hearts.forEach((h, i) => this.tweens.add({ targets: h, alpha: this.heartAlpha[i], delay: T.livesMs, duration: 400 }));

    this.perks = PerkSystem.optionsFor(this.next.key);
    this.time.delayedCall(T.choiceMs, () => this.showChoice());

    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.select(this.selected - 1));
    kb.on('keydown-A', () => this.select(this.selected - 1));
    kb.on('keydown-RIGHT', () => this.select(this.selected + 1));
    kb.on('keydown-D', () => this.select(this.selected + 1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
  }

  drawBackground() {
    const { width: W, height: H } = this.scale;
    const t = this.blend.t;
    const a = this.prev.palette;
    const b = this.next.palette;
    const top = mix(a.skyTop, b.skyTop, t);
    const bottom = mix(a.skyBottom, b.skyBottom, t);
    this.bg.clear();
    this.bg.fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, 0, W, H);
    this.bg.fillStyle(0x1d2b3a, 0.35).fillRect(0, 0, W, H); // keep text readable
    this.bg.fillStyle(mix(a.dirt, b.dirt, t)).fillRect(0, H - 50, W, 50);
    this.bg.fillStyle(mix(a.grass, b.grass, t)).fillRect(0, H - 56, W, 12);
  }

  // Shown when the intro ends, or straight away if the player presses ENTER.
  showChoice() {
    if (this.stage !== 'intro') return;
    this.stage = 'choice';
    this.tweens.killTweensOf([this.blend, ...this.texts, ...this.hearts]);
    this.blend.t = 1;
    this.drawBackground();
    this.texts.forEach((o) => o.setAlpha(1));
    this.hearts.forEach((h, i) => h.setAlpha(this.heartAlpha[i]));

    const { width: W, height: H } = this.scale;
    if (!this.perks.length) {
      this.add.text(W / 2, H - 90, 'Press ENTER to continue', textStyle(22)).setOrigin(0.5);
      return;
    }
    this.add.text(W / 2, H / 2 + 84, `Pick a perk for ${this.next.name}   (← →, ENTER)`, textStyle(17)).setOrigin(0.5);
    const gap = 268;
    this.cards = this.perks.map((perk, i) => {
      const x = W / 2 + (i - (this.perks.length - 1) / 2) * gap;
      const y = H - 116;
      const bg = this.add.rectangle(x, y + 30, 248, 116, 0xfff4e6).setStrokeStyle(4, 0x3b2a20);
      const icon = this.add.text(x, y - 6, perk.icon, { fontSize: '28px' }).setOrigin(0.5);
      const name = this.add.text(x, y + 26, perk.name, { fontFamily: UI.font, fontSize: '20px', color: '#3b2a20', fontStyle: 'bold' }).setOrigin(0.5);
      const desc = this.add
        .text(x, y + 56, perk.desc, { fontFamily: UI.font, fontSize: '14px', color: '#5a4636', align: 'center', wordWrap: { width: 220 } })
        .setOrigin(0.5);
      const parts = [bg, icon, name, desc];
      parts.forEach((p) => p.setAlpha(0).setY(p.y + 30));
      this.tweens.add({ targets: parts, alpha: 1, y: '-=30', delay: i * 90, duration: 300, ease: 'Back.out' });
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => this.select(i));
      bg.on('pointerdown', () => {
        this.select(i);
        this.confirm();
      });
      return { bg, parts };
    });
    this.selected = -1;
    this.select(0);
  }

  select(i) {
    if (this.stage !== 'choice' || !this.cards) return;
    const n = this.cards.length;
    const next = (i + n) % n;
    if (this.selected >= 0 && next !== this.selected) this.audio.play('select');
    this.selected = next;
    this.cards.forEach(({ bg }, j) => {
      bg.setFillStyle(j === next ? 0xffd54f : 0xfff4e6);
      bg.setStrokeStyle(j === next ? 6 : 4, 0x3b2a20);
    });
  }

  confirm() {
    if (this.stage === 'intro') {
      this.showChoice();
      return;
    }
    if (this.stage !== 'choice') return;
    this.stage = 'leaving';
    const perk = this.cards ? this.perks[this.selected] : null;
    const perks = perk ? [...(this.run.perks ?? []), perk.key] : this.run.perks ?? [];
    this.audio.play('chime');
    if (perk) this.tweens.add({ targets: this.cards[this.selected].parts, scale: 1.08, yoyo: true, duration: 140 });
    this.cameras.main.fadeOut(TRANSITION.fadeMs);
    this.time.delayedCall(TRANSITION.fadeMs, () => this.scene.start('GameScene', { ...this.run, perks }));
  }
}
