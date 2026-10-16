import { AUDIO, SFX } from '../config/audio.js';

// Plays the synthesised effects from src/config/audio.js on Phaser's Web Audio
// context. Silently does nothing if Web Audio is unavailable or still locked.
export default class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.ctx = scene.sound.context ?? null;
  }

  play(name) {
    const notes = SFX[name];
    const ctx = this.ctx;
    if (!notes || !ctx || this.scene.sound.mute) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    for (const note of notes) this.playNote(ctx, now, note);
  }

  playNote(ctx, now, { freq, to, type = 'sine', start = 0, duration, gain = 0.5, noise = false }) {
    const t0 = now + start;
    const t1 = t0 + duration;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain * AUDIO.sfxVolume, t0 + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t1);
    amp.connect(ctx.destination);

    let source;
    if (noise) {
      source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq, t0);
      filter.frequency.exponentialRampToValueAtTime(Math.max(100, freq / 6), t1);
      source.connect(filter).connect(amp);
    } else {
      source = ctx.createOscillator();
      source.type = type;
      source.frequency.setValueAtTime(freq, t0);
      if (to) source.frequency.exponentialRampToValueAtTime(to, t1);
      source.connect(amp);
    }
    source.start(t0);
    source.stop(t1 + 0.02);
  }

  noiseBuffer(ctx) {
    if (!AudioSystem.noise) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      AudioSystem.noise = buffer;
    }
    return AudioSystem.noise;
  }

  // Season music comes later.
  playMusic(_key) {}
  stopAll() {}
}
