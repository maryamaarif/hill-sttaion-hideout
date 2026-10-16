// Looping music, synthesised with Web Audio (no audio files).
//
// ONE SHARED MELODY. Every season plays the same theme over the same chord
// progression (C | Am | F | G | C | Am | F G | C); only the arrangement changes:
//   Spring  light flute over soft piano arpeggios        (84 bpm)
//   Summer  upbeat marimba, plucked-guitar offbeats, drums (124 bpm)
//   Fall    warm accordion with an oom-pah piano and a steam-train rhythm (100 bpm)
//   Winter  slow bells over a string pad                  (66 bpm)
//   Room    solo piano with strings (menu, your room, level complete)
// So the audio stays consistent while each season sounds different.
//
// Each track loops 64 eighth-note steps at `bpm`. Each voice has a pattern: one
// token per step, separated by spaces ('|' between bars for readability):
//   C5, F#4, Bb3   play that note        C4+E4+G4  play a chord
//   -              hold the previous note/chord
//   .              rest
// Drum voices use  x = hit, X = accented hit, . = rest.
//
// Voice options:
//   instrument  see INSTRUMENTS in systems/AudioSystem.js: flute, marimba, guitar,
//               accordion, piano, bell, strings, stacc, bass, pluckBass, pad
//   drum        kick | hat | shaker | chuff | brush
//   gain        loudness before the music volume slider
//   transpose   semitones (e.g. -12 = an octave down)
// Track options: bpm, reverb (0..1 send to the shared hall reverb).
//
// TENSION is a second layer added to every season track at the same tempo; it fades
// in while a police detection meter is filling (AudioSystem.setTension).

// The shared theme (8 bars).
export const THEME =
  'E5 - G5 - A5 - G5 - | E5 - D5 - C5 - - - | D5 - E5 - G5 - E5 - | D5 - - - - - . . |' +
  'E5 - G5 - A5 - C6 - | A5 - G5 - E5 - - - | D5 - E5 - D5 - C5 - | C5 - - - - - . . ';

// The same theme, short and bouncy (marimba): every held note becomes a repeat or rest.
const THEME_BOUNCE =
  'E5 . G5 . A5 . G5 . | E5 . D5 . C5 . C5 . | D5 . E5 . G5 . E5 . | D5 . D5 . . . . . |' +
  'E5 . G5 . A5 . C6 . | A5 . G5 . E5 . E5 . | D5 . E5 . D5 . C5 . | C5 . C5 . . . . . ';

// One chord per bar (bar 7 splits F | G).
const C = 'C4+E4+G4';
const Am = 'A3+C4+E4';
const F = 'F3+A3+C4';
const G = 'G3+B3+D4';
const PAD = `${C} - - - - - - - | ${Am} - - - - - - - | ${F} - - - - - - - | ${G} - - - - - - - |` +
  `${C} - - - - - - - | ${Am} - - - - - - - | ${F} - - - ${G} - - - | ${C} - - - - - - - `;
const STRUM = `. ${C} . ${C} . ${C} . ${C} | . ${Am} . ${Am} . ${Am} . ${Am} | . ${F} . ${F} . ${F} . ${F} | . ${G} . ${G} . ${G} . ${G} |` +
  `. ${C} . ${C} . ${C} . ${C} | . ${Am} . ${Am} . ${Am} . ${Am} | . ${F} . ${F} . ${G} . ${G} | . ${C} . ${C} . ${C} . . `;
const ARPEGGIO =
  'C4 E4 G4 E4 C5 G4 E4 G4 | A3 C4 E4 C4 A4 E4 C4 E4 | F3 A3 C4 A3 F4 C4 A3 C4 | G3 B3 D4 B3 G4 D4 B3 D4 |' +
  'C4 E4 G4 E4 C5 G4 E4 G4 | A3 C4 E4 C4 A4 E4 C4 E4 | F3 A3 C4 A3 G3 B3 D4 B3 | C4 E4 G4 C5 G4 E4 C4 . ';
const BASS_SLOW =
  'C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - C3 - - - | G2 - - - G2 - - - |' +
  'C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - G2 - - - | C3 - - - - - - - ';
const BASS_BOUNCE =
  'C3 . C3 . G2 . G2 . | A2 . A2 . E2 . E2 . | F2 . F2 . C3 . C3 . | G2 . G2 . B2 . G2 . |' +
  'C3 . C3 . G2 . G2 . | A2 . A2 . E2 . E2 . | F2 . F2 . G2 . G2 . | C3 . C3 . G2 . B2 . ';
