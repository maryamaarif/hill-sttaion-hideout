import { PERKS } from '../config/perks.js';
import { applyEffects } from './Effects.js';

// Applies the perks chosen during this run (run.perks = [key, ...]) to a season
// config. Only perks listed for that season take effect.
export default class PerkSystem {
  static optionsFor(seasonKey) {
    return PERKS[seasonKey] ?? [];
  }

  static activeFor(seasonKey, perkKeys = []) {
    return PerkSystem.optionsFor(seasonKey).filter((p) => perkKeys.includes(p.key));
  }

  static apply(season, perkKeys = []) {
    return applyEffects(season, PerkSystem.activeFor(season.key, perkKeys).flatMap((p) => p.effects));
  }
}
