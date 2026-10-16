import { ITEMS, HIDING_PLACES } from '../config/shop.js';
import { applyEffects } from './Effects.js';

// Applies what the player brought from the shop to a season:
//   items          effects on every season (and the map flag)
//   hiding places  extra hiding spots added to that season's layout
export default class ShopSystem {
  static items(keys = []) {
    return ITEMS.filter((i) => keys.includes(i.key));
  }

  static apply(season, itemKeys = [], placeKeys = []) {
    let result = applyEffects(season, ShopSystem.items(itemKeys).flatMap((i) => i.effects ?? []));
    const places = HIDING_PLACES.filter((h) => h.season === season.key && placeKeys.includes(h.key));
    if (places.length) {
      result = {
        ...result,
        hidingSpots: [...(result.hidingSpots ?? []), ...places.map((h) => h.spot.kind)],
        layout: { ...result.layout, hidingSpots: [...(result.layout.hidingSpots ?? []), ...places.map((h) => h.spot)] },
      };
    }
    return result;
  }

  static hasMap(itemKeys = []) {
    return ShopSystem.items(itemKeys).some((i) => i.map);
  }
}
