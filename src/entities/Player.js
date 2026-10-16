// Player: movement (per-season physics), jumping, hiding. Placeholder.
export default class Player {
  constructor(scene, x, y, seasonPhysics) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.physics = seasonPhysics;
    this.hidden = false;
  }

  update() {}
}
