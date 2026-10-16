// Cold meter (Winter). Out in the open inside layout.coldZones the meter drains;
// inside any hiding spot or near a warm window (layout.warmSpots) it refills.
// Empty = too cold (−1 life, like fainting in the heat).
//
// season.cold: { seconds, refillPerSec, warnAt }  (outfits can scale `seconds`)
export default class ColdSystem {
  constructor(zones = [], warmSpots = [], config = null) {
    this.zones = config ? zones : [];
    this.warmSpots = warmSpots;
    this.config = config;
    this.warmth = 1;
    this.warned = false;
    this.inCold = false;
  }

  get active() {
    return this.zones.length > 0;
  }

  inZone(x) {
    return this.zones.some((z) => x >= z.x && x <= z.x + z.w);
  }

  nearWarmth(x) {
    return this.warmSpots.some((w) => Math.abs(x - w.x) <= w.r);
  }

  // Returns 'freeze' when the meter runs out, 'warn' once when low, else null.
  update(dt, player, sheltered) {
    if (!this.active) return null;
    const cfg = this.config;
    this.inCold = this.inZone(player.x) && !sheltered && !this.nearWarmth(player.x);
    if (this.inCold) this.warmth = Math.max(0, this.warmth - dt / cfg.seconds);
    else this.warmth = Math.min(1, this.warmth + dt * cfg.refillPerSec);

    if (this.warmth <= 0) return 'freeze';
    if (this.warmth < cfg.warnAt && !this.warned) {
      this.warned = true;
      return 'warn';
    }
    if (this.warmth > cfg.warnAt + 0.2) this.warned = false;
    return null;
  }

  reset() {
    this.warmth = 1;
    this.warned = false;
  }
}
