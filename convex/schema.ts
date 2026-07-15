import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const gameMode = v.union(
  v.literal("letter"),
  v.literal("chain"),
  v.literal("anagram"),
  v.literal("wordspies")
);

export default defineSchema({
  users: defineTable({
    username: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    avatarHue: v.number(),
    avatarStorageId: v.optional(v.id("_storage")),
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    fastestAnswerMs: v.optional(v.number()),
    dailyStreak: v.number(),
    dailyHistory: v.array(v.object({ date: v.string(), won: v.boolean() })),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
  }).index("by_token", ["token"]),

  rooms: defineTable({
    name: v.string(),
    mode: gameMode,
    hostId: v.id("users"),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("finished")),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    startingCount: v.optional(v.number()),
    round: v.number(),
    usedWords: v.array(v.string()),
    wordLog: v.array(
      v.object({
        round: v.number(),
        userId: v.id("users"),
        name: v.string(),
        word: v.string(),
        hue: v.number(),
      })
    ),
    winnerId: v.optional(v.id("users")),
  }).index("by_status", ["status"]),

  roomPlayers: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    lives: v.number(),
    status: v.union(v.literal("joined"), v.literal("eliminated"), v.literal("left")),
    bonusSeconds: v.number(),
    eliminatedRound: v.optional(v.number()),
    team: v.optional(v.union(v.literal("blue"), v.literal("red"))),
    role: v.optional(v.union(v.literal("spymaster"), v.literal("operative"))),
    joinedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"])
    .index("by_user", ["userId"]),

  rounds: defineTable({
    roomId: v.id("rooms"),
    n: v.number(),
    prompt: v.object({
      letter: v.optional(v.string()),
      tiles: v.optional(v.array(v.string())),
    }),
    revealAt: v.number(),
    activeAt: v.number(),
    endsAt: v.number(),
    resolved: v.boolean(),
    answers: v.array(
      v.object({ userId: v.id("users"), word: v.string(), ms: v.number() })
    ),
    scheduledResolveId: v.optional(v.id("_scheduled_functions")),
  }).index("by_room", ["roomId", "n"]),

  feedEvents: defineTable({
    roomId: v.id("rooms"),
    text: v.string(),
    kind: v.union(
      v.literal("correct"),
      v.literal("bonus"),
      v.literal("wrong"),
      v.literal("eliminate"),
      v.literal("info")
    ),
    at: v.number(),
    // For correct-answer events: the submitter and their word. The word is
    // only shown back to the submitter — other players just see that a
    // word was found.
    userId: v.optional(v.id("users")),
    word: v.optional(v.string()),
  }).index("by_room", ["roomId"]),

  spiesGames: defineTable({
    roomId: v.id("rooms"),
    words: v.array(v.string()),
    colors: v.array(
      v.union(v.literal("blue"), v.literal("red"), v.literal("neutral"), v.literal("assassin"))
    ),
    revealed: v.array(v.boolean()),
    turn: v.union(v.literal("blue"), v.literal("red")),
    status: v.union(v.literal("playing"), v.literal("blue_win"), v.literal("red_win")),
    clueText: v.string(),
  }).index("by_room", ["roomId"]),

  dailyProgress: defineTable({
    userId: v.id("users"),
    date: v.string(),
    word: v.string(),
    category: v.string(),
    guesses: v.array(v.string()),
    status: v.union(v.literal("playing"), v.literal("won"), v.literal("lost")),
  }).index("by_user_date", ["userId", "date"]),

  quizzes: defineTable({
    ownerId: v.id("users"),
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
    createdAt: v.number(),
    plays: v.number(),
  }),
});
