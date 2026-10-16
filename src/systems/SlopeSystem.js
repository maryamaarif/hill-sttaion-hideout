import { SLOPES } from '../config/game.js';

// Smooth slopes (layout.slopes) without physics bodies: after each physics step the
// player is snapped onto the slope surface, and stays stuck to it while sliding
// downhill. A slope with `launch` is a ski-jump ramp: leaving its top end at speed
// throws the player into the air.
//
// def: { x, w, y1, y2, launch? }   surface runs from (x, y1) to (x + w, y2)
//   launch  upward speed on take-off as a fraction of horizontal speed
export default class SlopeSystem {
  constructor(slopes = []) {
    this.slopes = slopes;
    this.last = null; // slope the player was standing on last frame
  }

  slopeAt(x) {
    return this.slopes.find((s) => x >= s.x && x <= s.x + s.w) ?? null;
  }

  heightAt(x) {
    const s = this.slopeAt(x);
    if (!s) return null;
    return s.y1 + ((x - s.x) / s.w) * (s.y2 - s.y1);
  }

  // Call after the physics step, before the player's update.
  apply(player) {
    const b = player.body;
    const prev = this.last;
    const s = this.slopeAt(player.x);
    player.slopeGrounded = false;
    player.rampLaunch = 0; // set while standing on a ski-jump ramp
    this.last = null;

    if (s && b.velocity.y >= 0) {
      const surface = this.heightAt(player.x);
      // Stick while sliding downhill; otherwise only catch a player landing on it.
      const reach = prev ? SLOPES.stickDistance : 0;
      if (b.bottom >= surface - reach) {
        b.y = surface - b.height;
        b.velocity.y = 0;
        player.slopeGrounded = true;
        player.rampLaunch = s.launch ?? 0;
        this.last = s;
      }
    }

    // Ski-jump: just left the top of a launch ramp.
    if (!this.last && prev?.launch && player.x > prev.x + prev.w && b.velocity.x > 0) {
      player.launch(-b.velocity.x * prev.launch);
    }
  }

  reset() {
    this.last = null;
  }
}
