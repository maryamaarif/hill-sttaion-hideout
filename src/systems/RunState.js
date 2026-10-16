import { EASY, LIVES } from '../config/game.js';
import SaveSystem from './SaveSystem.js';
import Settings from './Settings.js';

// The data passed between scenes during one level: which level/season we are on,
// lives carried between seasons, perks chosen on transition screens, items and
// hiding places from the shop, and when the level started (for the speed bonus).
export function newLevelRun(level, now, { items = [], hidingPlaces = [] } = {}) {
  const lives = LIVES.start + (Settings.current.easy ? EASY.extraLives : 0); // Easy mode: an extra life
  return { level, seasonIndex: 0, lives, perks: [], items, hidingPlaces, startTime: now };
}

// Start a level from the save: bought items are used up (taken out of the save),
// unlocked hiding places are always on.
export function newLevelRunFromSave(level, now) {
  let items = [];
  const save = SaveSystem.update((data) => {
    items = data.items;
    data.items = [];
  });
  return newLevelRun(level, now, { items, hidingPlaces: save.hidingPlaces });
}
