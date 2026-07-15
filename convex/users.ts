import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { AVATAR_HUES } from "../src/lib/constants";
import { requireUser, makeToken, avatarUrl } from "./helpers";

export const register = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const username = args.username.trim();
    const email = args.email.trim().toLowerCase();
    if (!username) throw new ConvexError("Pick a username.");
    if (!email.includes("@")) throw new ConvexError("Enter a valid email.");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new ConvexError("That email is already registered.");
    const userId = await ctx.db.insert("users", {
      username,
      email,
      passwordHash: args.passwordHash,
      avatarHue: AVATAR_HUES[Math.floor(Math.random() * AVATAR_HUES.length)],
      gamesPlayed: 0,
      gamesWon: 0,
      dailyStreak: 0,
      dailyHistory: [],
    });
    const token = makeToken();
    await ctx.db.insert("sessions", { userId, token });
    return { token };
  },
});

export const login = mutation({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user || user.passwordHash !== args.passwordHash) {
      throw new ConvexError("Invalid email or password.");
    }
    const token = makeToken();
    await ctx.db.insert("sessions", { userId: user._id, token });
    return { token };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    return {
      id: user._id,
      username: user.username,
      email: user.email,
      avatarHue: user.avatarHue,
      avatarUrl: await avatarUrl(ctx, user),
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      fastestAnswerMs: user.fastestAnswerMs ?? null,
      dailyStreak: user.dailyStreak,
      dailyHistory: user.dailyHistory.slice(-14),
    };
  },
});

export const generateAvatarUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const setAvatar = mutation({
  args: { token: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId).catch(() => {});
    }
    await ctx.db.patch(user._id, { avatarStorageId: args.storageId });
  },
});