const OOMPAH = `C3 . ${C} . G2 . ${C} . | A2 . ${Am} . E2 . ${Am} . | F2 . ${F} . C3 . ${F} . | G2 . ${G} . D3 . ${G} . |` +
  `C3 . ${C} . G2 . ${C} . | A2 . ${Am} . E2 . ${Am} . | F2 . ${F} . G2 . ${G} . | C3 . ${C} . . . . . `;
const DRONE =
  'C2 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | G1 - - - - - - - |' +
  'C2 - - - - - - - | A1 - - - - - - - | F1 - - - G1 - - - | C2 - - - - - - - ';
const bars = (bar) => Array(8).fill(bar).join(' | ');

export const TRACKS = {
  spring: {
    bpm: 84,
    reverb: 0.35,
    voices: [
      { instrument: 'flute', gain: 0.15, pattern: THEME },
      { instrument: 'piano', gain: 0.05, pattern: ARPEGGIO },
      { instrument: 'bass', gain: 0.13, pattern: BASS_SLOW },
      { instrument: 'bell', gain: 0.03, pattern:
        'C6 . . . . . . . | . . . . E6 . . . | . . . . . . . . | G6 . . . . . . . |' +
        '. . . . C6 . . . | . . . . . . . . | E6 . . . . . . . | . . . . . . . . ' },
    ],
  },

  summer: {
    bpm: 124,
    reverb: 0.15,
    voices: [
      { instrument: 'marimba', gain: 0.22, pattern: THEME_BOUNCE },
      { instrument: 'guitar', gain: 0.045, pattern: STRUM },
      { instrument: 'pluckBass', gain: 0.16, pattern: BASS_BOUNCE },
      { drum: 'kick', gain: 0.32, pattern: bars('X . . . X . . .') },
      { drum: 'hat', gain: 0.04, pattern: bars('. x . x . x . x') },
      { drum: 'shaker', gain: 0.035, pattern: bars('x x x x x x x x') },
    ],
  },

  fall: {
    bpm: 100,
    reverb: 0.25,
    voices: [
      { instrument: 'accordion', gain: 0.1, transpose: -12, pattern: THEME },
      { instrument: 'piano', gain: 0.08, pattern: OOMPAH },
      { drum: 'chuff', gain: 0.05, pattern: bars('X x x x X x x x') },
      { drum: 'brush', gain: 0.03, pattern: bars('. . x . . . x .') },
    ],
  },

  winter: {
    bpm: 66,
    reverb: 0.55,
    voices: [
      { instrument: 'bell', gain: 0.17, pattern: THEME },
      { instrument: 'strings', gain: 0.028, pattern: PAD },
      { instrument: 'strings', gain: 0.05, pattern: DRONE },
      { instrument: 'bell', gain: 0.025, transpose: 12, pattern:
        '. . . . . . . . | . . . . E6 . . . | . . . . . . . . | . . . . . . B6 . |' +
        '. . . . . . . . | . . . . A6 . . . | . . . . . . . . | . . . . . . . . ' },
    ],
  },

  room: {
    bpm: 76,
    reverb: 0.35,
    voices: [
      { instrument: 'piano', gain: 0.13, pattern: THEME },
      { instrument: 'strings', gain: 0.02, pattern: PAD },
      { instrument: 'bass', gain: 0.1, pattern: BASS_SLOW },
    ],
  },
};

// Tension layer: low pulsing strings on the chord roots, a heartbeat and a ticking
// clock, plus a thin dissonant cluster high above. Same progression as the theme.
export const TENSION = {
  voices: [
    { instrument: 'stacc', gain: 0.06, pattern:
      'C3 C3 C3 C3 C3 C3 C3 C3 | A2 A2 A2 A2 A2 A2 A2 A2 | F2 F2 F2 F2 F2 F2 F2 F2 | G2 G2 G2 G2 G2 G2 G2 G2 |' +
      'C3 C3 C3 C3 C3 C3 C3 C3 | A2 A2 A2 A2 A2 A2 A2 A2 | F2 F2 F2 F2 G2 G2 G2 G2 | C3 C3 C3 C3 C3 C3 C3 C3 ' },
    { drum: 'kick', gain: 0.4, pattern: bars('X . x . . . . .') },
    { drum: 'hat', gain: 0.03, pattern: bars('x x x x x x x x') },
    { instrument: 'strings', gain: 0.012, pattern: bars('B4+C5 - - - - - - -') },
  ],
  fadeInSec: 0.25, // time constant while the meter fills
  fadeOutSec: 0.9, // time constant after hiding / losing sight
};
