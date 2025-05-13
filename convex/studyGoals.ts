import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all study goals for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("studyGoals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get only active (non-completed) goals
export const getActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("studyGoals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("completed"), false))
      .order("desc")
      .collect();
  },
});

// Get goals by target date range
export const getByDateRange = query({
  args: { 
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("studyGoals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("targetDate"), args.startDate),
          q.lte(q.field("targetDate"), args.endDate)
        )
      )
      .order("asc")
      .collect();
  },
});

// Create a new study goal
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.number(),
    topics: v.array(v.string()),
    priority: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("studyGoals", {
      userId: args.userId,
      title: args.title,
      description: args.description || "",
      targetDate: args.targetDate,
      topics: args.topics,
      priority: args.priority,
      completed: args.completed,
      createdAt: Date.now(),
    });
  },
});

// Update a study goal
export const update = mutation({
  args: {
    id: v.id("studyGoals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    topics: v.optional(v.array(v.string())),
    priority: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Verify the goal exists
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Study goal not found");
    }
    
    // Apply updates
    return await ctx.db.patch(id, updates);
  },
});

// Toggle goal completion status
export const toggleCompletion = mutation({
  args: {
    id: v.id("studyGoals"),
  },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.id);
    if (!goal) {
      throw new Error("Study goal not found");
    }
    
    return await ctx.db.patch(args.id, {
      completed: !goal.completed,
    });
  },
});

// Delete a study goal
export const remove = mutation({
  args: { id: v.id("studyGoals") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
