// Applies effects to a season config and returns a new config (the original is
// never modified). An effect multiplies (`mul`) or adds to (`add`) a number found
// by dotted path, e.g. { path: 'physics.runSpeed', mul: 1.1 }. Missing paths are
// skipped, so one effect can safely target seasons that lack that setting.
export function applyEffects(season, effects = []) {
  if (!effects.length) return season;
  const result = structuredClone({ ...season, layout: null });
  result.layout = season.layout; // layouts are shared data, not modified here
  for (const { path, mul, add } of effects) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, k) => obj?.[k], result);
    if (!target || typeof target[last] !== 'number') continue;
    if (mul != null) target[last] *= mul;
    if (add != null) target[last] += add;
  }
  return result;
}
