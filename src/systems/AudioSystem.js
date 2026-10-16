import { AUDIO, SFX, STEPS } from '../config/audio.js';
import { TRACKS, TENSION } from '../config/music.js';
import Settings from './Settings.js';

// All sound is synthesised with Web Audio (no audio files):
//   sound effects  recipes in src/config/audio.js (+ footsteps per ground surface)
//   music          looping arrangements of one shared theme (src/config/music.js),
//                  played on synthesised instruments, with a tension layer that
//                  fades in while police are noticing the player
//   ambience       layered, generated soundscapes per season (season.ambience)
//
// One audio graph is shared by every scene, so music keeps playing across scene
// changes and crossfades when the track changes:
//   instruments → track gain ─┬────────────→ music gain ┐
//   tension     → tension gain┘  └→ reverb ─→ music gain │
//   effects, footsteps ───────────────────→ sfx gain ────┼→ master (mute) → speakers
//   ambience layers → ambience gain ──────→ sfx gain     │
// The music slider scales music, the SFX slider scales effects and ambience, and
// M mutes everything (saved in settings).

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SCHEDULE_AHEAD = 0.15; // seconds of music scheduled in advance
const TICK_MS = 30;
const rand = (a, b) => a + Math.random() * (b - a);

function noteToFreq(token, transpose = 0) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(token);
  if (!m) return null;
  const semitone = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semitone + transpose;
  return 440 * 2 ** ((midi - 69) / 12);
}

