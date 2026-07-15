"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Ambient from "@/components/Ambient";
import GameView, { FeedItem, GamePhase } from "@/components/game/GameView";
import GameEndView from "@/components/game/GameEndView";
import ModeCards from "@/components/ModeCards";
import { useRequireAuth } from "@/lib/auth";
import {
  BASE_TIME_S,
  COUNTDOWN_TICK_MS,
  FAST_ANSWER_MS,
  FAST_BONUS_S,
  GO_HOLD_MS,
  GameMode,
  MODES,
  NEXT_ROUND_GAP_MS,
  REVEAL_MS,
} from "@/lib/constants";
import {
  getRandomLetter,
  letterCounts,
  scrambleRoundLetters,
  wordFitsLetters,
  WORDS_BY_LETTER,
} from "@/lib/words";
import { isRealWord, preloadDictionary } from "@/lib/wordcheck";
import { ensureAudio, playSound } from "@/lib/sounds";

type PracticeMode = Exclude<GameMode, "wordspies">;

type Engine = {
  mode: PracticeMode;
  screen: "game" | "end";
  phase: GamePhase;
  countdownVal: number | "GO!";
  round: number;
  lives: number;
  bonus: number;
  promptLetter: string;
  promptTiles: string[];
  usedWords: string[];
  wordLog: { round: number; word: string }[];
  timeLeft: number;
  timeLimit: number;
  feed: FeedItem[];
  eliminatedRound: number | null;
};

