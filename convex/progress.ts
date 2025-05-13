import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all progress entries for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get progress for a specific topic
export const getByTopic = query({
  args: { 
    userId: v.id("users"),
    topic: v.string(),
  },
  handler: async (ctx, args) => {
    const allProgress = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    return allProgress.find(p => p.topic === args.topic);
  },
});

// Create or update progress for a topic
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    topic: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if progress for this topic already exists
    const existing = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("topic"), args.topic))
      .first();
    
    if (existing) {
      // Update existing progress
      return await ctx.db.patch(existing._id, {
        confidence: args.confidence,
        lastReviewed: Date.now(),
      });
    } else {
      // Create new progress entry
      return await ctx.db.insert("progress", {
        userId: args.userId,
        topic: args.topic,
        confidence: args.confidence,
        lastReviewed: Date.now(),
      });
    }
  },
});

// Get topics that need review (low confidence or not recently reviewed)
export const getTopicsForReview = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const allProgress = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    // Filter topics that have low confidence or haven't been reviewed recently
    return allProgress.filter(p => {
      const timeSinceReview = now - p.lastReviewed;
      return p.confidence < 70 || timeSinceReview > oneWeek;
    }).sort((a, b) => {
      // Sort by lowest confidence first
      return a.confidence - b.confidence;
    });
  },
});

// Delete progress for a topic
export const remove = mutation({
  args: { id: v.id("progress") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});