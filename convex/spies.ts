import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { requireUser } from "./helpers";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { WORDS } from "../src/lib/words";

type TileColor = "blue" | "red" | "neutral" | "assassin";

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateClue(game: { words: string[]; colors: TileColor[]; revealed: boolean[] }) {
  const remaining = game.colors
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c === "blue" && !game.revealed[x.i]);
  if (!remaining.length) return "";
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  const w = game.words[pick.i];
  return `Starts with "${w[0]}" · ${w.length} letters`;
}

async function freshBoard(ctx: MutationCtx, roomId: Id<"rooms">) {
  const words = shuffled(WORDS).slice(0, 25);
  const colorPool: TileColor[] = shuffled([
    ...Array<TileColor>(9).fill("blue"),
    ...Array<TileColor>(8).fill("red"),
    ...Array<TileColor>(7).fill("neutral"),
    "assassin" as TileColor,
  ]);
  const base = {
    roomId,
    words,
    colors: colorPool,
    revealed: Array(25).fill(false),
    turn: "blue" as const,
    status: "playing" as const,
    clueText: "",
  };
  const existing = await ctx.db
    .query("spiesGames")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .unique();
  const clueText = generateClue(base);
  if (existing) {
    await ctx.db.patch(existing._id, { ...base, clueText });
    return existing._id;
  }
  return await ctx.db.insert("spiesGames", { ...base, clueText });
}

export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("spiesGames")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (!game) return null;
    return {
      words: game.words,
      // Colors are needed for SHOW KEY and revealed tiles; this is a
      // casual party game, same as the prototype's client-side key.
      colors: game.colors,
      revealed: game.revealed,
      turn: game.turn,
      status: game.status,
      clueText: game.clueText,
    };
  },
});

export const newBoard = mutation({
  args: { token: v.string(), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const room = await ctx.db.get(args.roomId);
    if (!room || room.mode !== "wordspies") throw new ConvexError("Not a Word Spies room.");
    await freshBoard(ctx, args.roomId);
  },
});

function applyReveal(game: Doc<"spiesGames">, idx: number) {
  const revealed = [...game.revealed];
  revealed[idx] = true;
  const color = game.colors[idx];
  const prevTurn = game.turn;
  let turn = game.turn;
  let status: Doc<"spiesGames">["status"] = "playing";
  if (color === "assassin") {
    status = game.turn === "blue" ? "red_win" : "blue_win";
  } else {
    const teamLeft = (team: TileColor) =>
      game.colors.some((c, i) => c === team && !revealed[i]);
    if (color === game.turn) {
      if (!teamLeft(game.turn)) status = `${game.turn}_win` as typeof status;
    } else {
      turn = game.turn === "blue" ? "red" : "blue";
      if (color !== "neutral" && !teamLeft(color)) status = `${color}_win` as typeof status;
    }
  }
  let clueText = game.clueText;
  if (status === "playing" && turn === "blue" && turn !== prevTurn) {
    clueText = generateClue({ words: game.words, colors: game.colors, revealed });
  }
  return { revealed, turn, status, clueText, prevTurn };
}

export const reveal = mutation({
  args: { token: v.string(), roomId: v.id("rooms"), idx: v.number() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const game = await ctx.db
      .query("spiesGames")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (!game || game.status !== "playing") return;
    if (game.revealed[args.idx]) return;
    if (game.turn !== "blue") throw new ConvexError("It's the Red team's turn.");
    const next = applyReveal(game, args.idx);
    await ctx.db.patch(game._id, {
      revealed: next.revealed,
      turn: next.turn,
      status: next.status,
      clueText: next.clueText,
    });
    if (next.status === "playing" && next.turn === "red") {
      await ctx.scheduler.runAfter(900, internal.spies.botMove, { roomId: args.roomId });
    }
  },
});

export const endTurn = mutation({
  args: { token: v.string(), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const game = await ctx.db
      .query("spiesGames")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (!game || game.status !== "playing" || game.turn !== "blue") return;
    await ctx.db.patch(game._id, { turn: "red", clueText: "" });
    await ctx.scheduler.runAfter(700, internal.spies.botMove, { roomId: args.roomId });
  },
});

// The Red team is played by bots: reveal a random remaining red tile,
// then 55% chance to keep guessing, else pass back to Blue (same as the
// prototype's botWordSpiesTurn).
export const botMove = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("spiesGames")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (!game || game.status !== "playing" || game.turn !== "red") return;
    const remainingRed = game.colors
      .map((c, i) => ({ c, i }))
      .filter((x) => x.c === "red" && !game.revealed[x.i]);
    if (!remainingRed.length) return;
    const pick = remainingRed[Math.floor(Math.random() * remainingRed.length)];
    const next = applyReveal(game, pick.i);
    await ctx.db.patch(game._id, {
      revealed: next.revealed,
      turn: next.turn,
      status: next.status,
      clueText: next.clueText,
    });
    if (next.status === "playing" && next.turn === "red") {
      if (Math.random() < 0.55) {
        await ctx.scheduler.runAfter(1100, internal.spies.botMove, { roomId: args.roomId });
      } else {
        const updated = (await ctx.db.get(game._id))!;
        await ctx.db.patch(game._id, {
          turn: "blue",
          clueText: generateClue({
            words: updated.words,
            colors: updated.colors,
            revealed: updated.revealed,
          }),
        });
      }
    }
  },
});
