import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser, avatarUrl } from "./helpers";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const gameModeArg = v.union(
  v.literal("letter"),
  v.literal("chain"),
  v.literal("anagram"),
  v.literal("wordspies")
);

async function roomPlayers(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
  return await ctx.db
    .query("roomPlayers")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
}

/** Assign Word Spies teams: alternate blue/red, exactly one spymaster per team.
 *  Humans joining are operatives; the first slot of each team is its spymaster. */
async function assignSpiesRoles(ctx: MutationCtx, roomId: Id<"rooms">) {
  const players = (await roomPlayers(ctx, roomId)).filter((p) => p.status !== "left");
  players.sort((a, b) => a.joinedAt - b.joinedAt);
  let blueCount = 0;
  let redCount = 0;
  for (const p of players) {
    const team = blueCount <= redCount ? "blue" : "red";
    const count = team === "blue" ? blueCount : redCount;
    await ctx.db.patch(p._id, {
      team,
      role: count === 0 ? "spymaster" : "operative",
    });
    if (team === "blue") blueCount++;
    else redCount++;
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const open = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const inProgress = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();
    const rooms = [...open, ...inProgress].sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      rooms.map(async (room) => {
        const players = (await roomPlayers(ctx, room._id)).filter(
          (p) => p.status !== "left"
        );
        const previews = await Promise.all(
          players.slice(0, 4).map(async (p) => {
            const u = await ctx.db.get(p.userId);
            return u
              ? { hue: u.avatarHue, initial: u.username[0]?.toUpperCase() ?? "?", url: await avatarUrl(ctx, u) }
              : { hue: 300, initial: "?", url: null };
          })
        );
        return {
          id: room._id,
          name: room.name,
          mode: room.mode,
          status: room.status,
          elapsedMin: room.startedAt
            ? Math.max(0, Math.round((Date.now() - room.startedAt) / 60000))
            : 0,
          playerCount: players.length,
          previews,
        };
      })
    );
  },
});

export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    const players = await roomPlayers(ctx, args.roomId);
    const withUsers = await Promise.all(
      players
        .filter((p) => p.status !== "left")
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map(async (p) => {
          const u = await ctx.db.get(p.userId);
          return {
            userId: p.userId,
            username: u?.username ?? "???",
            avatarHue: u?.avatarHue ?? 300,
            avatarUrl: u ? await avatarUrl(ctx, u) : null,
            lives: p.lives,
            status: p.status,
            bonusSeconds: p.bonusSeconds,
            eliminatedRound: p.eliminatedRound ?? null,
            team: p.team ?? null,
            role: p.role ?? null,
          };
        })
    );
    return {
      id: room._id,
      name: room.name,
      mode: room.mode,
      hostId: room.hostId,
      status: room.status,
      startedAt: room.startedAt ?? null,
      startingCount: room.startingCount ?? null,
      round: room.round,
      usedWords: room.usedWords,
      wordLog: room.wordLog,
      winnerId: room.winnerId ?? null,
      players: withUsers,
    };
  },
});

export const create = mutation({
  args: { token: v.string(), name: v.string(), mode: gameModeArg },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const name = args.name.trim() || `${user.username}'s Room`;
    const roomId = await ctx.db.insert("rooms", {
      name,
      mode: args.mode,
      hostId: user._id,
      status: "open",
      createdAt: Date.now(),
      round: 0,
      usedWords: [],
      wordLog: [],
    });
    await ctx.db.insert("roomPlayers", {
      roomId,
      userId: user._id,
      lives: 3,
      status: "joined",
      bonusSeconds: 0,
      joinedAt: Date.now(),
    });
    if (args.mode === "wordspies") await assignSpiesRoles(ctx, roomId);
    return { roomId };
  },
});

export const join = mutation({
  args: { token: v.string(), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.status === "in_progress") throw new ConvexError("Match already in progress.");
    if (room.status === "finished") throw new ConvexError("Room is closed.");
    const existing = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", user._id))
      .unique();
    if (existing) {
      if (existing.status === "left") {
        await ctx.db.patch(existing._id, { status: "joined", lives: 3, bonusSeconds: 0, joinedAt: Date.now() });
      }
    } else {
      const count = (await roomPlayers(ctx, args.roomId)).filter((p) => p.status !== "left").length;
      if (count >= 16) throw new ConvexError("Room is full.");
      await ctx.db.insert("roomPlayers", {
        roomId: args.roomId,
        userId: user._id,
        lives: 3,
        status: "joined",
        bonusSeconds: 0,
        joinedAt: Date.now(),
      });
    }
    if (room.mode === "wordspies") await assignSpiesRoles(ctx, args.roomId);
  },
});

export const leave = mutation({
  args: { token: v.string(), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const room = await ctx.db.get(args.roomId);
    if (!room) return;
    const player = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", user._id))
      .unique();
    if (player) await ctx.db.patch(player._id, { status: "left" });
    const remaining = (await roomPlayers(ctx, args.roomId)).filter((p) => p.status === "joined" || p.status === "eliminated");
    if (!remaining.length) {
      await ctx.db.patch(args.roomId, { status: "finished" });
    } else if (room.hostId === user._id) {
      await ctx.db.patch(args.roomId, { hostId: remaining[0].userId });
    }
    if (room.mode === "wordspies" && remaining.length) await assignSpiesRoles(ctx, args.roomId);
  },
});

export const setMode = mutation({
  args: { token: v.string(), roomId: v.id("rooms"), mode: gameModeArg },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.hostId !== user._id) throw new ConvexError("Only the host can change the game mode.");
    if (room.status !== "open") throw new ConvexError("Match already started.");
    if (room.mode === "wordspies" || args.mode === "wordspies") {
      throw new ConvexError("Word Spies rooms keep their mode.");
    }
    await ctx.db.patch(args.roomId, { mode: args.mode });
  },
});

export const debugList = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").collect();
    const players = await ctx.db.query("roomPlayers").collect();
    return { rooms, players };
  },
});

