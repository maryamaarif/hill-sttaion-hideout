import SaveSystem from './SaveSystem.js';

// Player settings, kept in the save (settings). `Settings.current` is a cached copy
// that is cheap to read every frame; `Settings.update` saves a change and tells
// listeners (`Settings.events`, event 'changed') so scenes can react right away.
//
//   muted, musicVolume, sfxVolume   audio
//   shake        camera shake on/off
//   colorBlind   cones and hazards also use patterns and outlines, not only colour
//   easy         slower detection and an extra life (EASY in config/game.js)
//   controls     { action: [Phaser key names] }; the first key is the one remapped
//                and shown in key icons, the others are fixed alternatives

export const DEFAULT_CONTROLS = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  jump: ['SPACE', 'UP', 'W'],
  hide: ['DOWN', 'S'],
};

// Keys that menus need; they can't be bound to actions.
export const RESERVED_KEYS = ['ESC', 'P', 'M', 'ENTER'];

export const ACTION_LABELS = { left: 'Move left', right: 'Move right', jump: 'Jump', hide: 'Hide / duck / dive' };

const events = new Phaser.Events.EventEmitter();

const Settings = {
  events,
  current: SaveSystem.load().settings,

  update(change) {
    const save = SaveSystem.update((d) => change(d.settings));
    this.current = save.settings;
    events.emit('changed', this.current);
    return this.current;
  },

  reload() {
    this.current = SaveSystem.load().settings;
    return this.current;
  },

  // Make `keyName` the main key for `action` (its other keys stay as alternatives)
  // and take it away from any other action.
  bind(action, keyName) {
    return this.update((s) => {
      for (const a of Object.keys(s.controls)) s.controls[a] = s.controls[a].filter((k) => k !== keyName);
      s.controls[action] = [keyName, ...s.controls[action].slice(1)];
    });
  },

  resetControls() {
    return this.update((s) => {
      s.controls = structuredClone(DEFAULT_CONTROLS);
    });
  },
};

export default Settings;
