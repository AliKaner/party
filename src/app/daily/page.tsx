"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import AppShell from "@/components/AppShell";
import { useRequireAuth } from "@/lib/auth";
import { QWERTY } from "@/lib/constants";
import { ensureAudio, playSound } from "@/lib/sounds";

type TileState = "correct" | "present" | "absent";

const TILE_BG: Record<TileState, string> = {
  correct: "var(--success)",
  present: "var(--warning)",
  absent: "oklch(0.28 0.02 280)",
};

export default function DailyPage() {
  const { token, me, loading } = useRequireAuth();
  const daily = useQuery(api.daily.get, token ? { token } : "skip");
  const submitGuess = useMutation(api.daily.submitGuess);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureAudio();
  }, []);

  const wordLen = daily?.length ?? 5;
  const playing = daily?.status === "playing";

  const submit = useCallback(async () => {
    if (!token || !daily || !playing || busy) return;
    const guess = current.trim().toUpperCase();
    if (guess.length !== wordLen) {
      setError(`Enter a ${wordLen}-letter word.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { status } = await submitGuess({ token, guess });
      setCurrent("");
      if (status === "won") playSound("win");
      else if (status === "lost") playSound("eliminate");
      else playSound("reveal");
    } catch (e) {
      setError(e instanceof ConvexError && typeof e.data === "string" ? e.data : "Try again.");
      playSound("wrong");
    } finally {
      setBusy(false);
    }
  }, [token, daily, playing, busy, current, wordLen, submitGuess]);

  const typeKey = useCallback(
    (key: string) => {
      if (!playing) return;
      setError("");
      if (key === "ENTER") { void submit(); return; }
      if (key === "⌫") { setCurrent((c) => c.slice(0, -1)); return; }
      setCurrent((c) => (c.length < wordLen ? c + key : c));
    },
    [playing, submit, wordLen]
  );

  // Physical keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Enter") typeKey("ENTER");
      else if (e.key === "Backspace") typeKey("⌫");
      else if (/^[a-zA-Z]$/.test(e.key)) typeKey(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typeKey]);

  if (loading || !me) return null;
  if (!daily) return <AppShell activeKey="daily"><div /></AppShell>;

  // Key coloring: best-known state per letter across all guesses.
  const keyStates: Record<string, TileState> = {};
  daily.guesses.forEach((guess, gi) => {
    guess.split("").forEach((ch, i) => {
      const s = daily.rows[gi][i];
      const prev = keyStates[ch];
      if (s === "correct" || (s === "present" && prev !== "correct") || (s === "absent" && !prev)) {
        keyStates[ch] = s;
      }
    });
  });

  const currentRowIdx = daily.guesses.length;

  return (
    <AppShell activeKey="daily">
      <div className="mx-auto w-full flex flex-col items-center gap-6" style={{ maxWidth: 560, padding: "26px 24px 48px" }}>
        <div className="text-center">
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
            WORD OF THE DAY
          </h1>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--warning)", letterSpacing: "0.08em" }}>
            {daily.category.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }, (_, rowIdx) => (
            <div key={rowIdx} className="flex gap-1.5">
              {Array.from({ length: wordLen }, (_, colIdx) => {
                const isGuessed = rowIdx < daily.guesses.length;
                const isCurrent = rowIdx === currentRowIdx && playing;
                const letter = isGuessed
                  ? daily.guesses[rowIdx][colIdx]
                  : isCurrent
                    ? current[colIdx] ?? ""
                    : "";
                const state = isGuessed ? daily.rows[rowIdx][colIdx] : null;
                return (
                  <div
                    key={colIdx}
                    className="font-display flex items-center justify-center"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 10,
                      fontSize: 22,
                      fontWeight: 700,
                      color: "white",
                      background: state ? TILE_BG[state] : "transparent",
                      border: state
                        ? "2px solid transparent"
                        : `2px solid ${isCurrent && letter ? "var(--accent)" : "var(--border-strong)"}`,
                      transition: "background 0.3s",
                    }}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {daily.hintLetter && (
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--warning)" }}>
            Hint: the middle letter is “{daily.hintLetter}”.
          </div>
        )}

        {daily.status === "won" && (
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--success)" }}>
            Nice, you found the word!
          </div>
        )}
        {daily.status === "lost" && (
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--danger)" }}>
            Word: {daily.word}
          </div>
        )}
        {!playing && (
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--faint)" }}>
            Come back tomorrow for a new word — your streak is safe on your profile.
          </div>
        )}

        {error && (
          <div className="anim-shake" style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>
            {error}
          </div>
        )}

        {playing && (
          <>
            <div className="flex flex-col items-center gap-1.5">
              {QWERTY.map((row, ri) => (
                <div key={ri} className="flex gap-1.5">
                  {ri === 2 && (
                    <button className="pb-btn" style={{ padding: "0 12px", fontSize: 11, borderRadius: 8, height: 44, background: "var(--chip)" }} onClick={() => typeKey("ENTER")}>
                      ENTER
                    </button>
                  )}
                  {row.split("").map((key) => {
                    const state = keyStates[key];
                    return (
                      <button
                        key={key}
                        className="font-display cursor-pointer"
                        style={{
                          width: 34,
                          height: 44,
                          borderRadius: 8,
                          border: "none",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "white",
                          background: state ? TILE_BG[state] : "var(--chip)",
                          transition: "background 0.3s",
                        }}
                        onClick={() => typeKey(key)}
                      >
                        {key}
                      </button>
                    );
                  })}
                  {ri === 2 && (
                    <button className="pb-btn" style={{ padding: "0 14px", fontSize: 14, borderRadius: 8, height: 44, background: "var(--chip)" }} onClick={() => typeKey("⌫")}>
                      ⌫
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 w-full" style={{ maxWidth: 380 }}>
              <input
                className="pb-input font-display"
                style={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}
                value={current}
                maxLength={wordLen}
                placeholder={`${wordLen}-LETTER WORD`}
                onChange={(e) => { setCurrent(e.target.value.toUpperCase().replace(/[^A-Z]/g, "")); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              />
              <button className="pb-btn" disabled={busy} onClick={() => void submit()}>
                GUESS
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
