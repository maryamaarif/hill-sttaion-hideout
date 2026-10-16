import { AUDIO, SFX } from '../config/audio.js';
import { TRACKS } from '../config/music.js';
import SaveSystem from './SaveSystem.js';

// All sound is synthesised with Web Audio (no audio files):
//   sound effects  recipes in src/config/audio.js
//   music          looping step-sequencer tracks in src/config/music.js
//
// One audio graph is shared by every scene, so music keeps playing across scene
// changes and crossfades when the track changes:
//   voices → track gain → music gain ┐
//   effects ──────────────→ sfx gain ┴→ master (mute) → speakers
// Volumes and mute come from the save (settings) and the M key mutes anywhere.

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SCHEDULE_AHEAD = 0.15; // seconds of music scheduled in advance
const TICK_MS = 30;

function noteToFreq(token) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(token);
  if (!m) return null;
  const semitone = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

// Turn a pattern string into steps: { freq, steps } note starts, 'hit'/'accent' drums.
function parsePattern(pattern) {
  const tokens = pattern.split(/\s+/).filter((t) => t && t !== '|');
  const steps = new Array(tokens.length).fill(null);
  let last = -1;
  tokens.forEach((t, i) => {
    if (t === '-') {
      if (last >= 0) steps[last].steps += 1;
    } else if (t === '.') {
      last = -1;
    } else if (t === 'x' || t === 'X') {
      steps[i] = { hit: true, accent: t === 'X', steps: 1 };
      last = -1;
    } else {
      steps[i] = { freq: noteToFreq(t), steps: 1 };
      last = i;
    }
  });
  return steps;
}

const audio = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  noise: null,
  track: null, // { key, gain, voices, step, nextTime, length, stepDur, timer }
  toast: null,

  init(game) {
    if (this.ctx || !game.sound.context) return;
    const ctx = game.sound.context;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicGain = ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain = ctx.createGain();
    this.sfxGain.connect(this.master);
    this.applySettings(SaveSystem.load().settings);
    window.__audio = this; // for debugging and automated playtests, like window.__game

    // M mutes everywhere (ignoring held-key repeats).
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) this.toggleMute();
    });
    // Browsers start audio suspended until the first key or click.
    const resume = () => ctx.state === 'suspended' && ctx.resume();
    window.addEventListener('keydown', resume);
    window.addEventListener('pointerdown', resume);
  },

  applySettings({ muted, musicVolume, sfxVolume }) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.02);
    this.musicGain.gain.setTargetAtTime(musicVolume, now, 0.02);
    this.sfxGain.gain.setTargetAtTime(sfxVolume * AUDIO.sfxVolume * 2, now, 0.02);
  },

  setVolume(kind, value) {
    const v = Math.round(Math.min(1, Math.max(0, value)) * 10) / 10;
    const save = SaveSystem.update((d) => {
      d.settings[kind === 'music' ? 'musicVolume' : 'sfxVolume'] = v;
    });
    this.applySettings(save.settings);
    return v;
  },

  toggleMute() {
    const save = SaveSystem.update((d) => {
      d.settings.muted = !d.settings.muted;
    });
    this.applySettings(save.settings);
    this.showToast(save.settings.muted ? '🔇 Sound off (M)' : '🔊 Sound on (M)');
    return save.settings.muted;
  },

  get muted() {
    return SaveSystem.load().settings.muted;
  },

  showToast(text) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toast);
    this.toast = setTimeout(() => el.classList.remove('show'), 1200);
  },

  // ----- sound effects -----

  play(name) {
    const notes = SFX[name];
    if (!notes || !this.ctx) return;
    const now = this.ctx.currentTime;
    for (const note of notes) this.voice(note, now + (note.start ?? 0), note.duration, this.sfxGain);
  },

  // One note: an oscillator or filtered noise with a short envelope.
  voice({ freq, to, type = 'sine', gain = 0.5, noise = false, release = 0 }, t0, duration, out) {
    const ctx = this.ctx;
    const t1 = t0 + duration;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    amp.gain.setValueAtTime(gain, Math.max(t0 + 0.01, t1 - 0.02));
    amp.gain.exponentialRampToValueAtTime(0.0001, t1 + release);
    amp.connect(out);
    let src;
    if (noise) {
      src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer();
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq, t0);
      filter.frequency.exponentialRampToValueAtTime(Math.max(100, (to ?? freq / 6)), t1);
      src.connect(filter).connect(amp);
    } else {
      src = ctx.createOscillator();
      src.type = type;
      src.frequency.setValueAtTime(freq, t0);
      if (to) src.frequency.exponentialRampToValueAtTime(to, t1);
      src.connect(amp);
    }
    src.start(t0);
    src.stop(t1 + release + 0.05);
  },

  noiseBuffer() {
    if (!this.noise) {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    return this.noise;
  },

  // ----- music -----

  playMusic(key) {
    if (!this.ctx || this.track?.key === key) return;
    this.stopMusic();
    const def = TRACKS[key];
    if (!def) return;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.8);
    gain.connect(this.musicGain);
    const voices = def.voices.map((v) => ({ ...v, steps: parsePattern(v.pattern) }));
    const track = {
      key,
      gain,
      voices,
      step: 0,
      length: Math.max(...voices.map((v) => v.steps.length)),
      stepDur: 60 / def.bpm / 2, // eighth notes
      nextTime: this.ctx.currentTime + 0.1,
    };
    track.timer = setInterval(() => this.schedule(track), TICK_MS);
    this.track = track;
  },

  stopMusic() {
    const old = this.track;
    if (!old) return;
    clearInterval(old.timer);
    const now = this.ctx.currentTime;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value || 0.0001, now);
    old.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    setTimeout(() => old.gain.disconnect(), 1500);
    this.track = null;
  },

  schedule(track) {
    const ctx = this.ctx;
    // If the tab slept, skip ahead instead of playing a burst of old notes.
    if (track.nextTime < ctx.currentTime - 0.5) track.nextTime = ctx.currentTime + 0.05;
    while (track.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      for (const v of track.voices) {
        const s = v.steps[track.step % v.steps.length];
        if (!s) continue;
        if (v.drum) this.drum(v.drum, track.nextTime, v.gain * (s.accent ? 1.6 : 1), track.gain);
        else if (s.freq) this.voice({ freq: s.freq, type: v.wave, gain: v.gain, release: v.release ?? 0.1 }, track.nextTime, s.steps * track.stepDur * 0.95, track.gain);
      }
      track.nextTime += track.stepDur;
      track.step = (track.step + 1) % track.length;
    }
  },

  drum(kind, t, gain, out) {
    if (kind === 'kick') this.voice({ freq: 140, to: 45, type: 'sine', gain }, t, 0.16, out);
    else if (kind === 'hat') this.voice({ freq: 9000, to: 6000, noise: true, gain }, t, 0.04, out);
    else if (kind === 'chuff') this.voice({ freq: 1600, to: 400, noise: true, gain }, t, 0.12, out);
  },
};

// Scene-facing wrapper (kept so scenes can do `new AudioSystem(this).play('chime')`).
export default class AudioSystem {
  constructor(scene) {
    audio.init(scene.game);
  }

  play(name) {
    audio.play(name);
  }

  playMusic(key) {
    audio.playMusic(key);
  }

  stopMusic() {
    audio.stopMusic();
  }

  stopAll() {
    audio.stopMusic();
  }
}

export { audio };
