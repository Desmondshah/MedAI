import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all notes for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get a specific note by ID
export const getById = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new note
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notes", {
      userId: args.userId,
      title: args.title,
      content: args.content,
      tags: args.tags,
      createdAt: Date.now(),
    });
  },
});

// Update an existing note
export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Verify the note exists
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Note not found");
    }
    
    // Apply updates
    return await ctx.db.patch(id, updates);
  },
});

// Delete a note
export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Search notes by title or content
export const search = query({
  args: { 
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Simple client-side search for demonstration
    // In a production app, you'd want a proper search index
    const searchTerms = args.query.toLowerCase().split(" ");
    
    return notes.filter(note => {
      const title = note.title.toLowerCase();
      const content = note.content.toLowerCase();
      
      return searchTerms.some(term => 
        title.includes(term) || content.includes(term)
      );
    });
  },
});

// Get notes by tag
export const getByTag = query({
  args: { 
    userId: v.id("users"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    return notes.filter(note => note.tags.includes(args.tag));
  },
});