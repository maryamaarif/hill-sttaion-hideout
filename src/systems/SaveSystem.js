// Persists coins, unlocks and highest level in localStorage. Never throws:
// storage can be unavailable (private mode, blocked site data).
const KEY = 'hill-station-hideout-save-v1';

const DEFAULT_SAVE = { coins: 0, unlocks: [], highestLevel: 1 };

export default class SaveSystem {
  static load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULT_SAVE, ...JSON.parse(raw) } : { ...DEFAULT_SAVE };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  static save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // ignore: game still works without persistence
    }
  }
}
