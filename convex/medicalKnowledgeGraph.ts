import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Define schema for medical concepts and relationships
export const addMedicalConcept = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    description: v.string(),
    snomedId: v.optional(v.string()),
    properties: v.any(), // Fixed: use v.record instead of v.map
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("medicalConcepts", {
      name: args.name,
      category: args.category,
      description: args.description,
      snomedId: args.snomedId,
      properties: JSON.stringify(args.properties ?? {}),
      createdAt: Date.now(),
    });
  },
});

export const addConceptRelationship = mutation({
  args: {
    sourceId: v.id("medicalConcepts"),
    targetId: v.id("medicalConcepts"),
    relationshipType: v.string(),
    properties: v.any(), // Fixed: use v.record instead of v.map
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conceptRelationships", {
      sourceId: args.sourceId,
      targetId: args.targetId,
      relationshipType: args.relationshipType,
      properties: JSON.stringify(args.properties ?? {}),
      createdAt: Date.now(),
    });
  },
});

export const getMedicalConceptGraph = query({
    args: {
      conceptName: v.string(),
      depth: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const maxDepth = args.depth || 2;
      
      // Find the starting concept
      const concept = await ctx.db
        .query("medicalConcepts")
        .filter(q => q.eq(q.field("name"), args.conceptName))
        .first();
      
      if (!concept) {
        return { nodes: [], edges: [] };
      }
      
      // Parse properties for the starting node
      const startNode = {
        ...concept,
        properties: concept.properties ? JSON.parse(concept.properties) : {}
      };
      
      // Build a graph starting from this concept
      const nodes = [startNode];
      const edges = [];
      const visitedIds = new Set([concept._id]);
      
      // Simple BFS to explore the graph
      const queue = [{ id: concept._id, depth: 0 }];
      
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        
        if (current.depth >= maxDepth) continue;
        
        // Find relationships where this concept is the source
        const outgoingRelationships = await ctx.db
          .query("conceptRelationships")
          .filter(q => q.eq(q.field("sourceId"), current.id))
          .collect();
        
        for (const rel of outgoingRelationships) {
          // Parse properties for the relationship
          const relationship = {
            ...rel,
            properties: rel.properties ? JSON.parse(rel.properties) : {}
          };
          edges.push(relationship);
          
          if (!visitedIds.has(rel.targetId)) {
            visitedIds.add(rel.targetId);
            const targetConcept = await ctx.db.get(rel.targetId);
            if (targetConcept) {
              // Parse properties for the target concept
              const targetNode = {
                ...targetConcept,
                properties: targetConcept.properties ? JSON.parse(targetConcept.properties) : {}
              };
              nodes.push(targetNode);
              queue.push({ id: rel.targetId, depth: current.depth + 1 });
            }
          }
        }
      
      // Find relationships where this concept is the target
      const incomingRelationships = await ctx.db
        .query("conceptRelationships")
        .filter(q => q.eq(q.field("targetId"), current.id))
        .collect();
      
      for (const rel of incomingRelationships) {
        // Parse properties for the relationship
        const relationship = {
          ...rel,
          properties: rel.properties ? JSON.parse(rel.properties) : {}
        };
        edges.push(relationship);
        
        if (!visitedIds.has(rel.sourceId)) {
          visitedIds.add(rel.sourceId);
          const sourceConcept = await ctx.db.get(rel.sourceId);
          if (sourceConcept) {
            // Parse properties for the source concept
            const sourceNode = {
              ...sourceConcept,
              properties: sourceConcept.properties ? JSON.parse(sourceConcept.properties) : {}
            };
            nodes.push(sourceNode);
            queue.push({ id: rel.sourceId, depth: current.depth + 1 });
          }
        }
      }
    }
    
    return { nodes, edges };
  },
});