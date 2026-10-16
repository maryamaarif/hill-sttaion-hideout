// Looping music tracks, synthesised with Web Audio (no audio files).
//
// Each track is a loop of `steps` eighth notes at `bpm`. Each voice has a pattern:
// one token per step, separated by spaces (bars separated by '|' for readability):
//   C5, F#4, Bb3  play that note       -  hold the previous note       .  rest
// Drum voices use  x = hit, X = accented hit, . = rest.
//
// Voice options:
//   wave     'sine' | 'triangle' | 'square' | 'sawtooth'  (melodic voices)
//   drum     'kick' | 'hat' | 'chuff'                     (drum voices)
//   gain     loudness before the music volume slider
//   release  seconds the note rings on after it ends (bells, pads)

export const TRACKS = {
  // Gentle: soft triangle melody in C major pentatonic over a slow bass.
  spring: {
    bpm: 84,
    voices: [
      { wave: 'triangle', gain: 0.13, release: 0.4, pattern:
        'E5 - G5 - A5 - G5 - | E5 - D5 - C5 - - - | D5 - E5 - G5 - E5 - | D5 - - - - - . . |' +
        'E5 - G5 - A5 - C6 - | A5 - G5 - E5 - - - | D5 - E5 - D5 - C5 - | C5 - - - - - . . ' },
      { wave: 'sine', gain: 0.16, release: 0.3, pattern:
        'C3 - - - G3 - - - | A2 - - - E3 - - - | F2 - - - C3 - - - | G2 - - - G2 - - - |' +
        'C3 - - - G3 - - - | A2 - - - E3 - - - | F2 - - - G2 - - - | C3 - - - - - - - ' },
      { wave: 'sine', gain: 0.05, release: 1.2, pattern:
        'C6 . . . . . . . | . . . . E6 . . . | . . . . . . . . | G6 . . . . . . . |' +
        '. . . . C6 . . . | . . . . . . . . | E6 . . . . . . . | . . . . . . . . ' },
    ],
  },

  // Upbeat: bouncy square lead, walking bass, kick and hi-hats.
  summer: {
    bpm: 124,
    voices: [
      { wave: 'square', gain: 0.06, release: 0.08, pattern:
        'G4 . C5 . E5 . G5 - | E5 . C5 . D5 . E5 . | G4 . C5 . E5 . A5 - | G5 . E5 . D5 - - . |' +
        'A4 . C5 . F5 . A5 - | G5 . E5 . C5 . E5 . | D5 . E5 . G5 . E5 . | D5 - C5 - - - . . ' },
      { wave: 'triangle', gain: 0.17, release: 0.05, pattern:
        'C3 . C3 . G2 . G2 . | A2 . A2 . G2 . G2 . | C3 . C3 . G2 . G2 . | A2 . A2 . G2 . B2 . |' +
        'F2 . F2 . C3 . C3 . | C3 . C3 . A2 . A2 . | G2 . G2 . D3 . D3 . | G2 . G2 . G2 . B2 . ' },
      { drum: 'kick', gain: 0.35, pattern:
        'X . . . X . . . | X . . . X . . . | X . . . X . . . | X . . . X . X . |' +
        'X . . . X . . . | X . . . X . . . | X . . . X . . . | X . . . X . X . ' },
      { drum: 'hat', gain: 0.05, pattern:
        '. x . x . x . x | . x . x . x . x | . x . x . x . x | . x . x . x x x |' +
        '. x . x . x . x | . x . x . x . x | . x . x . x . x | . x . x . x x x ' },
    ],
  },

  // Nostalgic: A minor melody over a steam-train "chuff" rhythm, with a whistle.
  fall: {
    bpm: 100,
    voices: [
      { wave: 'triangle', gain: 0.12, release: 0.3, pattern:
        'A4 - - C5 E5 - D5 - | C5 - B4 - A4 - - - | G4 - - B4 D5 - C5 - | B4 - G4 - A4 - - - |' +
        'F4 - - A4 C5 - B4 - | A4 - G4 - E4 - - - | F4 - G4 - A4 - B4 - | A4 - - - - - . . ' },
      { wave: 'sine', gain: 0.15, release: 0.2, pattern:
        'A2 - - - A2 - - - | F2 - - - F2 - - - | G2 - - - G2 - - - | E2 - - - E2 - - - |' +
        'D2 - - - D2 - - - | A2 - - - A2 - - - | F2 - - - E2 - - - | A2 - - - A2 - - - ' },
      { drum: 'chuff', gain: 0.07, pattern:
        'X x x x X x x x | X x x x X x x x | X x x x X x x x | X x x x X x x x |' +
        'X x x x X x x x | X x x x X x x x | X x x x X x x x | X x x x X x x x ' },
      { wave: 'sine', gain: 0.04, release: 0.3, pattern:
        '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . |' +
        '. . . . . . . . | . . . . . . . . | . . . . . . . . | E6 - - - C6 - - - ' },
    ],
  },

  // Slow and sparse: soft bells with long tails over a low drone.
  winter: {
    bpm: 66,
    voices: [
      { wave: 'sine', gain: 0.13, release: 1.8, pattern:
        'E5 . . . . . B4 . | . . . . . . . . | G5 . . . . . E5 . | . . . . . . . . |' +
        'D5 . . . . . A4 . | . . . . . . . . | B4 . . . C5 . . . | B4 . . . . . . . ' },
      { wave: 'triangle', gain: 0.06, release: 1.0, pattern:
        'E3 - - - - - - - | C3 - - - - - - - | G2 - - - - - - - | B2 - - - - - - - |' +
        'D3 - - - - - - - | A2 - - - - - - - | C3 - - - - - - - | B2 - - - - - - - ' },
      { wave: 'sine', gain: 0.035, release: 2.2, pattern:
        '. . . . . . . . | . . . . E6 . . . | . . . . . . . . | . . . . . . B6 . |' +
        '. . . . . . . . | . . . . F#6 . . . | . . . . . . . . | . . . . . . . . ' },
    ],
  },

  // Warm and cosy: menu, your room, level complete.
  room: {
    bpm: 76,
    voices: [
      { wave: 'triangle', gain: 0.11, release: 0.5, pattern:
        'C5 - E5 - G5 - E5 - | F5 - A5 - G5 - - - | E5 - D5 - C5 - D5 - | E5 - - - - - . . |' +
        'C5 - E5 - G5 - C6 - | B5 - A5 - G5 - - - | F5 - E5 - D5 - G4 - | C5 - - - - - . . ' },
      { wave: 'sine', gain: 0.15, release: 0.4, pattern:
        'C3 - - - - - - - | F2 - - - - - - - | A2 - - - - - - - | G2 - - - - - - - |' +
        'C3 - - - - - - - | G2 - - - - - - - | F2 - - - G2 - - - | C3 - - - - - - - ' },
    ],
  },
};
