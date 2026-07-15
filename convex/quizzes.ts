import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./helpers";

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    questions: v.array(
      v.object({
        text: v.string(),
        imageStorageId: v.optional(v.id("_storage")),
        options: v.array(v.string()),
        correct: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const title = args.title.trim();
    if (!title) throw new ConvexError("Give your quiz a title.");
    if (!args.questions.length) throw new ConvexError("Add at least one question.");
    for (const q of args.questions) {
      if (!q.text.trim()) throw new ConvexError("Every question needs text.");
      const opts = q.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) throw new ConvexError("Every question needs at least 2 answers.");
      if (q.correct < 0 || q.correct >= q.options.length) {
        throw new ConvexError("Mark the correct answer for every question.");
      }
    }
    const quizId = await ctx.db.insert("quizzes", {
      ownerId: user._id,
      title,
      description: args.description?.trim() || undefined,
      coverStorageId: args.coverStorageId,
      questions: args.questions,
      createdAt: Date.now(),
      plays: 0,
    });
    return { quizId };
  },
});

export const remove = mutation({
  args: { token: v.string(), quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return;
    if (quiz.ownerId !== user._id) throw new ConvexError("Only the owner can delete a quiz.");
    if (quiz.coverStorageId) await ctx.storage.delete(quiz.coverStorageId).catch(() => {});
    for (const q of quiz.questions) {
      if (q.imageStorageId) await ctx.storage.delete(q.imageStorageId).catch(() => {});
    }
    await ctx.db.delete(args.quizId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const quizzes = await ctx.db.query("quizzes").order("desc").collect();
    return await Promise.all(
      quizzes.map(async (q) => {
        const owner = await ctx.db.get(q.ownerId);
        return {
          id: q._id,
          title: q.title,
          description: q.description ?? null,
          coverUrl: q.coverStorageId ? await ctx.storage.getUrl(q.coverStorageId) : null,
          questionCount: q.questions.length,
          plays: q.plays,
          ownerId: q.ownerId,
          ownerName: owner?.username ?? "???",
          ownerHue: owner?.avatarHue ?? 300,
        };
      })
    );
  },
});

export const get = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return null;
    const owner = await ctx.db.get(quiz.ownerId);
    return {
      id: quiz._id,
      title: quiz.title,
      description: quiz.description ?? null,
      coverUrl: quiz.coverStorageId ? await ctx.storage.getUrl(quiz.coverStorageId) : null,
      ownerName: owner?.username ?? "???",
      plays: quiz.plays,
      questions: await Promise.all(
        quiz.questions.map(async (q) => ({
          text: q.text,
          imageUrl: q.imageStorageId ? await ctx.storage.getUrl(q.imageStorageId) : null,
          options: q.options,
          correct: q.correct,
        }))
      ),
    };
  },
});

export const recordPlay = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.quizId);
    if (quiz) await ctx.db.patch(args.quizId, { plays: quiz.plays + 1 });
  },
});
