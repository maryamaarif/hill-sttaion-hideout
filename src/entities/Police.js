// Police: patrol route, visible vision cone, detection meter. Placeholder.
export default class Police {
  constructor(scene, x, y, settings) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.settings = settings;
    this.detection = 0; // 0..1, player caught at 1
  }

  update() {}
}
