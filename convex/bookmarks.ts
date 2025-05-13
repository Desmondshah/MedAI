import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all bookmarks for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get all bookmarks with their associated note content
export const getAllWithContent = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    
    // Fetch the associated note for each bookmark
    const result = [];
    for (const bookmark of bookmarks) {
      const note = await ctx.db.get(bookmark.noteId);
      result.push({
        ...bookmark,
        note
      });
    }
    
    return result;
  },
});

// Create a new bookmark
export const create = mutation({
  args: {
    userId: v.id("users"),
    noteId: v.id("notes"),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bookmarks", {
      userId: args.userId,
      noteId: args.noteId,
      comment: args.comment,
      createdAt: Date.now(),
    });
  },
});

// Delete a bookmark
export const remove = mutation({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Update a bookmark's comment
export const updateComment = mutation({
  args: {
    id: v.id("bookmarks"),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      comment: args.comment,
    });
  },
});