import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { requireUser } from "./helpers";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  getRandomLetter,
  letterCounts,
  scrambleRoundLetters,
  wordFitsLetters,
  WORDS_BY_LETTER,
} from "../src/lib/words";
import { isDictionaryWord } from "../src/lib/dictionary";
import {
  BASE_TIME_S,
  COUNTDOWN_TOTAL_MS,
  FAST_ANSWER_MS,
  FAST_BONUS_S,
  NEXT_ROUND_GAP_MS,
  REVEAL_MS,
} from "../src/lib/constants";

// Grace added to server deadlines so a submit racing the resolver isn't
// rejected by clock skew / network latency.
const DEADLINE_SLACK_MS = 400;

async function alivePlayers(ctx: MutationCtx, roomId: Id<"rooms">) {
  const players = await ctx.db
    .query("roomPlayers")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  return players.filter((p) => p.status === "joined");
}

async function feed(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  text: string,
  kind: "correct" | "bonus" | "wrong" | "eliminate" | "info"
) {
  await ctx.db.insert("feedEvents", { roomId, text, kind, at: Date.now() });
}

function buildPrompt(room: Doc<"rooms">, roundNum: number, prevLetter?: string) {
  const used = new Set(room.usedWords);
  if (room.mode === "anagram") {
    const { letters } = scrambleRoundLetters(used);
    return { tiles: letters };
  }
  // Start With a Letter picks one letter for the whole match.
  if (room.mode === "letter" && roundNum > 1 && prevLetter) {
    return { letter: prevLetter };
  }
  if (room.mode === "chain" && roundNum > 1) {
    const lastWords = room.wordLog.filter((w) => w.round === roundNum - 1);
    if (lastWords.length) {
      const pick = lastWords[Math.floor(Math.random() * lastWords.length)];
      const lastChar = pick.word[pick.word.length - 1];
      if (WORDS_BY_LETTER[lastChar] && WORDS_BY_LETTER[lastChar].length >= 3) {
        return { letter: lastChar };
      }
    }
  }
  return { letter: getRandomLetter() };
}

async function createRound(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  n: number,
  revealAt: number
) {
  const alive = await alivePlayers(ctx, room._id);
  const maxBonus = alive.reduce((m, p) => Math.max(m, p.bonusSeconds), 0);
  let prevLetter: string | undefined;
  if (room.mode === "letter" && n > 1) {
    const prev = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", room._id).eq("n", n - 1))
      .unique();
    prevLetter = prev?.prompt.letter;
  }
  // After round 1 the letter mode's prompt is already known, so there is no
  // reveal pause — players can fire words back-to-back.
  const activeAt = room.mode === "letter" && n > 1 ? revealAt : revealAt + REVEAL_MS;
  const endsAt = activeAt + (BASE_TIME_S + maxBonus) * 1000;
  const roundId = await ctx.db.insert("rounds", {
    roomId: room._id,
    n,
    prompt: buildPrompt(room, n, prevLetter),
    revealAt,
    activeAt,
    endsAt,
    resolved: false,
    answers: [],
  });
  const scheduledResolveId = await ctx.scheduler.runAt(
    endsAt + DEADLINE_SLACK_MS,
    internal.game.resolveRound,
    { roomId: room._id, n }
  );
  await ctx.db.patch(roundId, { scheduledResolveId });
  await ctx.db.patch(room._id, { round: n });
}

async function beginMatch(ctx: MutationCtx, room: Doc<"rooms">) {
  const alive = await alivePlayers(ctx, room._id);
  const now = Date.now();
  await ctx.db.patch(room._id, {
    status: "in_progress",
    startedAt: now,
    startingCount: alive.length,
    round: 0,
    usedWords: [],
    wordLog: [],
    winnerId: undefined,
  });
  const fresh = (await ctx.db.get(room._id))!;
  await createRound(ctx, fresh, 1, now + COUNTDOWN_TOTAL_MS);
}

export const startGame = mutation({
  args: { token: v.string(), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.status !== "open") throw new ConvexError("Match already started.");
    if (room.mode === "wordspies") throw new ConvexError("Use the Word Spies board.");
    const alive = await alivePlayers(ctx, args.roomId);
    if (!alive.some((p) => p.userId === user._id)) throw new ConvexError("Join the room first.");
    await feed(ctx, args.roomId, `${user.username} started the match`, "info");
    await beginMatch(ctx, room);
  },
});

export const playAgain = mutation({
  args: { token: v.string(), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.status !== "finished") throw new ConvexError("Match still running.");
    const players = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    if (!players.some((p) => p.userId === user._id && p.status !== "left")) {
      throw new ConvexError("Join the room first.");
    }
    for (const p of players) {
      if (p.status === "left") continue;
      await ctx.db.patch(p._id, {
        status: "joined",
        lives: 3,
        bonusSeconds: 0,
        eliminatedRound: undefined,
      });
    }
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    for (const r of rounds) await ctx.db.delete(r._id);
    const events = await ctx.db
      .query("feedEvents")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    for (const e of events) await ctx.db.delete(e._id);
    await beginMatch(ctx, room);
  },
});

export const currentRound = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .first();
    if (!round) return null;
    return {
      n: round.n,
      prompt: round.prompt,
      revealAt: round.revealAt,
      activeAt: round.activeAt,
      endsAt: round.endsAt,
      resolved: round.resolved,
      answeredUserIds: round.answers.map((a) => a.userId),
      serverNow: Date.now(),
    };
  },
});

export const feedList = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("feedEvents")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(8);
    return events.map((e) => ({ id: e._id, text: e.text, kind: e.kind, at: e.at }));
  },
});

