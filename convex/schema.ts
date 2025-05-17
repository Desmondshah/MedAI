import { defineSchema, defineTable } from "convex/server";
import { ConvexError, v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { internalMutation } from "./_generated/server";

const applicationTables = {
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
  }),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  flashcards: defineTable({
    userId: v.id("users"),
    front: v.string(),
    back: v.string(),
    category: v.string(),
    lastReviewed: v.optional(v.number()),
    confidence: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  quizzes: defineTable({
  userId: v.id("users"),
  title: v.string(),
  questions: v.array(
    v.object({
      question: v.string(),
      options: v.array(v.string()),
      correctAnswer: v.number(),
      explanation: v.optional(v.string()), // <<-- ADD THIS LINE
    })
  ),
  score: v.optional(v.number()),
  takenAt: v.optional(v.number()),
  difficulty: v.optional(v.string()), 
}).index("by_user", ["userId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    noteId: v.id("notes"),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  progress: defineTable({
    userId: v.id("users"),
    topic: v.string(),
    confidence: v.number(),
    lastReviewed: v.number(),
  }).index("by_user", ["userId"]),
  
  files: defineTable({
    userId: v.id("users"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    lectureTitle: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    uploadedAt: v.number(),
    processed: v.boolean(),
    processingComplete: v.optional(v.boolean()),
    processingError: v.optional(v.string()),
    openaiFileId: v.optional(v.string()),
    openaiProcessed: v.optional(v.boolean()),
    openaiEmbedded: v.optional(v.boolean()),
    version: v.optional(v.number()),  // Now optional
    lastUpdated: v.optional(v.number()),  // Now optional
  })
  .index("by_user", ["userId"])
  .index("by_processing_status", ["processed", "openaiProcessed"])
  .index("by_openai_file_id", ["openaiFileId"])
  .index("by_lecture_title", ["lectureTitle"]),

  // New tables for Phase 2

  studyGoals: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.number(), // Timestamp
    topics: v.array(v.string()),
    priority: v.string(), // "high", "medium", "low"
    completed: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  examDates: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.number(), // Timestamp
    topics: v.array(v.string()),
    importance: v.string(), // "major", "minor"
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  studyPlans: defineTable({
    userId: v.id("users"),
    title: v.string(),
    startDate: v.number(), // Week start timestamp
    endDate: v.number(), // Week end timestamp
    dailyPlans: v.array(
      v.object({
        day: v.string(), // "monday", "tuesday", etc.
        date: v.number(), // Timestamp for specific day
        sessions: v.array(
          v.object({
            startTime: v.string(), // "09:00", "14:30", etc.
            endTime: v.string(),
            topic: v.string(),
            activity: v.string(), // "review", "quiz", "flashcards", etc.
            description: v.optional(v.string()),
            completed: v.boolean(),
          })
        ),
      })
    ),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  wellnessCheckins: defineTable({
    userId: v.id("users"),
    mood: v.string(), // "good", "okay", "stressed", etc.
    stressLevel: v.number(), // 1-10
    message: v.string(), // User's check-in message
    aiResponse: v.string(), // AI's response
    suggestions: v.array(v.string()), // Wellness suggestions
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  dailyDigests: defineTable({
    userId: v.id("users"),
    date: v.number(), // Timestamp
    summary: v.string(), // Add this line
    reviewTopics: v.array(
      v.object({
        topic: v.string(),
        reason: v.string(),
        priority: v.string(), // "high", "medium", "low"
      })
    ),
    suggestedActivities: v.array(
      v.object({
        activity: v.string(), // "review notes", "flashcards", "practice quiz", etc.
        topic: v.string(),
        duration: v.number(), // minutes
      })
    ),
    completed: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
};

const medicalKnowledgeGraphTables = {
  medicalConcepts: defineTable({
    name: v.string(),
    category: v.string(),
    description: v.string(),
    snomedId: v.optional(v.string()),
    properties: v.string(), // Fixed: use v.record instead of v.map
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  conceptRelationships: defineTable({
    sourceId: v.id("medicalConcepts"),
    targetId: v.id("medicalConcepts"),
    relationshipType: v.string(),
    properties: v.string(), // Fixed: use v.record instead of v.map
    createdAt: v.number(),
  })
  .index("by_source", ["sourceId"])
  .index("by_target", ["targetId"]),

  medicalFactChecks: defineTable({
    textId: v.id("notes"),
    factChecks: v.array(
      v.object({
        claim: v.string(),
        confidence: v.string(),
        issues: v.optional(v.array(v.string())),
        sources: v.optional(v.array(v.string())),
      })
    ),
    checkedAt: v.number(),
  }),

  medicalCitations: defineTable({
    responseId: v.string(),
    citations: v.array(
      v.object({
        index: v.number(),
        title: v.string(),
        authors: v.optional(v.array(v.string())),
        url: v.string(),
        date: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
  }),
};

export const processOpenAIFileResult = internalMutation({
  args: {
    fileId: v.id("files"),
    openaiFileId: v.string(),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) throw new ConvexError("File not found");
    
    if (file.version !== undefined && file.version !== args.expectedVersion) {
      throw new ConvexError("File was modified concurrently");
    }
    
    return await ctx.db.patch(args.fileId, {
      openaiFileId: args.openaiFileId,
      openaiProcessed: true,
      version: (file.version || 0) + 1,
      lastUpdated: Date.now(),
    });
  },
});

export default defineSchema({
  ...authTables,
  ...applicationTables,
  ...medicalKnowledgeGraphTables,
});