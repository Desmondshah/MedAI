import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

// Helper function to get the OpenAI client
function getOpenAIClient() {
  if (!process.env.CONVEX_OPENAI_API_KEY) {
    throw new ConvexError("OpenAI API key is not configured. Please add the CONVEX_OPENAI_API_KEY environment variable.");
  }
  
  return new OpenAI({
    baseURL: process.env.CONVEX_OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.CONVEX_OPENAI_API_KEY,
  });
}

// Upload a file to OpenAI - this is an internal action that will be called from file.ts
export const uploadFileToOpenAI = internalAction({
  args: {
    fileId: v.id("files"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Get the file URL from Convex storage
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      if (!fileUrl) {
        throw new ConvexError("Could not get URL for file");
      }
      
      console.log("Got file URL:", fileUrl);
      
      // Fetch the file content
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new ConvexError(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      // Get the file as a Blob
      const fileBlob = await response.blob();
      console.log("Got file blob:", fileBlob.size, "bytes");
      
      // Create a File object from the Blob
      const file = new File([fileBlob], args.fileName, { type: args.fileType });
      console.log("Created File object:", file.name, file.type, file.size, "bytes");
      
      // Upload to OpenAI using the fetch API directly since the SDK might have issues
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "assistants");
      
      const openaiResponse = await fetch("https://api.openai.com/v1/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
        },
        body: formData,
      });
      
      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new ConvexError(`OpenAI API error: ${openaiResponse.status} ${errorText}`);
      }
      
      const data = await openaiResponse.json();
      console.log("File uploaded to OpenAI:", data);
      
      // Schedule an internal mutation to update the file record with the OpenAI file ID
      await ctx.scheduler.runAfter(0, internal.openai.processOpenAIFileResult, {
        fileId: args.fileId,
        openaiFileId: data.id,
      });
      
    } catch (error) {
      console.error("Error uploading file to OpenAI:", error);
      throw new ConvexError("Failed to upload file to OpenAI: " + String(error));
    }
  },
});

