// Short synthesized WebAudio tones — same recipes as the design prototype.
"use client";

export type SoundType =
  | "correct"
  | "wrong"
  | "tick"
  | "bonus"
  | "eliminate"
  | "countdown"
  | "go"
  | "reveal"
  | "win";

let audioCtx: AudioContext | null = null;

export function ensureAudio() {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx?.state === "suspended") void audioCtx.resume();
}

export function playSound(type: SoundType) {
  if (!audioCtx) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const play = (
    freq: number,
    start: number,
    dur: number,
    wave: OscillatorType,
    gain: number,
    freqEnd?: number
  ) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now + start);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + start + dur);
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.linearRampToValueAtTime(gain, now + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.03);
  };
  switch (type) {
    case "correct": play(880, 0, 0.12, "sine", 0.22); play(1320, 0.08, 0.14, "sine", 0.18); break;
    case "wrong": play(170, 0, 0.28, "sawtooth", 0.2, 80); break;
    case "tick": play(1050, 0, 0.05, "square", 0.07); break;
    case "bonus": play(660, 0, 0.1, "sine", 0.18); play(990, 0.09, 0.14, "sine", 0.2); break;
    case "eliminate": play(420, 0, 0.32, "sawtooth", 0.2, 70); break;
    case "countdown": play(520, 0, 0.09, "square", 0.14); break;
    case "go": play(700, 0, 0.08, "square", 0.2); play(1050, 0.06, 0.22, "square", 0.22); break;
    case "reveal": play(760, 0, 0.12, "triangle", 0.18); break;
    case "win": play(523, 0, 0.15, "sine", 0.2); play(659, 0.12, 0.15, "sine", 0.2); play(784, 0.24, 0.28, "sine", 0.22); break;
  }
}
