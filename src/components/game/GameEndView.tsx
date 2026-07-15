"use client";

import { useMemo } from "react";
import Avatar from "@/components/Avatar";
import { AVATAR_HUES, hueColor } from "@/lib/constants";

export type Standing = {
  id: string;
  name: string;
  hue: number;
  url?: string | null;
  label: string; // "Won" | "Eliminated round N"
};

export default function GameEndView({
  heading,
  winnerName,
  winnerHue,
  winnerUrl,
  standings,
  knownWords,
  onPlayAgain,
  onMainMenu,
}: {
  heading: string;
  winnerName: string | null;
  winnerHue: number;
  winnerUrl?: string | null;
  standings: Standing[];
  knownWords: { word: string; hue: number }[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}) {
  // One-shot confetti fall from the top: small colored squares.
  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: ((i * 137) % 100),
        hue: AVATAR_HUES[(i * 5) % AVATAR_HUES.length],
        delay: ((i * 53) % 120) / 100,
        size: 6 + ((i * 29) % 80) / 10,
        dur: 2.4 + ((i * 41) % 160) / 100,
      })),
    []
  );

  return (
    <div className="min-h-screen relative z-10 flex flex-col items-center overflow-hidden" style={{ padding: "48px 24px" }}>
      <div className="absolute inset-x-0 top-0 pointer-events-none" aria-hidden>
        {confetti.map((c, i) => (
          <span
            key={i}
            className="anim-fall absolute"
            style={{
              left: `${c.left}%`,
              top: -20,
              width: c.size,
              height: c.size,
              background: hueColor(c.hue),
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 w-full" style={{ maxWidth: 560 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", color: "var(--muted)" }}>GAME OVER</span>
        <h1 className="font-display text-center" style={{ fontSize: 34, fontWeight: 700, margin: 0 }}>{heading}</h1>
        {winnerName !== null && (
          <Avatar name={winnerName} hue={winnerHue} url={winnerUrl} size={96} ring />
        )}

        <section className="w-full flex flex-col gap-2.5" style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "var(--muted)" }}>STANDINGS</h2>
          {standings.map((s, i) => (
            <div
              key={s.id}
              className="anim-pop-in flex items-center gap-3"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--hairline)",
                borderRadius: 14,
                padding: "10px 14px",
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <span className="font-display" style={{ width: 26, fontSize: 15, fontWeight: 700, color: i === 0 ? "var(--warning)" : "var(--faint)" }}>
                #{i + 1}
              </span>
              <Avatar name={s.name} hue={s.hue} url={s.url} size={30} />
              <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 800 }}>{s.name}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: s.label === "Won" ? "var(--success)" : "var(--muted)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </section>

        {knownWords.length > 0 && (
          <section className="w-full flex flex-col gap-2.5" style={{ marginTop: 14 }}>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "var(--muted)" }}>KNOWN WORDS</h2>
            <div className="flex flex-wrap gap-2">
              {knownWords.map((kw, i) => (
                <span
                  key={`${kw.word}-${i}`}
                  className="font-display"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 100,
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: hueColor(kw.hue, 0.3, 0.07),
                    color: hueColor(kw.hue, 0.85, 0.1),
                  }}
                >
                  {kw.word}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-3" style={{ marginTop: 26 }}>
          <button className="pb-btn" onClick={onPlayAgain}>PLAY AGAIN</button>
          <button className="pb-btn pb-btn-ghost" onClick={onMainMenu}>MAIN MENU</button>
        </div>
      </div>
    </div>
  );
}
