"use client";

// Client-side real-word checking against the full dictionary (~315k words).
// The dictionary chunk is large, so it's loaded lazily in the background;
// until it arrives we fall back conservatively.
import { WORD_SET } from "./words";

let dict: Set<string> | null = null;
let loading = false;

export function preloadDictionary() {
  if (dict || loading || typeof window === "undefined") return;
  loading = true;
  void import("./dictionary")
    .then((m) => {
      dict = m.DICTIONARY;
    })
    .catch(() => {
      loading = false;
    });
}

export function dictionaryReady(): boolean {
  return dict !== null;
}

/** Full-dictionary check once loaded; curated-list check until then. */
export function isRealWord(word: string): boolean {
  const w = (word || "").trim().toUpperCase();
  return dict ? dict.has(w) : WORD_SET.has(w);
}

/** For multiplayer pre-validation: null = "can't tell yet, let the server
 *  decide" (dictionary still loading and the word isn't in the curated set). */
export function checkRealWord(word: string): boolean | null {
  const w = (word || "").trim().toUpperCase();
  if (dict) return dict.has(w);
  return WORD_SET.has(w) ? true : null;
}
