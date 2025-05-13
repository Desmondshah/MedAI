import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all wellness check-ins for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wellnessCheckins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get recent wellness check-ins (last 7 days)
export const getRecent = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    return await ctx.db
      .query("wellnessCheckins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), oneWeekAgo))
      .order("desc")
      .collect();
  },
});

// Get check-ins by mood
export const getByMood = query({
  args: { 
    userId: v.id("users"),
    mood: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wellnessCheckins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("mood"), args.mood))
      .order("desc")
      .collect();
  },
});

// Get check-ins by stress level range
export const getByStressLevelRange = query({
  args: { 
    userId: v.id("users"),
    minLevel: v.number(),
    maxLevel: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wellnessCheckins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("stressLevel"), args.minLevel),
          q.lte(q.field("stressLevel"), args.maxLevel)
        )
      )
      .order("desc")
      .collect();
  },
});

// Create a new wellness check-in
export const create = mutation({
  args: {
    userId: v.id("users"),
    mood: v.string(),
    stressLevel: v.number(),
    message: v.string(),
    aiResponse: v.string(),
    suggestions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("wellnessCheckins", {
      userId: args.userId,
      mood: args.mood,
      stressLevel: args.stressLevel,
      message: args.message,
      aiResponse: args.aiResponse,
      suggestions: args.suggestions,
      createdAt: Date.now(),
    });
  },
});

interface WellnessTrends {
  averageStressLevel: number;
  moodDistribution: Record<string, number>;
  checkinCount: number;
  period: string;
}

// Get wellness trends (aggregate data over time)
export const getWellnessTrends = query({
  args: { 
    userId: v.id("users"),
    period: v.string(), // "week", "month", "all"
  },
  handler: async (ctx, args) => {
    let startDate;
    const now = Date.now();
    
    if (args.period === "week") {
      startDate = now - 7 * 24 * 60 * 60 * 1000;
    } else if (args.period === "month") {
      startDate = now - 30 * 24 * 60 * 60 * 1000;
    } else {
      startDate = 0; // All time
    }
    
    const checkins = await ctx.db
      .query("wellnessCheckins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), startDate))
      .collect();
    
    if (checkins.length === 0) {
      return {
        averageStressLevel: 0,
        moodDistribution: {},
        checkinCount: 0,
        period: args.period,
      } as WellnessTrends;
    }
    
    // Calculate average stress level
    const totalStress = checkins.reduce((sum, checkin) => sum + checkin.stressLevel, 0);
    const averageStressLevel = totalStress / checkins.length;
    
    // Calculate mood distribution
    const moodDistribution: Record<string, number> = {};
    checkins.forEach(checkin => {
      moodDistribution[checkin.mood] = (moodDistribution[checkin.mood] || 0) + 1;
    });
    
    return {
      averageStressLevel,
      moodDistribution,
      checkinCount: checkins.length,
      period: args.period,
    } as WellnessTrends;
  },
});

interface SuggestionCount {
  suggestion: string;
  count: number;
}

// Get most frequent suggestions
export const getFrequentSuggestions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const checkins = await ctx.db
      .query("wellnessCheckins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Count frequency of each suggestion
    const suggestionCounts: Record<string, number> = {};
    checkins.forEach(checkin => {
      checkin.suggestions.forEach(suggestion => {
        suggestionCounts[suggestion] = (suggestionCounts[suggestion] || 0) + 1;
      });
    });
    
    // Convert to array and sort by frequency
    const sortedSuggestions: SuggestionCount[] = Object.entries(suggestionCounts)
      .map(([suggestion, count]) => ({ suggestion, count }))
      .sort((a, b) => b.count - a.count);
    
    return sortedSuggestions.slice(0, 5); // Return top 5 suggestions
  },
});

// Delete a wellness check-in
export const remove = mutation({
  args: { id: v.id("wellnessCheckins") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