// Store the OpenAI file ID in the database - this is an internal mutation
export const processOpenAIFileResult = internalMutation({
  args: {
    fileId: v.id("files"),
    openaiFileId: v.string(),
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

// Delete a file from OpenAI
export const deleteOpenAIFile = internalAction({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Use the fetch API directly instead of the SDK
      const response = await fetch(`https://api.openai.com/v1/files/${args.fileId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }
      
      console.log("File deleted from OpenAI:", args.fileId);
    } catch (error) {
      console.error("Error deleting file from OpenAI:", error);
      throw new ConvexError("Failed to delete file from OpenAI: " + String(error));
    }
  },
});

// Query files with OpenAI (search through file content)
export const searchFileContent = action({
  args: {
    query: v.string(),
    fileIds: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{ results: any }> => {
    try {
      const openai = getOpenAIClient();
      console.log("Searching through files:", args.fileIds);
      
      // First, verify the files exist in OpenAI
      for (const fileId of args.fileIds) {
        try {
          // Try to get file info from OpenAI to verify it exists
          const fileCheckResponse = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
            },
          });
          
          if (!fileCheckResponse.ok) {
            const errorText = await fileCheckResponse.text();
            console.error(`File ${fileId} not found in OpenAI:`, errorText);
            // Don't throw here as we want to check all files
          } else {
            const fileData = await fileCheckResponse.json();
            console.log(`File verified in OpenAI: ${fileId}`, fileData);
            // Check if file is still processing
            if (fileData.status !== "processed") {
              console.warn(`File ${fileId} is not yet processed (status: ${fileData.status}). This may affect search results.`);
            }
          }
        } catch (error) {
          console.error(`Error checking file ${fileId}:`, error);
        }
      }
      
      // Create an assistant with file search capability
      const assistant = await openai.beta.assistants.create({
        name: "Medical Lecture File Search Assistant",
        instructions: `You are a helpful assistant that searches through uploaded medical lecture files. 
        Answer questions using ONLY the content from the uploaded files. 
        If the information isn't in the files, explicitly say so and explain that you can only answer based on the uploaded content.
        If files are available but don't contain relevant info, say what topics the files DO cover.
        When providing information, cite which specific lecture file it came from.`,
        model: "gpt-4o",
        tools: [{ type: "file_search" }],
      });
      
      console.log("Created assistant:", assistant.id);
      
      // Attach files to the assistant using direct API calls
      for (const fileId of args.fileIds) {
        try {
          console.log(`Attaching file ${fileId} to assistant ${assistant.id} via direct API...`);
          
          const response = await fetch(`https://api.openai.com/v1/assistants/${assistant.id}/files`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
              "OpenAI-Beta": "assistants=v1"
            },
            body: JSON.stringify({
              file_id: fileId
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to attach file ${fileId}:`, errorText);
          } else {
            const data = await response.json();
            console.log(`Successfully attached file ${fileId}`, data);
          }
        } catch (error) {
          console.error(`Error attaching file ${fileId} to assistant:`, error);
        }
      }
      
      // Verify files were attached to the assistant by listing files directly
      try {
        console.log(`Verifying files attached to assistant ${assistant.id}...`);
        const listFilesResponse = await fetch(`https://api.openai.com/v1/assistants/${assistant.id}/files`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v1"
          }
        });
        
        if (listFilesResponse.ok) {
          const filesData = await listFilesResponse.json();
          console.log("Files attached to assistant:", filesData.data);
          
          if (filesData.data.length === 0) {
            console.error("No files attached to assistant! Search will likely fail.");
          }
        } else {
          console.error("Failed to verify attached files:", await listFilesResponse.text());
        }
      } catch (error) {
        console.error("Error verifying attached files:", error);
      }
      
      // Create a thread
      const thread = await openai.beta.threads.create();
      console.log("Created thread:", thread.id);
      
      // Add instructions to use the files in the message to the assistant
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Please search through the uploaded lecture files to answer this question: ${args.query}
        Make sure to explicitly mention if you don't find relevant information in the files. 
        If you do find information, please mention which specific file it came from.`,
      });
      
      // Run the assistant on the thread with specific instructions
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
        instructions: "Be sure to search through all attached files thoroughly. If the information isn't found, acknowledge that fact.",
      });
      
      console.log("Started run:", run.id);
      
      // Poll for completion
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes timeout
      
      while (!["completed", "failed", "cancelled", "expired"].includes(runStatus.status) && attempts < maxAttempts) {
        console.log(`Run status (attempt ${attempts}):`, runStatus.status);
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
      }
      
      console.log("Final run status:", runStatus.status);
      
      if (runStatus.status !== "completed") {
        throw new Error(`Run did not complete successfully. Status: ${runStatus.status}`);
      }
      
      // Get the messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      
      // Clean up resources
      try {
        await openai.beta.assistants.del(assistant.id);
      } catch (error) {
        console.error("Error deleting assistant:", error);
        // Don't throw here as we still want to return results
      }
      
      const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
      console.log("Got assistant messages:", assistantMessages.length);
      
      return { 
        results: assistantMessages
      };
    } catch (error) {
      console.error("Error searching file content with OpenAI:", error);
      throw new ConvexError("Failed to search file content: " + String(error));
    }
  },
});

// Add a utility function to check file status on OpenAI
export const checkFileStatus = action({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      console.log(`Checking status for OpenAI file: ${args.fileId}`);
      
      // Try to get file info from OpenAI to verify it exists and check status
      const fileCheckResponse = await fetch(`https://api.openai.com/v1/files/${args.fileId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
        },
      });
      
      if (!fileCheckResponse.ok) {
        const errorText = await fileCheckResponse.text();
        console.error(`File ${args.fileId} not found in OpenAI:`, errorText);
        throw new ConvexError(`File not found in OpenAI: ${errorText}`);
      }
      
      const fileData = await fileCheckResponse.json();
      console.log(`File status retrieved successfully:`, fileData);
      return fileData;
    } catch (error) {
      console.error(`Error checking file ${args.fileId}:`, error);
      throw new ConvexError(`Error checking file status: ${String(error)}`);
    }
  },
});
