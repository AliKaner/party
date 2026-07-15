"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";

export type GamePhase = "countdown" | "gap" | "reveal" | "active" | "waiting" | "eliminated";

export type GamePlayer = {
  id: string;
  name: string;
  hue: number;
  url?: string | null;
  lives: number;
  eliminated: boolean;
};

export type FeedItem = {
  id: string;
  text: string;
  kind: "correct" | "bonus" | "wrong" | "eliminate" | "info";
};

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="12" viewBox="0 0 24 22" aria-hidden>
      <path
        d="M12 21S2 14.4 2 7.8C2 4.1 4.9 1.5 8.1 1.5c1.7 0 3.1.9 3.9 2.1.8-1.2 2.2-2.1 3.9-2.1 3.2 0 6.1 2.6 6.1 6.3C22 14.4 12 21 12 21z"
        fill={filled ? "var(--danger)" : "var(--hairline)"}
      />
    </svg>
  );
}

const FEED_COLORS: Record<FeedItem["kind"], string> = {
  correct: "var(--success)",
  bonus: "var(--warning)",
  wrong: "var(--muted)",
  eliminate: "var(--danger)",
  info: "var(--faint)",
};

/** Owns the word input — mounted with a parent-chosen key so its state
 *  resets when the parent wants (per round, or kept across rounds in
 *  Start With a Letter). While `disabled`, typing works but submitting
 *  (Enter or the button) is a no-op, so players can pre-type. */
function AnswerBox({
  onSubmitWord,
  disabled = false,
}: {
  onSubmitWord: (word: string) => Promise<string | null> | string | null;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const submit = async () => {
    if (disabled) return;
    const word = value.trim().toUpperCase();
    const err = await onSubmitWord(word);
    if (err) {
      setError(err);
    } else {
      setValue("");
      setError("");
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <div className="flex gap-2.5">
        <input
          ref={inputRef}
          className={`pb-input font-display ${error ? "anim-shake" : ""}`}
          style={{ textTransform: "uppercase", fontSize: 17, fontWeight: 700, letterSpacing: "0.08em" }}
          value={value}
          onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          placeholder="TYPE A WORD"
        />
        <button className="pb-btn" disabled={disabled} onClick={() => void submit()}>SUBMIT</button>
      </div>
      {error && (
        <div className="anim-shake" style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700 }}>
          {error}
        </div>
      )}
    </>
  );
}

