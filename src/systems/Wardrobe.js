import { SEASON_ORDER } from '../seasons/index.js';

// Seasonal outfits. Each season config has:
//   wardrobe.outfit    the default outfit: { id, name, layers, effects?, ability?, foliage?, skis? }
//   wardrobe.variants  shop outfits: { id, name, cost, layers (overrides), effects?, camo? }
//   wardrobe.swaps     outfit changes for a hurdle: { <hurdleKey>: { layers (overrides) } }
//   wardrobe.puff      particles for the outfit-change spin: { texture, tint? }
// Layer overrides merge slot by slot ({ top: { color } } keeps the top's style);
// `accessories` replaces the list; `null` removes a slot (e.g. no hat while swimming).

function mergeLayers(base, over = {}) {
  const out = { ...base };
  for (const [slot, value] of Object.entries(over)) {
    if (value === null) out[slot] = null;
    else if (slot === 'accessories') out[slot] = value;
    else out[slot] = { ...(base[slot] ?? {}), ...value };
  }
  return out;
}

// The outfit to wear: default or equipped variant, plus a hurdle swap if any.
export function resolveOutfit(season, equippedId, swapKey = null) {
  const w = season.wardrobe;
  const base = w.outfit;
  let outfit = { ...base, effects: base.effects ?? [] };
  const variant = w.variants?.find((v) => v.id === equippedId);
  if (variant) {
    outfit = {
      ...outfit,
      id: variant.id,
      name: variant.name,
      camo: variant.camo,
      layers: mergeLayers(base.layers, variant.layers),
      effects: [...outfit.effects, ...(variant.effects ?? [])],
    };
  }
  const swap = swapKey && w.swaps?.[swapKey];
  if (swap) outfit = { ...outfit, id: `${outfit.id}+${swapKey}`, layers: mergeLayers(outfit.layers, swap.layers) };
  return outfit;
}

// Every outfit the shop can show, grouped by season (defaults first, always owned).
export function allOutfits() {
  return SEASON_ORDER.flatMap((s) => [
    { ...s.wardrobe.outfit, season: s.key, cost: 0, isDefault: true },
    ...(s.wardrobe.variants ?? []).map((v) => ({ ...v, season: s.key })),
  ]);
}

export function equippedId(save, seasonKey) {
  return save.equippedOutfits?.[seasonKey] ?? SEASON_ORDER.find((s) => s.key === seasonKey)?.wardrobe.outfit.id;
}
