import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

interface ReviewTopic {
  topic: string;
  reason: string;
  priority: string;
}

interface SuggestedActivity {
  activity: string;
  topic: string;
  duration: number;
}

interface TopicCount {
  topic: string;
  count: number;
}

// Get all daily digests for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyDigests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get today's digest
export const getTodayDigest = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.getTime();
    
    return await ctx.db
      .query("dailyDigests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("date"), todayStart),
          q.lt(q.field("date"), tomorrowStart)
        )
      )
      .first();
  },
});

// Get previous digests (excluding today)
export const getPrevious = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    return await ctx.db
      .query("dailyDigests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.lt(q.field("date"), todayStart))
      .order("desc")
      .collect();
  },
});

// Get digests for a specific date range
export const getByDateRange = query({
  args: { 
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyDigests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .order("desc")
      .collect();
  },
});

// Get completed digests
export const getCompleted = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyDigests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .order("desc")
      .collect();
  },
});

// Create a new daily digest
export const create = mutation({
  args: {
    userId: v.id("users"),
    date: v.number(),
    summary: v.string(),
    reviewTopics: v.array(
      v.object({
        topic: v.string(),
        reason: v.string(),
        priority: v.string(),
      })
    ),
    suggestedActivities: v.array(
      v.object({
        activity: v.string(),
        topic: v.string(),
        duration: v.number(),
      })
    ),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dailyDigests", {
      userId: args.userId,
      date: args.date,
      summary: args.summary,
      reviewTopics: args.reviewTopics,
      suggestedActivities: args.suggestedActivities,
      completed: args.completed,
      createdAt: Date.now(),
    });
  },
});

// Update digest completion status
export const updateCompletion = mutation({
  args: {
    id: v.id("dailyDigests"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      completed: args.completed,
    });
  },
});

// Get most common review topics
export const getMostCommonTopics = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const digests = await ctx.db
      .query("dailyDigests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Count frequency of each topic
    const topicCounts: Record<string, number> = {};
    digests.forEach(digest => {
      digest.reviewTopics.forEach((topic: ReviewTopic) => {
        topicCounts[topic.topic] = (topicCounts[topic.topic] || 0) + 1;
      });
    });
    
    // Convert to array and sort by frequency
    const sortedTopics: TopicCount[] = Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
    
    return sortedTopics.slice(0, 5); // Return top 5 topics
  },
});

// Delete a daily digest
export const remove = mutation({
  args: { id: v.id("dailyDigests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