// Turn a pattern string into steps: { freqs, steps } note/chord starts, 'hit' drums.
function parsePattern(pattern, transpose = 0) {
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
      steps[i] = { freqs: t.split('+').map((n) => noteToFreq(n, transpose)).filter(Boolean), steps: 1 };
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
  reverb: null,
  track: null, // { key, gain, tensionGain, voices, tension, step, nextTime, length, stepDur, timer }
  tensionLevel: 0,
  ambience: null, // { key, gain, layers, timer, event }
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
    this.reverb = this.makeReverb(2.6);
    this.reverb.connect(this.musicGain);
    // Ambience has its own reverb send (distant whistles, birds).
    this.ambReverb = this.makeReverb(3.2);
    this.ambReverb.connect(this.sfxGain);
    this.applySettings(Settings.current);
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

  // A hall reverb from a generated impulse response (decaying stereo noise).
  makeReverb(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    return conv;
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
    this.applySettings(Settings.update((s) => {
      s[kind === 'music' ? 'musicVolume' : 'sfxVolume'] = v;
    }));
    return v;
  },

  toggleMute() {
    const s = Settings.update((st) => {
      st.muted = !st.muted;
    });
    this.applySettings(s);
    this.showToast(s.muted ? '🔇 Sound off (M)' : '🔊 Sound on (M)');
    return s.muted;
  },

  get muted() {
    return Settings.current.muted;
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

  // jitter: random pitch/loudness variation (footsteps never sound identical).
  play(name, { jitter = 0, recipes = SFX } = {}) {
    const notes = recipes[name];
    if (!notes || !this.ctx) return;
    const now = this.ctx.currentTime;
    const pitch = 1 + rand(-jitter, jitter);
    const loud = 1 + rand(-jitter, jitter * 0.5);
    for (const note of notes) {
      // `grains`: repeat a short burst a few times at random offsets (crunch, crackle).
      const grains = note.grains ?? 1;
      for (let g = 0; g < grains; g++) {
        const offset = grains > 1 ? rand(0, note.spread ?? 0.05) : 0;
        const n = { ...note, freq: note.freq * pitch, to: note.to ? note.to * pitch : undefined, gain: note.gain * loud * (grains > 1 ? rand(0.5, 1) : 1) };
        this.voice(n, now + (note.start ?? 0) + offset, note.duration, this.sfxGain);
      }
    }
  },

  // Footstep on a ground surface (grass, wetGrass, gravel, wood, stone, leaves, snow).
  playStep(surface) {
    this.play(surface, { jitter: 0.12, recipes: STEPS });
  },

  // One note: an oscillator or filtered noise with a short envelope.
  voice({ freq, to, type = 'sine', gain = 0.5, noise = false, filter = 'lowpass', q = 1, release = 0 }, t0, duration, out) {
    const ctx = this.ctx;
    const t1 = t0 + duration;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.005);
    amp.gain.setValueAtTime(Math.max(0.0002, gain), Math.max(t0 + 0.006, t1 - 0.02));
    amp.gain.exponentialRampToValueAtTime(0.0001, t1 + release);
    amp.connect(out);
    let src;
    if (noise) {
      src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer();
      src.loop = true;
      src.loopStart = Math.random() * 0.5;
      const f = ctx.createBiquadFilter();
      f.type = filter;
      f.Q.value = q;
      f.frequency.setValueAtTime(freq, t0);
      f.frequency.exponentialRampToValueAtTime(Math.max(60, to ?? (filter === 'lowpass' ? freq / 6 : freq)), t1);
      src.connect(f).connect(amp);
      src.start(t0, Math.random() * 0.5);
    } else {
      src = ctx.createOscillator();
      src.type = type;
      src.frequency.setValueAtTime(freq, t0);
      if (to) src.frequency.exponentialRampToValueAtTime(to, t1);
      src.connect(amp);
      src.start(t0);
    }
    src.stop(t1 + release + 0.05);
  },

  noiseBuffer() {
    if (!this.noise) {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    return this.noise;
  },

  // ----- instruments -----

  osc(type, freq, t0, t1, out, detuneCents = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.detune.value = detuneCents;
    o.connect(out);
    o.start(t0);
    o.stop(t1);
    return o;
  },

  // An amplitude envelope node: attack, (optional) exponential decay, release.
  env(t0, dur, peak, { attack = 0.01, decay = null, sustain = 1, release = 0.1 } = {}) {
    const g = this.ctx.createGain();
    const p = Math.max(0.0002, peak);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(p, t0 + attack);
    if (decay) {
      g.gain.setTargetAtTime(Math.max(0.0001, p * sustain), t0 + attack, decay);
    } else {
      g.gain.setValueAtTime(p * sustain, Math.max(t0 + attack + 0.001, t0 + dur));
    }
    g.gain.setTargetAtTime(0.0001, t0 + dur, release / 3);
    return g;
  },

  vibrato(osc, t0, t1, rate, depthHz, delay = 0.12) {
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = rate;
    const depth = this.ctx.createGain();
    depth.gain.setValueAtTime(0, t0);
    depth.gain.linearRampToValueAtTime(depthHz, t0 + delay + 0.2);
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t1);
  },

  // Play one note of an instrument; `out` is the track (or tension) gain.
  instrument(name, freq, t0, dur, gain, out) {
    const ctx = this.ctx;
    const end = t0 + dur + 2.5;
    switch (name) {
      case 'flute': { // breathy sine with delayed vibrato
        const e = this.env(t0, dur, gain, { attack: 0.06, release: 0.15 });
        e.connect(out);
        const o = this.osc('sine', freq, t0, end, e);
        this.vibrato(o, t0, end, 5.2, freq * 0.007);
        const h = ctx.createGain();
        h.gain.value = 0.12;
        h.connect(e);
        this.osc('triangle', freq * 2, t0, end, h);
        this.voice({ freq: freq * 2.2, to: freq * 1.6, noise: true, filter: 'bandpass', q: 2, gain: gain * 0.25 }, t0, 0.07, out);
        return;
      }
      case 'marimba': { // wooden bar: fundamental + fast-decaying 4th partial
        const e = this.env(t0, 0.02, gain, { attack: 0.003, decay: 0.16, sustain: 0.001, release: 0.4 });
        e.connect(out);
        this.osc('sine', freq, t0, t0 + 1.2, e);
        const e2 = this.env(t0, 0.01, gain * 0.35, { attack: 0.002, decay: 0.03, sustain: 0.001, release: 0.1 });
        e2.connect(out);
        this.osc('sine', freq * 3.93, t0, t0 + 0.4, e2);
        return;
      }
      case 'guitar': { // plucked string: bright sawtooth through a closing filter
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.Q.value = 2;
        f.frequency.setValueAtTime(freq * 9, t0);
        f.frequency.setTargetAtTime(freq * 1.5, t0, 0.08);
        const e = this.env(t0, 0.01, gain, { attack: 0.002, decay: 0.22, sustain: 0.001, release: 0.3 });
        f.connect(e).connect(out);
        this.osc('sawtooth', freq, t0, t0 + 1.2, f);
        this.osc('sawtooth', freq, t0, t0 + 1.2, f, 6);
        return;
      }
      case 'accordion': { // two detuned reeds, gentle tremolo, warm filter
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 1800;
        const trem = ctx.createGain();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5;
        const depth = ctx.createGain();
        depth.gain.value = 0.15;
        lfo.connect(depth).connect(trem.gain);
        lfo.start(t0);
        lfo.stop(end);
        const e = this.env(t0, dur, gain, { attack: 0.05, release: 0.12 });
        f.connect(trem).connect(e).connect(out);
        this.osc('sawtooth', freq, t0, end, f, -7);
        this.osc('sawtooth', freq, t0, end, f, 7);
        this.osc('square', freq / 2, t0, end, f).detune.value = 3;
        return;
      }
      case 'piano': { // hammered: triangle + partials with a natural decay
        const tau = 0.35 + Math.min(1.2, 220 / freq);
        const e = this.env(t0, Math.min(dur, 0.02), gain, { attack: 0.003, decay: tau, sustain: 0.001, release: 0.25 });
        e.connect(out);
        this.osc('triangle', freq, t0, t0 + tau * 5, e);
        const p2 = ctx.createGain();
        p2.gain.value = 0.25;
        p2.connect(e);
        this.osc('sine', freq * 2, t0, t0 + tau * 5, p2);
        const p3 = ctx.createGain();
        p3.gain.value = 0.08;
        p3.connect(e);
        this.osc('sine', freq * 3.01, t0, t0 + tau * 5, p3);
        return;
      }
      case 'bell': { // FM bell: inharmonic shimmer fading into a pure tone
        const e = this.env(t0, 0.01, gain, { attack: 0.002, decay: 0.9, sustain: 0.001, release: 1.5 });
        e.connect(out);
        const carrier = this.osc('sine', freq, t0, t0 + 4, e);
        const mod = ctx.createOscillator();
        mod.frequency.value = freq * 3.5;
        const idx = ctx.createGain();
        idx.gain.setValueAtTime(freq * 1.8, t0);
        idx.gain.setTargetAtTime(0.0001, t0, 0.35);
        mod.connect(idx).connect(carrier.frequency);
        mod.start(t0);
        mod.stop(t0 + 4);
        const p = ctx.createGain();
        p.gain.value = 0.18;
        p.connect(e);
        this.osc('sine', freq * 2.76, t0, t0 + 4, p);
        return;
      }
      case 'strings': // bowed ensemble: three detuned saws, slow attack, vibrato
      case 'stacc': { // the same, played short (tension ostinato)
        const short = name === 'stacc';
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = short ? 1100 : 1500;
        const e = this.env(t0, short ? Math.min(dur, 0.12) : dur, gain, short ? { attack: 0.012, release: 0.08 } : { attack: 0.35, release: 0.6 });
        f.connect(e).connect(out);
        for (const cents of [-9, 0, 9]) {
          const o = this.osc('sawtooth', freq, t0, end, f, cents);
          if (!short) this.vibrato(o, t0, end, 5, freq * 0.004, 0.3);
        }
        return;
      }
      case 'bass': { // round sine bass
        const e = this.env(t0, dur, gain, { attack: 0.02, release: 0.2 });
        e.connect(out);
        this.osc('sine', freq, t0, end, e);
        const h = ctx.createGain();
        h.gain.value = 0.2;
        h.connect(e);
        this.osc('triangle', freq * 2, t0, end, h);
        return;
      }
      case 'pluckBass': {
        const e = this.env(t0, 0.01, gain, { attack: 0.004, decay: 0.18, sustain: 0.001, release: 0.15 });
        e.connect(out);
        this.osc('triangle', freq, t0, t0 + 1, e);
        return;
      }
      default: { // 'pad' and plain waves
        const e = this.env(t0, dur, gain, { attack: 0.03, release: 0.3 });
        e.connect(out);
        this.osc(name === 'pad' ? 'sine' : name, freq, t0, end, e);
      }
    }
  },

  drum(kind, t, gain, out) {
    if (kind === 'kick') this.voice({ freq: 140, to: 45, type: 'sine', gain }, t, 0.16, out);
    else if (kind === 'hat') this.voice({ freq: 9000, to: 6000, noise: true, filter: 'highpass', gain }, t, 0.04, out);
    else if (kind === 'shaker') this.voice({ freq: 7000, to: 5000, noise: true, filter: 'bandpass', q: 1.5, gain }, t, 0.06, out);
    else if (kind === 'brush') this.voice({ freq: 4000, to: 1500, noise: true, filter: 'bandpass', q: 0.8, gain }, t, 0.14, out);
    else if (kind === 'chuff') this.voice({ freq: 1600, to: 400, noise: true, gain }, t, 0.12, out);
  },

  // ----- music -----

  playMusic(key) {
    if (!this.ctx || this.track?.key === key) return;
    this.stopMusic();
    const def = TRACKS[key];
    if (!def) return;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(1, now + 0.8);
    gain.connect(this.musicGain);
    const send = this.ctx.createGain();
    send.gain.value = def.reverb ?? 0.2;
    gain.connect(send).connect(this.reverb);
    // Tension stem (season tracks only), silent until setTension() raises it.
    const tensionGain = this.ctx.createGain();
    tensionGain.gain.value = 0.0001;
    tensionGain.connect(gain);
    const parse = (v) => ({ ...v, steps: parsePattern(v.pattern, v.transpose ?? 0) });
    const voices = def.voices.map(parse);
    const tension = key === 'room' ? [] : TENSION.voices.map(parse);
    const track = {
      key,
      gain,
      tensionGain,
      voices,
      tension,
      step: 0,
      length: Math.max(...voices.map((v) => v.steps.length)),
      stepDur: 60 / def.bpm / 2, // eighth notes
      nextTime: now + 0.1,
    };
    track.timer = setInterval(() => this.schedule(track), TICK_MS);
    this.track = track;
    this.setTension(0, true);
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

  // Tension layer level 0..1: fades in quickly while a detection meter fills, and
  // out slowly once the player hides or is out of sight.
  setTension(level, instant = false) {
    const t = this.track;
    if (!t || !this.ctx) return;
    const target = Math.max(0, Math.min(1, level));
    if (!instant && Math.abs(target - this.tensionLevel) < 0.02) return;
    const rising = target > this.tensionLevel;
    this.tensionLevel = target;
    t.tensionGain.gain.setTargetAtTime(Math.max(0.0001, target), this.ctx.currentTime, instant ? 0.01 : rising ? TENSION.fadeInSec : TENSION.fadeOutSec);
  },

  schedule(track) {
    const ctx = this.ctx;
    // If the tab slept, skip ahead instead of playing a burst of old notes.
    if (track.nextTime < ctx.currentTime - 0.5) track.nextTime = ctx.currentTime + 0.05;
    while (track.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      this.scheduleVoices(track.voices, track, track.gain);
      // Only spend voices on the tension stem while it can be heard.
      if (this.tensionLevel > 0.02) this.scheduleVoices(track.tension, track, track.tensionGain);
      track.nextTime += track.stepDur;
      track.step = (track.step + 1) % track.length;
    }
  },

  scheduleVoices(voices, track, out) {
    for (const v of voices) {
      const s = v.steps[track.step % v.steps.length];
      if (!s) continue;
      if (v.drum) this.drum(v.drum, track.nextTime, v.gain * (s.accent ? 1.6 : 1), out);
      else if (s.freqs) {
        for (const f of s.freqs) {
          if (v.instrument) this.instrument(v.instrument, f, track.nextTime, s.steps * track.stepDur * 0.95, v.gain, out);
          else this.voice({ freq: f, type: v.wave, gain: v.gain, release: v.release ?? 0.1 }, track.nextTime, s.steps * track.stepDur * 0.95, out);
        }
      }
    }
  },

  // ----- ambience -----

  // Layered generated soundscape (season.ambience.layers). Crossfades between
  // seasons; `event` layers swell during the season's weather event.
  playAmbience(key, def) {
    if (!this.ctx) return;
    if (this.ambience?.key === key) return;
    this.stopAmbience();
    if (!def?.layers?.length) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(def.gain ?? 1, now + 1.5);
    gain.connect(this.sfxGain);
    const amb = { key, gain, layers: [], sources: [], event: false };
    for (const layer of def.layers) {
      const out = ctx.createGain();
      out.gain.value = layer.gain;
      out.connect(gain);
      const l = { def: layer, out, nextAt: now + rand(0.5, 3) };
      amb.layers.push(l);
      this.startLayer(amb, l);
    }
    // Random events (birds, whistles, water laps, gust swells) on a slow tick.
    amb.timer = setInterval(() => this.tickAmbience(amb), 120);
    this.ambience = amb;
  },

  stopAmbience() {
    const amb = this.ambience;
    if (!amb) return;
    clearInterval(amb.timer);
    const now = this.ctx.currentTime;
    amb.gain.gain.cancelScheduledValues(now);
    amb.gain.gain.setValueAtTime(amb.gain.gain.value || 0.0001, now);
    amb.gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    setTimeout(() => {
      amb.sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
      amb.gain.disconnect();
    }, 1600);
    this.ambience = null;
  },

  // The season's weather event started or ended: swell the layers tied to it.
  setAmbienceEvent(on) {
    const amb = this.ambience;
    if (!amb || amb.event === on) return;
    amb.event = on;
    const now = this.ctx.currentTime;
    for (const l of amb.layers) {
      if (l.def.eventGain == null) continue;
      l.out.gain.setTargetAtTime(on ? l.def.eventGain : l.def.gain, now, 1.2);
    }
  },

  loopNoise(amb, out) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    src.connect(out);
    src.start(this.ctx.currentTime, Math.random() * 1.5);
    amb.sources.push(src);
    return src;
  },

  lfo(amb, rate, depth, target, type = 'sine') {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    amb.sources.push(o);
  },

  filter(type, freq, q = 1) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  },

  // Continuous beds; random one-shots are handled in tickAmbience.
  startLayer(amb, l) {
    const d = l.def;
    switch (d.kind) {
      case 'rain': { // light rain: band-limited noise with a gentle shimmer
        const hp = this.filter('highpass', d.low ?? 900);
        const lp = this.filter('lowpass', d.high ?? 7000);
        this.loopNoise(amb, hp);
        hp.connect(lp).connect(l.out);
        return;
      }
      case 'cicadas': { // buzzing insects: band-passed noise pulsed fast, swelling slowly
        for (const [shift, pulse] of [[1, d.pulse ?? 38], [1.18, (d.pulse ?? 38) * 1.27]]) {
          const bp = this.filter('bandpass', (d.freq ?? 5200) * shift, 7);
          const vca = this.ctx.createGain();
          vca.gain.value = 0.5;
          this.lfo(amb, pulse, 0.5, vca.gain, 'square');
          const swell = this.ctx.createGain();
          swell.gain.value = 0.55;
          this.lfo(amb, 1 / ((d.swellSec ?? 9) * shift), 0.45, swell.gain);
          this.loopNoise(amb, bp);
          bp.connect(vca).connect(swell).connect(l.out);
        }
        return;
      }
      case 'water': { // lapping water: low rumbling noise rising and falling
        const lp = this.filter('lowpass', d.cutoff ?? 500, 0.7);
        const vca = this.ctx.createGain();
        vca.gain.value = 0.55;
        this.lfo(amb, d.rate ?? 0.22, 0.35, vca.gain);
        this.lfo(amb, (d.rate ?? 0.22) * 0.61, 0.2, vca.gain);
        this.loopNoise(amb, lp);
        lp.connect(vca).connect(l.out);
        return;
      }
      case 'wind': { // wind: band-passed noise whose pitch and level wander; `howl` adds a whistling resonance
        const bp = this.filter('bandpass', d.low ?? 300, d.q ?? 1.2);
        const vca = this.ctx.createGain();
        vca.gain.value = 0.6;
        this.loopNoise(amb, bp);
        bp.connect(vca).connect(l.out);
        l.wander = [{ param: bp.frequency, low: d.low ?? 300, high: d.high ?? 900 }, { param: vca.gain, low: 0.25, high: 1 }];
        if (d.howl) {
          const res = this.filter('bandpass', d.low ?? 300, 14);
          const hv = this.ctx.createGain();
          hv.gain.value = 1.6;
          this.loopNoise(amb, res);
          res.connect(hv).connect(l.out);
          l.wander.push({ param: res.frequency, low: (d.low ?? 300) * 1.2, high: (d.high ?? 700) * 1.1 }, { param: hv.gain, low: 0.4, high: 2.2 });
        }
        return;
      }
      default: // one-shot layers (birds, whistle, laps) have no bed
    }
  },

  tickAmbience(amb) {
    const now = this.ctx.currentTime;
    for (const l of amb.layers) {
      const d = l.def;
      if (l.wander && now >= l.nextAt) {
        // Gusts: drift towards a new random pitch and level.
        for (const w of l.wander) w.param.setTargetAtTime(rand(w.low, w.high), now, rand(0.6, 1.8));
        l.nextAt = now + rand(1.2, 3);
        continue;
      }
      if (!d.every || now < l.nextAt) continue;
      l.nextAt = now + rand(d.every[0], d.every[1]) / (amb.event && d.eventEvery ? d.eventEvery : 1);
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = rand(-0.8, 0.8);
      pan.connect(l.out);
      if (d.reverb) {
        const send = this.ctx.createGain();
        send.gain.value = d.reverb;
        pan.connect(send).connect(this.ambReverb);
      }
      const t = now + 0.05;
      if (d.kind === 'birds') this.birdCall(t, pan, d.species ?? ['chirp', 'warble', 'trill']);
      else if (d.kind === 'whistle') this.trainWhistle(t, pan, d);
      else if (d.kind === 'laps') this.voice({ freq: rand(300, 500), to: rand(900, 1400), noise: true, filter: 'bandpass', q: 1.2, gain: 0.5 }, t, rand(0.5, 0.9), pan);
      else if (d.kind === 'drips') this.voice({ freq: rand(1400, 2600), to: rand(700, 1000), type: 'sine', gain: 0.25 }, t, 0.05, pan);
      setTimeout(() => pan.disconnect(), 4000);
    }
  },

  birdCall(t, out, species) {
    const kind = species[Math.floor(Math.random() * species.length)];
    const base = rand(2600, 4200);
    if (kind === 'chirp') {
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.voice({ freq: base, to: base * 1.35, type: 'sine', gain: 0.35 }, t + i * 0.11, 0.06, out);
    } else if (kind === 'trill') {
      for (let i = 0; i < 9; i++) this.voice({ freq: i % 2 ? base * 1.12 : base, type: 'sine', gain: 0.22 }, t + i * 0.035, 0.03, out);
    } else { // warble: a sweeping, wobbling phrase
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.25, t + 0.2);
      o.frequency.linearRampToValueAtTime(base * 0.9, t + 0.45);
      const mod = this.ctx.createOscillator();
      mod.frequency.value = 28;
      const depth = this.ctx.createGain();
      depth.gain.value = base * 0.06;
      mod.connect(depth).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      g.gain.setTargetAtTime(0.0001, t + 0.4, 0.05);
      o.connect(g).connect(out);
      o.start(t);
      mod.start(t);
      o.stop(t + 0.6);
      mod.stop(t + 0.6);
    }
  },

  // A distant steam whistle: a two-note chord that bends up, filtered and reverberant.
  trainWhistle(t, out, d) {
    const dur = d.duration ?? 1.4;
    const lp = this.filter('lowpass', 1600);
    const e = this.env(t, dur, 0.3, { attack: 0.12, release: 0.4 });
    lp.connect(e).connect(out);
    for (const f of d.notes ?? [523, 659]) {
      const o = this.osc('sawtooth', f * 0.94, t, t + dur + 1, lp);
      o.frequency.linearRampToValueAtTime(f, t + 0.15);
      this.vibrato(o, t, t + dur + 1, 6, f * 0.006, 0.2);
    }
    this.voice({ freq: 2400, noise: true, filter: 'bandpass', q: 3, gain: 0.08 }, t, dur, out);
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

  playStep(surface) {
    audio.playStep(surface);
  }

  playMusic(key) {
    audio.playMusic(key);
  }

  stopMusic() {
    audio.stopMusic();
  }

  setTension(level) {
    audio.setTension(level);
  }

  playAmbience(key, def) {
    audio.playAmbience(key, def);
  }

  stopAmbience() {
    audio.stopAmbience();
  }

  setAmbienceEvent(on) {
    audio.setAmbienceEvent(on);
  }

  stopAll() {
    audio.stopMusic();
    audio.stopAmbience();
  }
}

export { audio };