// The solo drill runs entirely client-side: the engine lives in a ref and is
// mutated only from event handlers / timers, then snapshotted into state for
// rendering (keeps StrictMode's double-invoked updaters out of the timers).
export default function PracticePage() {
  const { me, loading } = useRequireAuth();
  const router = useRouter();
  const [setupMode, setSetupMode] = useState<PracticeMode>("letter");
  const eng = useRef<Engine | null>(null);
  const [view, setView] = useState<Engine | null>(null);
  const [showBonusPop, setShowBonusPop] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const feedId = useRef(0);

  const commit = () => setView(eng.current ? { ...eng.current } : null);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  useEffect(() => {
    preloadDictionary();
  }, []);

  const pushFeed = (text: string, kind: FeedItem["kind"]) => {
    const e = eng.current;
    if (!e) return;
    e.feed = [{ id: `f${feedId.current++}`, text, kind }, ...e.feed].slice(0, 8);
  };

  const buildPrompt = (mode: PracticeMode, roundNum: number, used: string[], wordLog: Engine["wordLog"]) => {
    const usedSet = new Set(used);
    if (mode === "anagram") {
      const { letters } = scrambleRoundLetters(usedSet);
      return { letter: "", tiles: letters };
    }
    if (mode === "chain" && roundNum > 1) {
      const lastWords = wordLog.filter((w) => w.round === roundNum - 1);
      if (lastWords.length) {
        const pick = lastWords[Math.floor(Math.random() * lastWords.length)];
        const lastChar = pick.word[pick.word.length - 1];
        if (WORDS_BY_LETTER[lastChar] && WORDS_BY_LETTER[lastChar].length >= 3) {
          return { letter: lastChar, tiles: [] };
        }
      }
    }
    return { letter: getRandomLetter(), tiles: [] };
  };

  const failRound = () => {
    const e = eng.current;
    if (!e) return;
    e.lives -= 1;
    playSound("wrong");
    pushFeed("You couldn't find a word (-1 life)", "wrong");
    if (e.lives <= 0) {
      e.lives = 0;
      e.eliminatedRound = e.round;
      e.phase = "eliminated";
      playSound("eliminate");
      pushFeed("You're out of lives!", "eliminate");
      timers.current.push(
        setTimeout(() => {
          if (eng.current) {
            eng.current.screen = "end";
            commit();
          }
        }, 1400)
      );
    } else {
      e.phase = "gap";
      timers.current.push(setTimeout(() => startRound(e.round + 1), NEXT_ROUND_GAP_MS));
    }
    commit();
  };

  const activateRound = (roundNum: number) => {
    const cur = eng.current;
    if (!cur || cur.round !== roundNum) return;
    const limit = BASE_TIME_S + cur.bonus;
    cur.phase = "active";
    cur.timeLeft = limit;
    cur.timeLimit = limit;
    commit();
    const interval = setInterval(() => {
      const c = eng.current;
      if (!c || c.phase !== "active" || c.round !== roundNum) {
        clearInterval(interval);
        return;
      }
      c.timeLeft = Math.max(0, c.timeLeft - 0.1);
      if (c.timeLeft <= 3.05 && c.timeLeft > 0 && Math.abs(Math.round(c.timeLeft) - c.timeLeft) < 0.06) {
        playSound("tick");
      }
      if (c.timeLeft <= 0) {
        clearInterval(interval);
        failRound();
      } else {
        commit();
      }
    }, 100);
    timers.current.push(interval);
  };

  const startRound = (roundNum: number) => {
    const e = eng.current;
    if (!e) return;
    // Start With a Letter keeps the same letter for the whole drill: no
    // re-reveal, no pause — the next word can be typed immediately.
    const letterRepeat = e.mode === "letter" && roundNum > 1 && e.promptLetter !== "";
    const prompt = letterRepeat
      ? { letter: e.promptLetter, tiles: [] as string[] }
      : buildPrompt(e.mode, roundNum, e.usedWords, e.wordLog);
    e.round = roundNum;
    e.promptLetter = prompt.letter;
    e.promptTiles = prompt.tiles;
    if (letterRepeat) {
      activateRound(roundNum);
      return;
    }
    e.phase = "reveal";
    playSound("reveal");
    commit();
    timers.current.push(setTimeout(() => activateRound(roundNum), REVEAL_MS));
  };

  const beginCountdown = () => {
    clearTimers();
    ensureAudio();
    feedId.current = 0;
    eng.current = {
      mode: setupMode,
      screen: "game",
      phase: "countdown",
      countdownVal: 5,
      round: 0,
      lives: 3,
      bonus: 0,
      promptLetter: "",
      promptTiles: [],
      usedWords: [],
      wordLog: [],
      timeLeft: BASE_TIME_S,
      timeLimit: BASE_TIME_S,
      feed: [],
      eliminatedRound: null,
    };
    commit();
    playSound("countdown");
    let n = 5;
    const step = () => {
      const e = eng.current;
      if (!e) return;
      n -= 1;
      if (n > 0) {
        e.countdownVal = n;
        playSound("countdown");
        commit();
        timers.current.push(setTimeout(step, COUNTDOWN_TICK_MS));
      } else {
        e.countdownVal = "GO!";
        playSound("go");
        commit();
        timers.current.push(setTimeout(() => startRound(1), GO_HOLD_MS));
      }
    };
    timers.current.push(setTimeout(step, COUNTDOWN_TICK_MS));
  };

  const onSubmitWord = (word: string): string | null => {
    const e = eng.current;
    if (!e || e.phase !== "active") return null;
    if (!word) return "Type a word.";
    if (e.usedWords.includes(word)) return "That word was already used.";
    if (!isRealWord(word)) return "Not a valid word.";
    if (e.mode === "anagram") {
      if (!wordFitsLetters(word, letterCounts(e.promptTiles.join("")))) {
        return "You can only use the given letters.";
      }
    } else if (e.promptLetter && word[0] !== e.promptLetter) {
      return `Must start with "${e.promptLetter}".`;
    }
    // Elapsed time derived from the countdown itself (100ms granularity).
    const elapsedMs = Math.max(0, (e.timeLimit - e.timeLeft) * 1000);
    playSound("correct");
    pushFeed(`You: "${word}" correct`, "correct");
    if (elapsedMs <= FAST_ANSWER_MS) {
      e.bonus += FAST_BONUS_S;
      playSound("bonus");
      setShowBonusPop(true);
      timers.current.push(setTimeout(() => setShowBonusPop(false), 1000));
      pushFeed(`You answered fast, +${FAST_BONUS_S}s bonus!`, "bonus");
    }
    e.usedWords = [...e.usedWords, word];
    e.wordLog = [...e.wordLog, { round: e.round, word }];
    if (e.mode === "letter") {
      // Rapid-fire: next word immediately, same letter, fresh timer.
      startRound(e.round + 1);
      return null;
    }
    e.phase = "gap";
    commit();
    timers.current.push(setTimeout(() => startRound(e.round + 1), NEXT_ROUND_GAP_MS));
    return null;
  };

  if (loading || !me) return null;

  if (view?.screen === "end") {
    const survived = Math.max(0, (view.eliminatedRound ?? view.round) - 1);
    return (
      <div className="relative min-h-screen">
        <Ambient />
        <GameEndView
          heading={`You survived ${survived} round${survived === 1 ? "" : "s"}!`}
          winnerName={me.username}
          winnerHue={me.avatarHue}
          winnerUrl={me.avatarUrl}
          standings={[{
            id: "me",
            name: me.username,
            hue: me.avatarHue,
            url: me.avatarUrl,
            label: `Eliminated round ${view.eliminatedRound ?? view.round}`,
          }]}
          knownWords={view.wordLog.map((w) => ({ word: w.word, hue: me.avatarHue }))}
          onPlayAgain={beginCountdown}
          onMainMenu={() => router.push("/lobbies")}
        />
      </div>
    );
  }

  if (view) {
    return (
      <div className="relative min-h-screen">
        <Ambient />
        <GameView
          roundN={view.round}
          modeTitle={MODES.find((m) => m.key === view.mode)?.title ?? ""}
          phase={view.phase}
          countdownVal={view.countdownVal}
          promptLetter={view.promptLetter}
          promptTiles={view.promptTiles}
          timeLeft={view.timeLeft}
          timeLimit={view.timeLimit}
          showBonusPop={showBonusPop}
          answeredWord={null}
          onSubmitWord={onSubmitWord}
          onLeave={() => { clearTimers(); eng.current = null; setView(null); }}
          players={[{ id: "me", name: me.username, hue: me.avatarHue, url: me.avatarUrl, lives: view.lives, eliminated: view.phase === "eliminated" }]}
          feed={view.feed}
          promptKey={view.mode === "letter" ? view.promptLetter || "L" : view.round}
          inputKey={view.mode === "letter" ? "sticky" : view.round}
          stickyPrompt={view.mode === "letter"}
        />
      </div>
    );
  }

  return (
    <AppShell activeKey="practice">
      <div className="mx-auto w-full flex flex-col gap-6" style={{ maxWidth: 720, padding: "26px 24px 48px" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
            SOLO PRACTICE
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>
            The same live game, just you — the drill ends when your 3 lives run out.
          </p>
        </div>
        <ModeCards
          selected={setupMode}
          keys={["letter", "chain", "anagram"]}
          onSelect={(m) => setSetupMode(m as PracticeMode)}
        />
        <button className="pb-btn self-start" style={{ minWidth: 220 }} onClick={beginCountdown}>
          START PRACTICE
        </button>
      </div>
    </AppShell>
  );
}
