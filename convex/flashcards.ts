import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all flashcards for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcards")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get flashcards by category
export const getByCategory = query({
  args: { 
    userId: v.id("users"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcards")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("category"), args.category))
      .collect();
  },
});

// Get a specific flashcard
export const getById = query({
  args: { id: v.id("flashcards") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a single flashcard
export const create = mutation({
  args: {
    userId: v.id("users"),
    front: v.string(),
    back: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("flashcards", {
      userId: args.userId,
      front: args.front,
      back: args.back,
      category: args.category,
      lastReviewed: Date.now(),
      confidence: 0,
    });
  },
});

// Create multiple flashcards at once
export const createBatch = mutation({
  args: {
    userId: v.id("users"),
    cards: v.array(
      v.object({
        front: v.string(),
        back: v.string(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const card of args.cards) {
      const id = await ctx.db.insert("flashcards", {
        userId: args.userId,
        front: card.front,
        back: card.back,
        category: card.category,
        lastReviewed: Date.now(),
        confidence: 0,
      });
      ids.push(id);
    }
    return ids;
  },
});

// Update flashcard review status
export const updateReview = mutation({
  args: {
    id: v.id("flashcards"),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      lastReviewed: Date.now(),
      confidence: args.confidence,
    });
  },
});

// Delete a flashcard
export const remove = mutation({
  args: { id: v.id("flashcards") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Delete all flashcards in a category
export const removeCategory = mutation({
  args: { 
    userId: v.id("users"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const flashcards = await ctx.db
      .query("flashcards")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("category"), args.category))
      .collect();
    
    for (const card of flashcards) {
      await ctx.db.delete(card._id);
    }
    
    return flashcards.length;
  },
});