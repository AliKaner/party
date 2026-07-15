"use client";

import { useCallback, useState } from "react";
import AppShell from "@/components/AppShell";
import { useRequireAuth } from "@/lib/auth";
import { BLUFF_WORDS, FAKE_DEF_POOL } from "@/lib/words";
import { playSound } from "@/lib/sounds";
import { GUEST_NAMES } from "@/lib/constants";

type BluffOption = {
  id: string;
  text: string;
  isReal: boolean;
  owner: string | null; // null = the real definition
};

type BluffState = {
  word: string;
  realDefinition: string;
  phase: "writing" | "voting" | "result";
  userFake: string;
  options: BluffOption[];
  botVoteIds: string[];
  userVoteId: string | null;
  roundResult: { userCorrect: boolean; fooledCount: number } | null;
  score: { found: number; fooled: number };
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRound(pick: (typeof BLUFF_WORDS)[number], score: BluffState["score"]): BluffState {
  return {
    word: pick.word,
    realDefinition: pick.definition,
    phase: "writing",
    userFake: "",
    options: [],
    botVoteIds: [],
    userVoteId: null,
    roundResult: null,
    score,
  };
}

function newRound(score: BluffState["score"]): BluffState {
  return makeRound(BLUFF_WORDS[Math.floor(Math.random() * BLUFF_WORDS.length)], score);
}

// The first round is picked deterministically so the server-prerendered HTML
// matches the client's first render; NEW ROUND picks randomly after that.
function initialRound(): BluffState {
  return makeRound(BLUFF_WORDS[0], { found: 0, fooled: 0 });
}

export default function BluffPage() {
  const { me, loading } = useRequireAuth();
  const [state, setState] = useState<BluffState | null>(initialRound);

  const submitFake = useCallback(() => {
    setState((s) => {
      if (!s || s.phase !== "writing" || !s.userFake.trim()) return s;
      const pool = shuffle(FAKE_DEF_POOL);
      const botNames = shuffle(GUEST_NAMES).slice(0, 3);
      const botOptions: BluffOption[] = botNames.map((name, i) => ({
        id: `bot${i}`,
        text: pool[i],
        isReal: false,
        owner: name,
      }));
      const realOption: BluffOption = { id: "real", text: s.realDefinition, isReal: true, owner: null };
      const userOption: BluffOption = { id: "user", text: s.userFake.trim(), isReal: false, owner: "You" };
      const options = shuffle([realOption, userOption, ...botOptions]);
      // Each bot picks the real definition 40% of the time, otherwise a
      // random fake that isn't its own (same odds as the prototype).
      const botVoteIds = botNames.map((name) => {
        if (Math.random() < 0.4) return "real";
        const fakes = options.filter((o) => !o.isReal && o.owner !== name);
        return fakes[Math.floor(Math.random() * fakes.length)].id;
      });
      return { ...s, options, botVoteIds, phase: "voting" };
    });
  }, []);

  const vote = useCallback((optionId: string) => {
    setState((s) => {
      if (!s || s.phase !== "voting" || optionId === "user") return s;
      const chosen = s.options.find((o) => o.id === optionId);
      const userCorrect = !!chosen?.isReal;
      const fooledCount = s.botVoteIds.filter((id) => id === "user").length;
      playSound(userCorrect ? "correct" : "wrong");
      return {
        ...s,
        userVoteId: optionId,
        phase: "result",
        roundResult: { userCorrect, fooledCount },
        score: {
          found: s.score.found + (userCorrect ? 1 : 0),
          fooled: s.score.fooled + fooledCount,
        },
      };
    });
  }, []);

  if (loading || !me || !state) return null;

  return (
    <AppShell activeKey="bluff">
      <div className="mx-auto w-full flex flex-col gap-6" style={{ maxWidth: 620, padding: "26px 24px 48px" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
            WORD BLUFF
          </h1>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)" }}>
            Found <span style={{ color: "var(--success)" }}>{state.score.found}</span>
            {" · "}
            Fooled <span style={{ color: "var(--warning)" }}>{state.score.fooled}</span>
          </span>
        </div>

        <div className="anim-pop-in flex flex-col items-center gap-1 text-center" style={{ background: "var(--panel)", border: "1px solid var(--border-strong)", borderRadius: 18, padding: "26px 20px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: "var(--muted)" }}>THE WORD</span>
          <span className="font-display" style={{ fontSize: 40, fontWeight: 700, letterSpacing: "0.06em" }}>{state.word}</span>
        </div>

        {state.phase === "writing" && (
          <div className="flex flex-col gap-3">
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>
              Nobody knows what this means. Invent a convincing fake definition — you score when others fall for it.
            </p>
            <textarea
              className="pb-input"
              rows={3}
              style={{ resize: "vertical" }}
              placeholder="Write a believable definition…"
              value={state.userFake}
              onChange={(e) => setState((s) => (s ? { ...s, userFake: e.target.value } : s))}
            />
            <button className="pb-btn self-start" disabled={!state.userFake.trim()} onClick={submitFake}>
              SUBMIT BLUFF
            </button>
          </div>
        )}

        {state.phase === "voting" && (
          <div className="flex flex-col gap-2.5">
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--muted)" }}>
              Which one is the real definition?
            </p>
            {state.options.map((o) => {
              const selectable = o.id !== "user";
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => vote(o.id)}
                  className="anim-pop-in text-left"
                  style={{
                    background: "var(--panel)",
                    border: `2px solid ${selectable ? "var(--border-strong)" : "var(--hairline)"}`,
                    borderRadius: 14,
                    padding: "13px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: selectable ? "var(--text)" : "var(--faint)",
                    cursor: selectable ? "pointer" : "default",
                  }}
                >
                  {o.text}
                  {o.id === "user" && (
                    <span style={{ display: "block", marginTop: 6, fontSize: 11, fontWeight: 800, color: "var(--accent)" }}>
                      Your fake — not selectable
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {state.phase === "result" && state.roundResult && (
          <div className="flex flex-col gap-3">
            <div style={{ fontSize: 15, fontWeight: 800, color: state.roundResult.userCorrect ? "var(--success)" : "var(--danger)" }}>
              {state.roundResult.userCorrect ? "You found the real definition!" : "Nope — that wasn't it."}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
              Your fake fooled {state.roundResult.fooledCount} opponent{state.roundResult.fooledCount === 1 ? "" : "s"}.
            </div>
            <div className="flex flex-col gap-2">
              {state.options.map((o) => {
                const picked = state.userVoteId === o.id;
                return (
                  <div
                    key={o.id}
                    style={{
                      background: o.isReal ? "oklch(0.78 0.19 145 / 0.12)" : "var(--panel)",
                      border: `2px solid ${o.isReal ? "var(--success)" : picked ? "var(--danger)" : "var(--hairline)"}`,
                      borderRadius: 14,
                      padding: "13px 16px",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {o.text}
                    <span
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        color: o.isReal ? "var(--success)" : "var(--muted)",
                      }}
                    >
                      {o.isReal ? "✓ Real definition" : o.owner === "You" ? "Your fake" : `${o.owner}'s fake`}
                    </span>
                  </div>
                );
              })}
            </div>
            <button className="pb-btn self-start" onClick={() => setState((s) => (s ? newRound(s.score) : s))}>
              NEW ROUND
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
