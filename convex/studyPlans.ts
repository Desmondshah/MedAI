import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Define a type for activity items
interface ActivityItem {
  type: string;
  topic: string;
  timestamp: number;
  details?: string;
}

// Get all study plans for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("studyPlans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get current active study plan
export const getCurrent = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db
      .query("studyPlans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.lte(q.field("startDate"), now),
          q.gte(q.field("endDate"), now)
        )
      )
      .first();
  },
});

// Get study plan by ID
export const getById = query({
  args: { id: v.id("studyPlans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get recent activity for daily digest
export const getRecentActivity = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    
    const recentActivity: ActivityItem[] = [];
    
    // Get recent flashcard activity
    const flashcards = await ctx.db
      .query("flashcards")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("lastReviewed"), oneWeekAgo))
      .collect();
    
    flashcards.forEach(card => {
      recentActivity.push({
        type: "flashcard",
        topic: card.category,
        timestamp: card.lastReviewed || card._creationTime, // Use _creationTime instead of createdAt
        details: `Reviewed "${card.front.substring(0, 30)}..."`,
      });
    });
    
    // Get recent quiz activity
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.neq(q.field("takenAt"), undefined),
        q.gte(q.field("takenAt"), oneWeekAgo)
      ))
      .collect();
    
    quizzes.forEach(quiz => {
      recentActivity.push({
        type: "quiz",
        topic: quiz.title,
        timestamp: quiz.takenAt as number, // Add type assertion 
        details: `Score: ${quiz.score}/${quiz.questions.length}`,
      });
    });
    
    // Get recent notes activity
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), oneWeekAgo))
      .collect();
    
    notes.forEach(note => {
      recentActivity.push({
        type: "note",
        topic: note.title,
        timestamp: note.createdAt,
        details: `Created note: "${note.title}"`,
      });
    });
    
    // Sort by most recent first
    return recentActivity.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// Create a new study plan
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    dailyPlans: v.array(
      v.object({
        day: v.string(),
        date: v.number(),
        sessions: v.array(
          v.object({
            startTime: v.string(),
            endTime: v.string(),
            topic: v.string(),
            activity: v.string(),
            description: v.optional(v.string()),
            completed: v.boolean(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("studyPlans", {
      userId: args.userId,
      title: args.title,
      startDate: args.startDate,
      endDate: args.endDate,
      dailyPlans: args.dailyPlans,
      createdAt: Date.now(),
    });
  },
});

// Update a session's completion status
export const updateSessionCompletion = mutation({
  args: {
    planId: v.id("studyPlans"),
    dayIndex: v.number(),
    sessionIndex: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Study plan not found");
    }
    
    // Make sure the indices are valid
    if (args.dayIndex < 0 || args.dayIndex >= plan.dailyPlans.length) {
      throw new Error("Invalid day index");
    }
    
    const day = plan.dailyPlans[args.dayIndex];
    if (args.sessionIndex < 0 || args.sessionIndex >= day.sessions.length) {
      throw new Error("Invalid session index");
    }
    
    // Update the completion status
    const updatedDailyPlans = [...plan.dailyPlans];
    updatedDailyPlans[args.dayIndex] = {
      ...day,
      sessions: day.sessions.map((session, index) => 
        index === args.sessionIndex ? { ...session, completed: args.completed } : session
      ),
    };
    
    return await ctx.db.patch(args.planId, {
      dailyPlans: updatedDailyPlans,
    });
  },
});

// Delete a study plan
export const remove = mutation({
  args: { id: v.id("studyPlans") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
