import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all exam dates for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examDates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

// Get upcoming exams
export const getUpcoming = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db
      .query("examDates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("date"), now))
      .order("asc")
      .collect();
  },
});

// Get exams within a date range
export const getByDateRange = query({
  args: { 
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examDates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .order("asc")
      .collect();
  },
});

// Get exams by importance
export const getByImportance = query({
  args: { 
    userId: v.id("users"),
    importance: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examDates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("importance"), args.importance))
      .order("asc")
      .collect();
  },
});

// Create a new exam
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    topics: v.array(v.string()),
    importance: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("examDates", {
      userId: args.userId,
      title: args.title,
      description: args.description || "",
      date: args.date,
      topics: args.topics,
      importance: args.importance,
      createdAt: Date.now(),
    });
  },
});

// Update an exam
export const update = mutation({
  args: {
    id: v.id("examDates"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    topics: v.optional(v.array(v.string())),
    importance: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Verify the exam exists
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Exam not found");
    }
    
    // Apply updates
    return await ctx.db.patch(id, updates);
  },
});

// Delete an exam
export const remove = mutation({
  args: { id: v.id("examDates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});