export const AVATAR_HUES = [300, 220, 145, 25, 85, 255, 10, 190];

export function hueColor(hue: number, l = 0.6, c = 0.19) {
  return `oklch(${l} ${c} ${hue})`;
}

export type GameMode = "letter" | "chain" | "anagram" | "wordspies";

export const MODES: { key: GameMode; title: string; desc: string }[] = [
  { key: "letter", title: "Start With a Letter", desc: "Write a word starting with a random letter." },
  { key: "chain", title: "Word Chain", desc: "Continue with the last letter of the previous word." },
  { key: "anagram", title: "Scrambled Letters", desc: "Form a valid word using the given letters." },
  { key: "wordspies", title: "Word Spies", desc: "Team word deduction — Codenames-style." },
];

export const ELIMINATION_MODES = MODES.filter((m) => m.key !== "wordspies");

export const QWERTY = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export const GUEST_NAMES = ["Kaan", "Ece", "Mert", "Zeynep", "Baran", "Elif", "Deniz", "Aslı", "Emre", "Sude", "Cem", "Nil", "Berk", "Yaren", "Onur", "Ilayda", "Kerem", "Su", "Ada", "Toprak"];

export function generateGuestName() {
  const name = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
  return `${name}${Math.floor(10 + Math.random() * 90)}`;
}

// Round timing (ms) — mirrors the prototype exactly.
export const COUNTDOWN_TICK_MS = 800; // 5 → 1
export const GO_HOLD_MS = 700;
export const COUNTDOWN_TOTAL_MS = COUNTDOWN_TICK_MS * 5 + GO_HOLD_MS; // 4700
export const REVEAL_MS = 1400;
export const NEXT_ROUND_GAP_MS = 1000;
export const BASE_TIME_S = 10;
export const FAST_ANSWER_MS = 3000;
export const FAST_BONUS_S = 2;