export const submitWord = mutation({
  args: { token: v.string(), roomId: v.id("rooms"), word: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "in_progress") throw new ConvexError("Match is not running.");
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .first();
    if (!round || round.resolved) throw new ConvexError("Round is over.");
    const player = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", user._id))
      .unique();
    if (!player || player.status !== "joined") throw new ConvexError("You are not in this round.");
    const now = Date.now();
    if (now < round.activeAt - DEADLINE_SLACK_MS) throw new ConvexError("Round hasn't started.");
    const myDeadline = round.activeAt + (BASE_TIME_S + player.bonusSeconds) * 1000;
    if (now > myDeadline + DEADLINE_SLACK_MS) throw new ConvexError("Time is up.");
    if (round.answers.some((a) => a.userId === user._id)) throw new ConvexError("Already answered this round.");

    const word = args.word.trim().toUpperCase();
    if (!word) throw new ConvexError("Type a word.");
    if (room.usedWords.includes(word)) throw new ConvexError("That word was already used.");
    if (!isDictionaryWord(word)) throw new ConvexError("Not a valid word.");
    if (room.mode === "anagram") {
      const counts = letterCounts((round.prompt.tiles ?? []).join(""));
      if (!wordFitsLetters(word, counts)) {
        throw new ConvexError("You can only use the given letters.");
      }
    } else if (round.prompt.letter && word[0] !== round.prompt.letter) {
      throw new ConvexError(`Must start with "${round.prompt.letter}".`);
    }

    const ms = Math.max(0, now - round.activeAt);
    await ctx.db.patch(round._id, {
      answers: [...round.answers, { userId: user._id, word, ms }],
    });
    await ctx.db.patch(args.roomId, {
      usedWords: [...room.usedWords, word],
      wordLog: [
        ...room.wordLog,
        { round: round.n, userId: user._id, name: user.username, word, hue: user.avatarHue },
      ],
    });
    await feed(ctx, args.roomId, `${user.username}: "${word}" correct`, "correct");

    let gotBonus = false;
    if (ms <= FAST_ANSWER_MS) {
      gotBonus = true;
      await ctx.db.patch(player._id, { bonusSeconds: player.bonusSeconds + FAST_BONUS_S });
      await feed(ctx, args.roomId, `${user.username} answered fast, +${FAST_BONUS_S}s bonus!`, "bonus");
    }
    if (user.fastestAnswerMs == null || ms < user.fastestAnswerMs) {
      await ctx.db.patch(user._id, { fastestAnswerMs: ms });
    }

    // If every alive player has answered, resolve immediately instead of
    // waiting for the scheduled deadline.
    const alive = await alivePlayers(ctx, args.roomId);
    const updated = (await ctx.db.get(round._id))!;
    const allAnswered = alive.every((p) =>
      updated.answers.some((a) => a.userId === p.userId)
    );
    if (allAnswered) {
      if (round.scheduledResolveId) {
        await ctx.scheduler.cancel(round.scheduledResolveId).catch(() => {});
      }
      await resolveRoundInner(ctx, args.roomId, round.n);
    }
    return { ms, gotBonus };
  },
});

async function resolveRoundInner(ctx: MutationCtx, roomId: Id<"rooms">, n: number) {
  const room = await ctx.db.get(roomId);
  if (!room || room.status !== "in_progress" || room.round !== n) return;
  const round = await ctx.db
    .query("rounds")
    .withIndex("by_room", (q) => q.eq("roomId", roomId).eq("n", n))
    .unique();
  if (!round || round.resolved) return;
  await ctx.db.patch(round._id, { resolved: true });

  const alive = await alivePlayers(ctx, roomId);
  let lastEliminated: Id<"users"> | null = null;
  for (const p of alive) {
    if (round.answers.some((a) => a.userId === p.userId)) continue;
    const user = await ctx.db.get(p.userId);
    const name = user?.username ?? "???";
    const lives = p.lives - 1;
    await feed(ctx, roomId, `${name} couldn't find a word (-1 life)`, "wrong");
    if (lives <= 0) {
      await ctx.db.patch(p._id, { lives: 0, status: "eliminated", eliminatedRound: n });
      await feed(ctx, roomId, `${name} eliminated!`, "eliminate");
      lastEliminated = p.userId;
    } else {
      await ctx.db.patch(p._id, { lives });
    }
  }

  const stillAlive = await alivePlayers(ctx, roomId);
  const startingCount = room.startingCount ?? 2;
  const matchOver =
    startingCount > 1 ? stillAlive.length <= 1 : stillAlive.length === 0;

  if (matchOver) {
    const winnerId = stillAlive[0]?.userId ?? lastEliminated ?? undefined;
    await ctx.db.patch(roomId, { status: "finished", winnerId });
    const players = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const p of players) {
      if (p.status === "left") continue;
      const u = await ctx.db.get(p.userId);
      if (!u) continue;
      await ctx.db.patch(u._id, {
        gamesPlayed: u.gamesPlayed + 1,
        gamesWon: u.gamesWon + (p.userId === winnerId ? 1 : 0),
      });
    }
    return;
  }

  // Letter mode chains rounds near-instantly (same prompt, no reveal).
  const gap = room.mode === "letter" ? 300 : NEXT_ROUND_GAP_MS;
  await createRound(ctx, (await ctx.db.get(roomId))!, n + 1, Date.now() + gap);
}

export const resolveRound = internalMutation({
  args: { roomId: v.id("rooms"), n: v.number() },
  handler: async (ctx, args) => {
    await resolveRoundInner(ctx, args.roomId, args.n);
  },
});
