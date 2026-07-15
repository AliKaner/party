"use client";

import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { HeaderBar } from "@/components/AppShell";
import Ambient from "@/components/Ambient";
import { playSound } from "@/lib/sounds";

type TileColor = "blue" | "red" | "neutral" | "assassin";

type SpiesGame = {
  words: string[];
  colors: TileColor[];
  revealed: boolean[];
  turn: "blue" | "red";
  status: "playing" | "blue_win" | "red_win";
  clueText: string;
};

type SpiesRoom = {
  id: string;
  name: string;
};

const TILE_BG: Record<TileColor, string> = {
  blue: "var(--team-blue)",
  red: "var(--team-red)",
  neutral: "var(--team-neutral)",
  assassin: "var(--team-assassin)",
};

export default function WordSpies({
  room,
  game,
  token,
}: {
  room: SpiesRoom;
  game: SpiesGame;
  token: string;
  meId: string;
}) {
  const roomId = room.id as Id<"rooms">;
  const reveal = useMutation(api.spies.reveal);
  const endTurn = useMutation(api.spies.endTurn);
  const newBoard = useMutation(api.spies.newBoard);
  const [showKey, setShowKey] = useState(false);

  // Reveal sound whenever a tile flips (any team).
  const prevRevealedCount = useRef(game.revealed.filter(Boolean).length);
  useEffect(() => {
    const count = game.revealed.filter(Boolean).length;
    if (count > prevRevealedCount.current) playSound("reveal");
    prevRevealedCount.current = count;
  }, [game.revealed]);

  const prevStatus = useRef(game.status);
  useEffect(() => {
    if (game.status !== prevStatus.current) {
      playSound(game.status === "blue_win" ? "win" : game.status === "red_win" ? "eliminate" : "reveal");
      prevStatus.current = game.status;
    }
  }, [game.status]);

  const banner =
    game.status === "blue_win"
      ? { text: "Blue Team wins! 🎉", bg: "oklch(0.5 0.15 250 / 0.35)", color: "oklch(0.85 0.1 250)" }
      : game.status === "red_win"
        ? { text: "Red Team wins!", bg: "oklch(0.5 0.18 25 / 0.35)", color: "oklch(0.85 0.12 25)" }
        : game.turn === "blue"
          ? { text: "Your Team's Turn (Blue)", bg: "oklch(0.5 0.15 250 / 0.25)", color: "oklch(0.85 0.1 250)" }
          : { text: "Red Team's Turn", bg: "oklch(0.5 0.18 25 / 0.25)", color: "oklch(0.85 0.12 25)" };

  const blueLeft = game.colors.filter((c, i) => c === "blue" && !game.revealed[i]).length;
  const redLeft = game.colors.filter((c, i) => c === "red" && !game.revealed[i]).length;

  return (
    <div className="min-h-screen relative">
      <Ambient />
      <HeaderBar backHref="/lobbies" showNav={false} />
      <main className="relative z-10 mx-auto w-full flex flex-col gap-5" style={{ maxWidth: 760, padding: "24px 24px 48px" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
              WORD SPIES
            </h1>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>{room.name}</span>
          </div>
          <button
            className="cursor-pointer"
            style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 800, padding: 0 }}
            onClick={() => void newBoard({ token, roomId })}
          >
            New Board
          </button>
        </div>

        <div
          className="flex items-center justify-between flex-wrap gap-2"
          style={{ background: banner.bg, color: banner.color, borderRadius: 100, padding: "10px 20px", fontSize: 14, fontWeight: 800 }}
        >
          <span>{banner.text}</span>
          <span style={{ fontSize: 12, fontWeight: 800 }}>
            <span style={{ color: "oklch(0.8 0.1 250)" }}>Blue {blueLeft}</span>
            {" · "}
            <span style={{ color: "oklch(0.8 0.12 25)" }}>Red {redLeft}</span>
          </span>
        </div>

        {game.status === "playing" && game.turn === "blue" && game.clueText && (
          <div style={{ color: "var(--warning)", fontSize: 14, fontWeight: 800 }}>
            Clue: {game.clueText}
          </div>
        )}

        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {game.words.map((word, i) => {
            const revealed = game.revealed[i];
            const color = game.colors[i];
            const clickable = game.status === "playing" && game.turn === "blue" && !revealed;
            const shown = revealed || showKey;
            return (
              <button
                key={`${word}-${i}`}
                type="button"
                disabled={!clickable}
                onClick={() => void reveal({ token, roomId, idx: i })}
                className={`font-display ${revealed ? "anim-flip" : "anim-pop-in"}`}
                style={{
                  animationDelay: revealed ? undefined : `${(i % 5) * 0.03 + Math.floor(i / 5) * 0.03}s`,
                  aspectRatio: "5 / 3",
                  borderRadius: 12,
                  border: `1px solid ${shown ? "transparent" : "var(--border-strong)"}`,
                  background: shown ? TILE_BG[color] : "var(--panel)",
                  color: color === "assassin" && shown ? "var(--danger)" : "white",
                  opacity: revealed ? 0.9 : 1,
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  cursor: clickable ? "pointer" : "default",
                  textDecoration: revealed ? "line-through" : "none",
                }}
              >
                {word}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="pb-btn pb-btn-pill"
            disabled={game.status !== "playing" || game.turn !== "blue"}
            onClick={() => void endTurn({ token, roomId })}
          >
            END TURN
          </button>
          <button
            className="pb-btn pb-btn-pill pb-btn-ghost"
            onClick={() => setShowKey((s) => !s)}
          >
            {showKey ? "HIDE KEY" : "SHOW KEY"}
          </button>
        </div>
      </main>
    </div>
  );
}
