import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

// Generate a URL for file upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate a upload URL that's valid for a short time
    const uploadUrl = await ctx.storage.generateUploadUrl();
    console.log("Generated upload URL:", uploadUrl);
    return uploadUrl;
  },
});

// Save file metadata after upload
export const saveFileRecord = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    lectureTitle: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    useOpenAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("saveFileRecord called with storageId:", args.storageId);
    
    // Verify the file exists in storage with better error handling
    try {
      // Try to get a URL for the file to verify it exists
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      console.log("Successfully verified file exists with URL:", fileUrl);
    } catch (error) {
      console.error("Error verifying file in storage:", error);
      
      // More descriptive error message with debugging info
      throw new ConvexError(`Invalid storage ID or file not found. StorageId: ${args.storageId}, Error: ${String(error)}`);
    }
    
    // Save file metadata to the database
    const fileId = await ctx.db.insert("files", {
        userId: args.userId,
        storageId: args.storageId,
        fileName: args.fileName,
        fileType: args.fileType,
        fileSize: args.fileSize,
        lectureTitle: args.lectureTitle,
        description: args.description,
        tags: args.tags || [],
        uploadedAt: Date.now(),    // Single occurrence, no duplicate
        processed: false,
        openaiProcessed: false,
        openaiEmbedded: false,
        version: 0,                // Default value
        lastUpdated: 0             // Default value
    });
    
    console.log("File record created with ID:", fileId);
    
    // Queue file processing in the background
    await ctx.scheduler.runAfter(0, internal.fileProcessor.processUploadedFile, {
      fileId,
    });
    
    // If OpenAI processing is requested, queue that as well
    if (args.useOpenAI) {
      await ctx.scheduler.runAfter(0, internal.openai.uploadFileToOpenAI, {
        fileId,
        storageId: args.storageId,
        fileName: args.fileName,
        fileType: args.fileType,
      });
    }
    
    return fileId;
  },
});

// Process file with OpenAI
export const processWithOpenAI = mutation({
  args: { 
    fileId: v.id("files"),
    openaiFileId: v.string()
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new ConvexError("File not found");
    }
    
    return await ctx.db.patch(args.fileId, {
      openaiFileId: args.openaiFileId,
      openaiProcessed: true,
    });
  },
});

// Get all files for a user
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get OpenAI processed files for a user
export const getOpenAIFiles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("openaiProcessed"), true))
      .order("desc")
      .collect();
  },
});

// Get file processing status
export const getProcessingStatus = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new ConvexError("File not found");
    }
    
    return {
      processed: file.processed,
      processingComplete: file.processingComplete,
      processingError: file.processingError,
      openaiProcessed: file.openaiProcessed,
    };
  },
});

// Update file processing status
export const updateProcessingStatus = mutation({
  args: {
    fileId: v.id("files"),
    processed: v.boolean(),
    processingComplete: v.optional(v.boolean()),
    processingError: v.optional(v.string()),
    openaiProcessed: v.optional(v.boolean()),
    openaiFileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new ConvexError("File not found");
    }
    
    return await ctx.db.patch(args.fileId, {
      processed: args.processed,
      processingComplete: args.processingComplete,
      processingError: args.processingError,
      openaiProcessed: args.openaiProcessed,
      openaiFileId: args.openaiFileId,
    });
  },
});

// Delete a file
export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new ConvexError("File not found");
    }
    
    // Delete the file from storage
    await ctx.storage.delete(file.storageId);
    
    // If file was processed with OpenAI, delete it from there too
    if (file.openaiFileId) {
      try {
        // This would require an action to call OpenAI API
        await ctx.scheduler.runAfter(0, internal.openai.deleteOpenAIFile, {
          fileId: file.openaiFileId,
        });
      } catch (error) {
        console.error("Error deleting file from OpenAI:", error);
      }
    }
    
    // Delete the file record
    await ctx.db.delete(args.fileId);
    
    return true;
  },
});