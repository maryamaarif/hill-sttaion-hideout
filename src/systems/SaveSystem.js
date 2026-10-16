// Persists progress in localStorage. Never throws: storage can be unavailable
// (private mode, blocked site data), in which case the game still works and
// progress simply lasts until the page is closed (kept in memory).
//
// Save shape:
//   coins          coins to spend in the shop
//   highestLevel   level reached (the next level to play)
//   upgrades       room upgrade keys owned
//   items          item keys bought for the next level (used up when it starts)
//   hidingPlaces   hiding place keys unlocked (permanent)
//   settings       { muted }
const KEY = 'hill-station-hideout-save-v1';

const defaults = () => ({
  coins: 0,
  highestLevel: 1,
  upgrades: [],
  items: [],
  hidingPlaces: [],
  settings: { muted: false },
});

let memory = null; // fallback when localStorage is blocked

export default class SaveSystem {
  static load() {
    let stored = memory;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      // blocked or corrupt: fall back to memory / defaults
    }
    const base = defaults();
    const data = { ...base, ...(stored ?? {}) };
    data.settings = { ...base.settings, ...(stored?.settings ?? {}) };
    for (const list of ['upgrades', 'items', 'hidingPlaces']) {
      if (!Array.isArray(data[list])) data[list] = [];
    }
    return data;
  }

  static save(data) {
    memory = data;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // ignore: kept in memory for this session
    }
  }

  // Load, change, save in one step. Returns the saved data.
  static update(change) {
    const data = SaveSystem.load();
    change(data);
    SaveSystem.save(data);
    return data;
  }

  // Spend coins on a shop entry in `list` (if affordable and not owned).
  static buy(list, key, cost) {
    const data = SaveSystem.load();
    if (data[list].includes(key) || data.coins < cost) return false;
    data.coins -= cost;
    data[list].push(key);
    SaveSystem.save(data);
    return true;
  }
}
