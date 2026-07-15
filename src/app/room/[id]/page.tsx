"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import AppShell from "@/components/AppShell";
import Ambient from "@/components/Ambient";
import Avatar from "@/components/Avatar";
import ModeCards from "@/components/ModeCards";
import GameView, { GamePhase } from "@/components/game/GameView";
import GameEndView from "@/components/game/GameEndView";
import WordSpies from "@/components/game/WordSpies";
import { useRequireAuth } from "@/lib/auth";
import { BASE_TIME_S, GameMode, MODES } from "@/lib/constants";
import { letterCounts, wordFitsLetters } from "@/lib/words";
import { checkRealWord, preloadDictionary } from "@/lib/wordcheck";
import { ensureAudio, playSound } from "@/lib/sounds";

type RoomData = NonNullable<ReturnType<typeof useRoom>>;
function useRoom(roomId: Id<"rooms">) {
  return useQuery(api.rooms.get, { roomId });
}

function convexMessage(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  return "Something went wrong.";
}

function useNow(offsetRef: React.RefObject<number>, running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now() + (offsetRef.current ?? 0)), 100);
    return () => clearInterval(t);
  }, [running, offsetRef]);
  return now;
}

function RoomLobby({ room, token, meId }: { room: RoomData; token: string; meId: string }) {
  const setMode = useMutation(api.rooms.setMode);
  const startGame = useMutation(api.game.startGame);
  const newBoard = useMutation(api.spies.newBoard);
  const [busy, setBusy] = useState(false);
  const isHost = room.hostId === meId;
  const isSpies = room.mode === "wordspies";

  const start = async () => {
    if (busy) return;
    setBusy(true);
    ensureAudio();
    try {
      if (isSpies) await newBoard({ token, roomId: room.id as Id<"rooms"> });
      else await startGame({ token, roomId: room.id as Id<"rooms"> });
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full flex flex-col gap-7" style={{ maxWidth: 860, padding: "26px 28px 48px" }}>
      <div>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>{room.name}</h1>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--muted)" }}>
          {room.players.length} player{room.players.length === 1 ? "" : "s"} in the room
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "var(--muted)" }}>GAME MODE</h2>
        {isSpies ? (
          <div
            style={{ alignSelf: "flex-start", background: "var(--panel)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "10px 16px", fontSize: 14, fontWeight: 800 }}
          >
            Word Spies — team word deduction
          </div>
        ) : (
          <>
            <ModeCards
              selected={room.mode as GameMode}
              keys={["letter", "chain", "anagram"]}
              onSelect={
                isHost
                  ? (mode) => void setMode({ token, roomId: room.id as Id<"rooms">, mode })
                  : undefined
              }
              disabled={!isHost}
            />
            {!isHost && (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--faint)" }}>
                Only the host can change the game mode.
              </div>
            )}
          </>
        )}
      </section>

      {isSpies ? (
        <section className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {(["blue", "red"] as const).map((team) => (
            <div
              key={team}
              style={{
                background: team === "blue" ? "oklch(0.5 0.15 250 / 0.14)" : "oklch(0.5 0.18 25 / 0.14)",
                border: `1px solid ${team === "blue" ? "oklch(0.5 0.15 250 / 0.5)" : "oklch(0.5 0.18 25 / 0.5)"}`,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <h3 style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: team === "blue" ? "oklch(0.75 0.12 250)" : "oklch(0.75 0.15 25)" }}>
                {team === "blue" ? "BLUE TEAM" : "RED TEAM"}
              </h3>
              <div className="flex flex-col gap-2.5">
                {room.players.filter((p) => p.team === team).map((p) => (
                  <div key={p.userId} className="flex items-center gap-2.5">
                    <Avatar name={p.username} hue={p.avatarHue} url={p.avatarUrl} size={30} />
                    <span className="flex-1 truncate" style={{ fontSize: 13.5, fontWeight: 800 }}>{p.username}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", border: "1px solid var(--border-strong)", borderRadius: 100, padding: "3px 9px" }}>
                      {p.role === "spymaster" ? "SPYMASTER" : "OPERATIVE"}
                    </span>
                  </div>
                ))}
                {!room.players.some((p) => p.team === team) && (
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--faint)" }}>Waiting for players…</span>
                )}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "var(--muted)" }}>PLAYERS</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
            {room.players.map((p) => (
              <div
                key={p.userId}
                className="anim-pop-in flex items-center gap-2.5"
                style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 14, padding: "10px 14px" }}
              >
                <Avatar name={p.username} hue={p.avatarHue} url={p.avatarUrl} size={32} />
                <span className="flex-1 truncate" style={{ fontSize: 13.5, fontWeight: 800 }}>{p.username}</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", color: "var(--success)" }}>READY</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col items-start gap-2">
        <button className="pb-btn" style={{ minWidth: 220 }} disabled={busy} onClick={() => void start()}>
          START GAME
        </button>
        {room.players.length < 2 && (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--faint)" }}>
            Tip: this match is more fun with friends — anyone in the lobby list can join before you start.
          </span>
        )}
      </div>
    </div>
  );
}

function MultiplayerGame({ room, token, meId }: { room: RoomData; token: string; meId: string }) {
  const roomId = room.id as Id<"rooms">;
  const round = useQuery(api.game.currentRound, { roomId });
  const feed = useQuery(api.game.feedList, { roomId }) ?? [];
  const submitWord = useMutation(api.game.submitWord);
  const leave = useMutation(api.rooms.leave);
  const router = useRouter();

  const offsetRef = useRef(0);
  useEffect(() => {
    preloadDictionary();
  }, []);
  useEffect(() => {
    if (round) offsetRef.current = round.serverNow - Date.now();
  }, [round]);
  const now = useNow(offsetRef, true);

  const [showBonusPop, setShowBonusPop] = useState(false);
  const [lockedWord, setLockedWord] = useState<string | null>(null);

  const myPlayer = room.players.find((p) => p.userId === meId);
  const answered = !!round?.answeredUserIds.includes(meId as Id<"users">);

  const myBonus = myPlayer?.bonusSeconds ?? 0;
  const timeLimit = BASE_TIME_S + myBonus;
  const myDeadline = (round?.activeAt ?? 0) + timeLimit * 1000;

  let phase: GamePhase = "gap";
  let countdownVal: number | "GO!" = 5;
  if (myPlayer?.status === "eliminated") {
    phase = "eliminated";
  } else if (round) {
    if (now < round.revealAt) {
      if (round.n === 1 && room.startedAt) {
        phase = "countdown";
        const elapsed = now - room.startedAt;
        countdownVal = elapsed >= 4000 ? "GO!" : Math.min(5, 5 - Math.floor(elapsed / 800)) as number;
      } else {
        phase = "gap";
      }
    } else if (now < round.activeAt) {
      phase = "reveal";
    } else if (answered || now <= myDeadline) {
      phase = "active";
    } else {
      phase = "waiting";
    }
  }

  const timeLeft = Math.max(0, (myDeadline - now) / 1000);

  // --- sound effects on transitions ---
  const prevPhase = useRef<GamePhase | null>(null);
  const prevCountdown = useRef<number | "GO!" | null>(null);
  const prevLives = useRef<number | null>(null);
  const lastTickSecond = useRef<number>(-1);
  useEffect(() => {
    if (phase === "countdown" && countdownVal !== prevCountdown.current) {
      playSound(countdownVal === "GO!" ? "go" : "countdown");
      prevCountdown.current = countdownVal;
    }
    if (phase === "reveal" && prevPhase.current !== "reveal") playSound("reveal");
    if (phase === "eliminated" && prevPhase.current && prevPhase.current !== "eliminated") playSound("eliminate");
    prevPhase.current = phase;
  }, [phase, countdownVal]);
  useEffect(() => {
    if (phase === "active" && !answered && timeLeft <= 3.05 && timeLeft > 0) {
      const sec = Math.ceil(timeLeft);
      if (sec !== lastTickSecond.current) {
        lastTickSecond.current = sec;
        playSound("tick");
      }
    } else {
      lastTickSecond.current = -1;
    }
  }, [phase, answered, timeLeft]);
  useEffect(() => {
    const lives = myPlayer?.lives ?? null;
    if (lives !== null && prevLives.current !== null && lives < prevLives.current && lives > 0) {
      playSound("wrong");
    }
    prevLives.current = lives;
  }, [myPlayer?.lives]);

  const onSubmitWord = useCallback(
    async (word: string): Promise<string | null> => {
      if (!round || phase !== "active" || answered) return null;
      // Instant client-side pre-validation (mirrors server rules + copy).
      // checkRealWord returns null while the big dictionary is still loading —
      // in that case we let the server (authoritative) decide.
      if (!word) return "Type a word.";
      if (room.usedWords.includes(word)) return "That word was already used.";
      if (checkRealWord(word) === false) return "Not a valid word.";
      if (room.mode === "anagram") {
        const counts = letterCounts((round.prompt.tiles ?? []).join(""));
        if (!wordFitsLetters(word, counts)) return "You can only use the given letters.";
      } else if (round.prompt.letter && word[0] !== round.prompt.letter) {
        return `Must start with "${round.prompt.letter}".`;
      }
      try {
        const result = await submitWord({ token, roomId, word });
        setLockedWord(word);
        playSound("correct");
        if (result.gotBonus) {
          playSound("bonus");
          setShowBonusPop(true);
          setTimeout(() => setShowBonusPop(false), 1000);
        }
        return null;
      } catch (e) {
        playSound("wrong");
        return convexMessage(e);
      }
    },
    [round, phase, answered, room.usedWords, room.mode, submitWord, token, roomId]
  );

  const modeTitle = MODES.find((m) => m.key === room.mode)?.title ?? "";
  const isLetterMode = room.mode === "letter";
  const players = room.players.map((p) => ({
    id: p.userId,
    name: p.username,
    hue: p.avatarHue,
    url: p.avatarUrl,
    lives: p.lives,
    eliminated: p.status === "eliminated",
  }));

  return (
    <GameView
      roundN={round?.n ?? 1}
      modeTitle={modeTitle}
      phase={phase}
      countdownVal={countdownVal}
      promptLetter={round?.prompt.letter ?? ""}
      promptTiles={round?.prompt.tiles ?? []}
      timeLeft={timeLeft}
      timeLimit={timeLimit}
      showBonusPop={showBonusPop}
      answeredWord={answered ? lockedWord ?? "✓" : null}
      onSubmitWord={onSubmitWord}
      onLeave={() => {
        void leave({ token, roomId });
        router.push("/lobbies");
      }}
      players={players}
      feed={feed.map((f) => ({ id: f.id, text: f.text, kind: f.kind }))}
      promptKey={isLetterMode ? round?.prompt.letter ?? "L" : round?.n ?? 0}
      inputKey={isLetterMode ? "sticky" : round?.n ?? 0}
      stickyPrompt={isLetterMode}
    />
  );
}

function EndScreen({ room, token, meId }: { room: RoomData; token: string; meId: string }) {
  const playAgain = useMutation(api.game.playAgain);
  const leave = useMutation(api.rooms.leave);
  const router = useRouter();

  const winner = room.players.find((p) => p.userId === room.winnerId);
  useEffect(() => {
    playSound(winner?.userId === meId ? "win" : "eliminate");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const standings = [...room.players].sort((a, b) => {
    if (a.userId === room.winnerId) return -1;
    if (b.userId === room.winnerId) return 1;
    return (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0);
  });

  return (
    <GameEndView
      heading={winner ? `${winner.username} Wins!` : "Match Over"}
      winnerName={winner?.username ?? null}
      winnerHue={winner?.avatarHue ?? 300}
      winnerUrl={winner?.avatarUrl}
      standings={standings.map((p) => ({
        id: p.userId,
        name: p.username,
        hue: p.avatarHue,
        url: p.avatarUrl,
        label:
          p.userId === room.winnerId
            ? "Won"
            : p.eliminatedRound
              ? `Eliminated round ${p.eliminatedRound}`
              : "Survived",
      }))}
      knownWords={room.wordLog.map((w) => ({ word: w.word, hue: w.hue }))}
      onPlayAgain={() => void playAgain({ token, roomId: room.id as Id<"rooms"> })}
      onMainMenu={() => {
        void leave({ token, roomId: room.id as Id<"rooms"> });
        router.push("/lobbies");
      }}
    />
  );
}

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id as Id<"rooms">;
  const { token, me, loading } = useRequireAuth();
  const room = useRoom(roomId);
  const spiesGame = useQuery(
    api.spies.get,
    room?.mode === "wordspies" ? { roomId } : "skip"
  );
  const join = useMutation(api.rooms.join);
  const joinedRef = useRef(false);

  // Auto-join open rooms on entry (e.g. after CREATE & JOIN or a lobby Join).
  useEffect(() => {
    if (!token || !me || !room || joinedRef.current) return;
    if (room.status === "open" && !room.players.some((p) => p.userId === me.id)) {
      joinedRef.current = true;
      void join({ token, roomId }).catch(() => {});
    }
  }, [token, me, room, join, roomId]);

  if (loading || !me || !token) return null;
  if (room === undefined) return null;
  if (room === null) {
    return (
      <AppShell showNav={false} backHref="/lobbies">
        <div style={{ padding: 40, fontWeight: 700, color: "var(--muted)" }}>Room not found.</div>
      </AppShell>
    );
  }

  if (room.mode === "wordspies") {
    if (!spiesGame) {
      return (
        <AppShell showNav={false} backHref="/lobbies">
          <RoomLobby room={room} token={token} meId={me.id} />
        </AppShell>
      );
    }
    return <WordSpies room={room} game={spiesGame} token={token} meId={me.id} />;
  }

  if (room.status === "in_progress") {
    const isMember = room.players.some((p) => p.userId === me.id);
    if (!isMember) {
      return (
        <AppShell showNav={false} backHref="/lobbies">
          <div style={{ padding: 40, fontWeight: 700, color: "var(--muted)" }}>
            This match is in progress — try another room.
          </div>
        </AppShell>
      );
    }
    return (
      <div className="relative min-h-screen">
        <Ambient />
        <MultiplayerGame room={room} token={token} meId={me.id} />
      </div>
    );
  }

  if (room.status === "finished") {
    return (
      <div className="relative min-h-screen">
        <Ambient />
        <EndScreen room={room} token={token} meId={me.id} />
      </div>
    );
  }

  return (
    <AppShell showNav={false} backHref="/lobbies">
      <RoomLobby room={room} token={token} meId={me.id} />
    </AppShell>
  );
}
