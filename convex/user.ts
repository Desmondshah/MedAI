import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get user by ID
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a development user (for testing)
export const createDevUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if a dev user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAnonymous"), true))
      .first();
    
    if (existingUser) {
      return existingUser._id;
    }
    
    // Create a new dev user
    return await ctx.db.insert("users", {
      name: "Dr. Eniola (Dev)",
      email: "dev_user@example.com",
      avatarUrl: undefined,
      isAnonymous: true,
    });
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Verify user exists
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("User not found");
    }
    
    // Apply updates
    return await ctx.db.patch(id, updates);
  },
});

// Get user profile with stats
export const getProfileWithStats = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Get counts of various items
    const notesCount = (await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect()).length;
    
    const flashcardsCount = (await ctx.db
      .query("flashcards")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect()).length;
    
    const quizzesCount = (await ctx.db
      .query("quizzes")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect()).length;
    
    const bookmarksCount = (await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect()).length;
    
    const wellnessCheckins = (await ctx.db
      .query("wellnessCheckins")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect()).length;
    
    // Return user with stats
    return {
      ...user,
      stats: {
        notesCount,
        flashcardsCount,
        quizzesCount,
        bookmarksCount,
        wellnessCheckins,
      },
    };
  },
});