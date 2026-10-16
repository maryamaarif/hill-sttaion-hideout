import { addTrigger } from './LevelBuilder.js';

// Tracks progress through a season's hurdles using invisible trigger zones
// at each hurdle's start and end line. Hurdles must be done in order.
export default class HurdleSystem {
  constructor(scene, hurdles, player, { onStart, onClear }) {
    this.hurdles = hurdles;
    this.next = 0; // index of the next hurdle to start
    this.active = -1; // index of the hurdle in progress, -1 if between hurdles
    this.onStart = onStart;
    this.onClear = onClear;

    const H = scene.scale.height;
    const lineWidth = 24;
    hurdles.forEach((h, i) => {
      const start = addTrigger(scene, h.startX - lineWidth / 2, 0, lineWidth, H);
      const end = addTrigger(scene, h.endX - lineWidth / 2, 0, lineWidth, H);
      scene.physics.add.overlap(player, start, () => this.enter(i));
      scene.physics.add.overlap(player, end, () => this.exit(i));
    });
  }

  enter(i) {
    if (i !== this.next || this.active === i) return;
    this.active = i;
    this.onStart(i, this.hurdles[i]);
  }

  exit(i) {
    if (this.active !== i) return;
    this.active = -1;
    this.next = i + 1;
    this.onClear(i, this.hurdles[i]);
  }

  get allCleared() {
    return this.next >= this.hurdles.length;
  }

  // Where to put the player back after failing.
  checkpointX(spawnX) {
    if (this.active >= 0) return this.hurdles[this.active].startX;
    if (this.next > 0) return this.hurdles[this.next - 1].endX;
    return spawnX;
  }
}
