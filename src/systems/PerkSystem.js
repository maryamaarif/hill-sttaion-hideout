import { PERKS } from '../config/perks.js';

// Applies the perks chosen during this run (run.perks = [key, ...]) to a season
// config. Only perks listed for that season take effect. Returns a new config;
// the original season config is never modified.
export default class PerkSystem {
  static optionsFor(seasonKey) {
    return PERKS[seasonKey] ?? [];
  }

  static activeFor(seasonKey, perkKeys = []) {
    return PerkSystem.optionsFor(seasonKey).filter((p) => perkKeys.includes(p.key));
  }

  static apply(season, perkKeys = []) {
    const active = PerkSystem.activeFor(season.key, perkKeys);
    if (!active.length) return season;
    const result = structuredClone({ ...season, layout: null });
    result.layout = season.layout; // layouts are shared data, not modified
    for (const perk of active) {
      for (const { path, mul, add } of perk.effects) {
        const keys = path.split('.');
        const last = keys.pop();
        const target = keys.reduce((obj, k) => obj?.[k], result);
        if (!target || typeof target[last] !== 'number') continue;
        if (mul != null) target[last] *= mul;
        if (add != null) target[last] += add;
      }
    }
    return result;
  }
}