export default function GameView({
  roundN,
  modeTitle,
  phase,
  countdownVal,
  promptLetter,
  promptTiles,
  timeLeft,
  timeLimit,
  showBonusPop,
  answeredWord,
  onSubmitWord,
  onLeave,
  players,
  feed,
  hideSidebar = false,
  promptKey,
  inputKey,
  stickyPrompt = false,
}: {
  roundN: number;
  modeTitle: string;
  phase: GamePhase;
  countdownVal: number | "GO!";
  promptLetter: string;
  promptTiles: string[];
  timeLeft: number;
  timeLimit: number;
  showBonusPop: boolean;
  answeredWord: string | null;
  onSubmitWord: (word: string) => Promise<string | null> | string | null;
  onLeave: () => void;
  players: GamePlayer[];
  feed: FeedItem[];
  hideSidebar?: boolean;
  /** Keys the flip animation — pass a stable value (e.g. the letter itself)
   *  to avoid re-playing the reveal when the prompt hasn't changed. */
  promptKey?: string | number;
  /** Keys the input — pass a stable value to keep typed text across rounds. */
  inputKey?: string | number;
  /** Keep the prompt (and input) on screen between rounds — Start With a
   *  Letter uses one letter for the whole match. */
  stickyPrompt?: boolean;
}) {
  const frac = timeLimit > 0 ? Math.max(0, Math.min(1, timeLeft / timeLimit)) : 0;
  const barColor = frac > 0.5 ? "var(--success)" : frac > 0.25 ? "var(--warning)" : "var(--danger)";
  const tileKey = promptKey ?? roundN;
  const boxKey = inputKey ?? roundN;
  const showPrompt =
    (phase === "reveal" || phase === "active" || (stickyPrompt && phase === "gap")) &&
    (promptLetter !== "" || promptTiles.length > 0);
  const showInput =
    (phase === "countdown" || phase === "reveal" || phase === "active" || phase === "gap") &&
    !answeredWord;

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header
        className="flex items-center justify-between"
        style={{ padding: "14px 24px", borderBottom: "1px solid var(--hairline)" }}
      >
        <span className="font-display" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.08em" }}>
          ROUND {Math.max(1, roundN)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.05em" }}>
          {modeTitle}
        </span>
        <button
          onClick={onLeave}
          className="cursor-pointer"
          style={{ background: "none", border: "1px solid var(--border-strong)", color: "var(--muted)", borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 800 }}
        >
          Leave
        </button>
      </header>

      <div
        className="flex-1 grid gap-5"
        style={{ gridTemplateColumns: hideSidebar ? "1fr" : "1fr 300px", padding: 20, alignItems: "stretch" }}
      >
        <div className="flex flex-col items-center justify-center gap-7" style={{ minHeight: 380 }}>
          {phase === "countdown" && (
            <div
              className="font-display"
              style={{
                fontSize: 150,
                fontWeight: 700,
                lineHeight: 1,
                color:
                  countdownVal === "GO!" || (typeof countdownVal === "number" && countdownVal <= 2)
                    ? "var(--success)"
                    : "white",
              }}
            >
              {countdownVal}
            </div>
          )}

          {phase === "eliminated" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="font-display" style={{ fontSize: 38, fontWeight: 700, color: "var(--danger)", letterSpacing: "0.08em" }}>
                ELIMINATED
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>
                You&apos;re out of lives — the others are still going.
              </div>
            </div>
          )}

          {showPrompt && (
            <>
              {promptTiles.length ? (
                <div className="flex flex-wrap justify-center gap-2.5" style={{ perspective: 700 }}>
                  {promptTiles.map((ch, i) => (
                    <div
                      key={`${tileKey}-${i}`}
                      className="anim-flip font-display flex items-center justify-center"
                      style={{
                        width: 56,
                        height: 64,
                        borderRadius: 12,
                        background: "var(--accent)",
                        fontSize: 30,
                        fontWeight: 700,
                        color: "white",
                        animationDelay: `${i * 0.05}s`,
                      }}
                    >
                      {ch}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ perspective: 700 }}>
                  <div
                    key={tileKey}
                    className="anim-flip font-display flex items-center justify-center"
                    style={{
                      width: 140,
                      height: 160,
                      borderRadius: 20,
                      background: "var(--accent)",
                      fontSize: 76,
                      fontWeight: 700,
                      color: "white",
                      boxShadow: "0 18px 50px oklch(0.62 0.19 300 / 0.35)",
                    }}
                  >
                    {promptLetter}
                  </div>
                </div>
              )}

            </>
          )}

          {phase === "active" && answeredWord && (
            <div className="text-center" style={{ fontSize: 15, fontWeight: 800, color: "var(--success)" }}>
              &quot;{answeredWord}&quot; locked in — waiting for the others…
            </div>
          )}

          {showInput && (
            <div className="w-full flex flex-col gap-3" style={{ maxWidth: 420 }}>
              <AnswerBox key={boxKey} onSubmitWord={onSubmitWord} disabled={phase !== "active"} />
              {phase === "active" && (
                <div className="relative">
                  {showBonusPop && (
                    <div
                      className="anim-bonuspop absolute font-display"
                      style={{ right: 8, top: -26, color: "var(--success)", fontWeight: 700, fontSize: 18 }}
                    >
                      +2s
                    </div>
                  )}
                  <div style={{ height: 14, borderRadius: 100, background: "var(--hairline)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${frac * 100}%`,
                        height: "100%",
                        borderRadius: 100,
                        background: barColor,
                        transition: "width 0.1s linear, background 0.3s",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {(phase === "waiting" || (phase === "gap" && !stickyPrompt)) && (
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>
              {phase === "waiting" ? "Time is up — waiting for the round to resolve…" : "Next round…"}
            </div>
          )}
        </div>

        {!hideSidebar && (
          <aside className="flex flex-col gap-4">
            <section
              style={{ background: "var(--panel-alt)", border: "1px solid var(--hairline)", borderRadius: 16, padding: 16, maxHeight: 340, overflowY: "auto" }}
            >
              <h3 style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)" }}>PLAYERS</h3>
              <div className="flex flex-col gap-2.5">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5" style={{ opacity: p.eliminated ? 0.4 : 1 }}>
                    <Avatar name={p.name} hue={p.hue} url={p.url} size={28} />
                    <span
                      className="flex-1 truncate"
                      style={{ fontSize: 13, fontWeight: 700, textDecoration: p.eliminated ? "line-through" : "none" }}
                    >
                      {p.name}
                    </span>
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <Heart key={i} filled={i < p.lives} />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="flex-1"
              style={{ background: "var(--panel-alt)", border: "1px solid var(--hairline)", borderRadius: 16, padding: 16, minHeight: 180 }}
            >
              <h3 style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)" }}>FEED</h3>
              <div className="flex flex-col gap-2">
                {feed.map((f) => (
                  <div key={f.id} className="anim-feedin" style={{ fontSize: 12.5, fontWeight: 700, color: FEED_COLORS[f.kind] }}>
                    {f.text}
                  </div>
                ))}
                {!feed.length && (
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--faint)" }}>Waiting for the action…</div>
                )}
              </div>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
