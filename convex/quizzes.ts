import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all quizzes for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizzes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get a specific quiz by ID
export const getById = query({
  args: { id: v.id("quizzes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new quiz
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()), // <<-- ADD THIS LINE
      })
    ),
    difficulty: v.optional(v.string()), // If storing difficulty
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quizzes", {
      userId: args.userId,
      title: args.title,
      questions: args.questions, // Now args.questions can include 'explanation'
      score: undefined,
      takenAt: undefined,
     difficulty: args.difficulty,
    });
  },
});

// Update quiz score after taking it
export const updateScore = mutation({
  args: {
    id: v.id("quizzes"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      score: args.score,
      takenAt: Date.now(),
    });
  },
});

// Delete a quiz
export const remove = mutation({
  args: { id: v.id("quizzes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get quizzes by topic
export const getByTopic = query({
  args: { 
    userId: v.id("users"),
    topic: v.string(),
  },
  handler: async (ctx, args) => {
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Simple text matching for topic
    const topicLower = args.topic.toLowerCase();
    return quizzes.filter(quiz => 
      quiz.title.toLowerCase().includes(topicLower)
    );
  },
});

// Get completed quizzes
export const getCompleted = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    return quizzes.filter(quiz => quiz.score !== undefined);
  },
});

// Get uncompleted quizzes
export const getUncompleted = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    return quizzes.filter(quiz => quiz.score === undefined);
  },
});