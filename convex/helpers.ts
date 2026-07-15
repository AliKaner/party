import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

export function makeToken(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Doc<"users">> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session) throw new ConvexError("Not signed in.");
  const user = await ctx.db.get(session.userId);
  if (!user) throw new ConvexError("Not signed in.");
  return user;
}

export async function optionalUser(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
): Promise<Doc<"users"> | null> {
  if (!token) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session) return null;
  return await ctx.db.get(session.userId);
}

export async function avatarUrl(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">
): Promise<string | null> {
  if (!user.avatarStorageId) return null;
  return await ctx.storage.getUrl(user.avatarStorageId);
}

export function publicUser(user: Doc<"users">, url: string | null) {
  return {
    id: user._id,
    username: user.username,
    avatarHue: user.avatarHue,
    avatarUrl: url,
  };
}
