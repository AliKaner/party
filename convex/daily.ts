import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./helpers";
import { getDailyWordForToday } from "../src/lib/words";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

type TileState = "correct" | "present" | "absent";

function scoreGuess(guess: string, word: string): TileState[] {
  const result: TileState[] = Array(word.length).fill("absent");
  const remaining: Record<string, number> = {};
  for (let i = 0; i < word.length; i++) {
    if (guess[i] === word[i]) result[i] = "correct";
    else remaining[word[i]] = (remaining[word[i]] || 0) + 1;
  }
  for (let i = 0; i < word.length; i++) {
    if (result[i] === "correct") continue;
    if (remaining[guess[i]]) {
      result[i] = "present";
      remaining[guess[i]]--;
    }
  }
  return result;
}

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const info = getDailyWordForToday();
    const progress = await ctx.db
      .query("dailyProgress")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", todayKey()))
      .unique();
    const guesses = progress?.guesses ?? [];
    const status = progress?.status ?? "playing";
    const wrongCount = guesses.filter((g) => g !== info.word).length;
    return {
      category: info.category,
      length: info.word.length,
      guesses,
      rows: guesses.map((g) => scoreGuess(g, info.word)),
      status,
      // Hint after 3 wrong guesses: reveal the middle letter.
      hintLetter:
        status === "playing" && wrongCount >= 3
          ? info.word[Math.floor(info.word.length / 2)]
          : null,
      word: status !== "playing" ? info.word : null,
    };
  },
});

export const submitGuess = mutation({
  args: { token: v.string(), guess: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const info = getDailyWordForToday();
    const guess = args.guess.trim().toUpperCase();
    if (guess.length !== info.word.length || !/^[A-Z]+$/.test(guess)) {
      throw new ConvexError(`Enter a ${info.word.length}-letter word.`);
    }
    const date = todayKey();
    let progress = await ctx.db
      .query("dailyProgress")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", date))
      .unique();
    if (!progress) {
      const id = await ctx.db.insert("dailyProgress", {
        userId: user._id,
        date,
        word: info.word,
        category: info.category,
        guesses: [],
        status: "playing",
      });
      progress = (await ctx.db.get(id))!;
    }
    if (progress.status !== "playing") throw new ConvexError("Already played today.");
    if (progress.guesses.includes(guess)) throw new ConvexError("Already tried that word.");

    const guesses = [...progress.guesses, guess];
    let status: "playing" | "won" | "lost" = "playing";
    if (guess === info.word) status = "won";
    else if (guesses.length >= 6) status = "lost";
    await ctx.db.patch(progress._id, { guesses, status });

    if (status !== "playing") {
      const won = status === "won";
      const history = [...user.dailyHistory, { date, won }].slice(-60);
      let streak = 0;
      if (won) {
        const playedYesterday = user.dailyHistory.some(
          (h) => h.date === yesterdayKey() && h.won
        );
        streak = playedYesterday ? user.dailyStreak + 1 : 1;
      }
      await ctx.db.patch(user._id, { dailyHistory: history, dailyStreak: streak });
    }
    return { status };
  },
});
