// Synthesized sound effects (Web Audio): no audio files, so nothing extra to
// cache offline. Each theme has its own voice: the neutral theme uses soft
// sine tones; the Stitch theme uses brighter, plucky "ukulele" tones.

let ctx = null;
let enabled = true;
let theme = 'neutral';

export function configureSound(opts) {
  if ('enabled' in opts) enabled = opts.enabled;
  if ('theme' in opts) theme = opts.theme;
}

/** Call from a tap handler: iOS only starts audio inside a user gesture. */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

const VOICES = {
  neutral: { wave: 'sine', attack: 0.01, decay: 0.25, gain: 0.18 },
  stitch: { wave: 'triangle', attack: 0.005, decay: 0.18, gain: 0.22, pluck: true },
};

function tone(freq, start, dur, voice) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = voice.wave;
  osc.frequency.setValueAtTime(freq, t0);
  if (voice.pluck) osc.frequency.exponentialRampToValueAtTime(freq * 1.01, t0 + 0.05);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(voice.gain, t0 + voice.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, voice.decay));
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + Math.max(dur, voice.decay) + 0.05);
}

// Note sequences as [frequency Hz, start s, duration s].
const CUES = {
  neutral: {
    tap: [[660, 0, 0.06]],
    correct: [[523, 0, 0.12], [784, 0.1, 0.2]],
    wrong: [[330, 0, 0.18], [294, 0.12, 0.22]],
    goal: [[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.35]],
    levelUp: [[392, 0, 0.12], [523, 0.12, 0.12], [659, 0.24, 0.12], [784, 0.36, 0.12], [1047, 0.48, 0.4]],
  },
  // Brighter, higher, with a little island-style arpeggio (C major 6 / F).
  stitch: {
    tap: [[880, 0, 0.05]],
    correct: [[659, 0, 0.1], [880, 0.08, 0.1], [1319, 0.16, 0.22]],
    wrong: [[392, 0, 0.12], [349, 0.1, 0.18]],
    goal: [[523, 0, 0.1], [659, 0.1, 0.1], [880, 0.2, 0.1], [1047, 0.3, 0.1], [1319, 0.4, 0.1], [1760, 0.5, 0.4]],
    levelUp: [[698, 0, 0.1], [880, 0.1, 0.1], [1047, 0.2, 0.1], [1397, 0.3, 0.1], [1047, 0.4, 0.1], [1397, 0.5, 0.1], [1760, 0.6, 0.45]],
  },
};

export function play(cue) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const voice = VOICES[theme] ?? VOICES.neutral;
  for (const [f, s, d] of (CUES[theme] ?? CUES.neutral)[cue] ?? []) tone(f, s, d, voice);
}
