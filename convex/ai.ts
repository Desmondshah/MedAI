import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

// Function to create an OpenAI client when needed, not at module load time
function getOpenAIClient() {
  // Only create the client when this function is called
  return new OpenAI({
    apiKey: process.env.CONVEX_OPENAI_API_KEY,
  });
}

// Model selection system
type ModelComplexity = "simple" | "medium" | "complex" | "expert";
type ModelTask = "qa" | "summarization" | "flashcards" | "diagnosis" | "studyPlan" | "wellness" | "dailyDigest";

interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
}

function getModelConfig(task: ModelTask, complexity: ModelComplexity): ModelConfig {
  // Base configurations
  const configs: Record<ModelComplexity, ModelConfig> = {
    simple: {
      model: "gpt-4o-mini",
      temperature: 0.7,
    },
    medium: {
      model: "gpt-4.1-nano",
      temperature: 0.7,
    },
    complex: {
      model: "gpt-4o",
      temperature: 0.5,
      maxTokens: 2000
    },
    expert: {
      model: "gpt-4-turbo", 
      temperature: 0.3,
      topP: 0.95,
      maxTokens: 4000
    }
  };

  // Task-specific overrides
  switch(task) {
    case "qa":
      return complexity === "simple" ? configs.medium : 
             complexity === "complex" ? configs.complex : configs.expert;
    case "summarization":
      return complexity === "simple" ? configs.medium : configs.complex;
    case "flashcards":
      return configs.simple;
    case "diagnosis":
      return configs.expert;
    case "studyPlan":
      return configs.complex;
    case "wellness":
      return configs.medium;
    case "dailyDigest":
      return complexity === "simple" ? configs.simple : configs.medium;
    default:
      return configs.medium;
  }
}

// Helper to determine complexity based on input
function assessComplexity(input: string): ModelComplexity {
  const complexityIndicators = {
    complex: [
      "differential diagnosis", "mechanism of action", "pathophysiology", 
      "explain in detail", "compare and contrast", "underlying mechanism"
    ],
    expert: [
      "rare disease", "complex case", "challenging presentation", 
      "controversial treatment", "latest research", "evidence-based approach"
    ]
  };
  
  const inputLower = input.toLowerCase();
  
  if (complexityIndicators.expert.some(term => inputLower.includes(term))) {
    return "expert";
  }
  
  if (complexityIndicators.complex.some(term => inputLower.includes(term))) {
    return "complex";
  }
  
  // Check length as a heuristic for complexity
  if (input.length > 200) {
    return "medium";
  }
  
  return "simple";
}

// Medical domain detection for specialized instructions
type MedicalDomain = 
  "general" | 
  "pathology" | 
  "pharmacology" | 
  "anatomy" | 
  "physiology" | 
  "diagnosis" | 
  "treatment" | 
  "emergency" |
  "pediatrics" |
  "geriatrics";

function detectMedicalDomain(question: string): MedicalDomain {
  const lowerQuestion = question.toLowerCase();
  
  const domainKeywords: Record<MedicalDomain, string[]> = {
    pathology: ["pathology", "histology", "biopsy", "microscopic", "staining", "tumor", "cancer", "lesion", "morphology"],
    pharmacology: ["drug", "medication", "dose", "pharmacology", "mechanism of action", "side effect", "adverse effect", "therapeutic", "contraindication"],
    anatomy: ["anatomy", "structure", "location", "nerve", "artery", "vein", "muscle", "bone", "organ", "spatial"],
    physiology: ["physiology", "function", "regulation", "mechanism", "pathway", "homeostasis", "system", "metabolism"],
    diagnosis: ["diagnosis", "differential", "symptom", "sign", "presentation", "diagnostic criteria", "test", "workup", "evaluation"],
    treatment: ["treatment", "management", "therapy", "approach", "guideline", "protocol", "intervention", "care plan"],
    emergency: ["emergency", "acute", "critical", "life-threatening", "trauma", "resuscitation", "immediate", "urgent"],
    pediatrics: ["pediatric", "child", "infant", "newborn", "adolescent", "developmental", "growth", "congenital"],
    geriatrics: ["geriatric", "elderly", "older adult", "aging", "frailty", "nursing home", "dementia", "fall"],
    general: []
  };
  
  // Count matching keywords for each domain
  let bestMatch: MedicalDomain = "general";
  let highestScore = 0;
  
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    const score = keywords.filter(keyword => lowerQuestion.includes(keyword)).length;
    if (score > highestScore) {
      highestScore = score;
      bestMatch = domain as MedicalDomain;
    }
  }
  
  // Return general if no strong match
  return highestScore >= 1 ? bestMatch : "general";
}

function getSystemPrompt(domain: MedicalDomain): string {
  const basePrompt = "You are Dorothy, a medical education AI assistant specializing in";
  
  const domainSpecificInstructions: Record<MedicalDomain, string> = {
    general: `${basePrompt} general medicine. Provide balanced, well-structured explanations that cover key concepts clearly. Include clinical relevance when appropriate.`,
    
    pathology: `${basePrompt} pathology. Focus on disease mechanisms, histological features, and pathogenesis. Explain cellular and tissue changes with precise terminology and connect to clinical presentations. Structure answers with clear organization from etiology through manifestations. Include key staining techniques and microscopic findings when relevant.`,
    
    pharmacology: `${basePrompt} pharmacology. Emphasize drug mechanisms, pharmacokinetics, pharmacodynamics, and clinical applications. Structure explanations with mechanism first, then clinical uses, important adverse effects, and drug interactions. Use clear examples to illustrate therapeutic implications and dosing considerations. Include recent FDA approvals when relevant.`,
    
    anatomy: `${basePrompt} anatomy. Provide precise descriptions of anatomical structures, spatial relationships, and clinical correlations. Use clear organizational principles (proximal to distal, superficial to deep) and emphasize clinically relevant landmarks. Connect structures to function and highlight surgical or clinical significance. Reference anatomical variations when appropriate.`,
    
    physiology: `${basePrompt} physiology. Explain functional mechanisms at molecular, cellular, and systems levels. Emphasize regulatory processes, homeostatic mechanisms, and integration between systems. Use clear cause-effect relationships and quantitative parameters when appropriate. Connect normal function to pathological states and clinical manifestations.`,
    
    diagnosis: `${basePrompt} medical diagnosis. Present systematic approaches to differential diagnosis with emphasis on clinical reasoning and diagnostic criteria. Structure differentials by probability and danger. Include key history elements, physical findings, and appropriate diagnostic tests with interpretation guidelines. Emphasize evidence-based approaches and recent guideline updates.`,
    
    treatment: `${basePrompt} medical treatment. Focus on evidence-based therapeutic approaches with clear indications, contraindications, and expected outcomes. Structure recommendations by first, second, and third-line options with specific dosing when appropriate. Include recent guideline updates, treatment algorithms, and monitoring parameters. Address special populations and treatment adjustments.`,
    
    emergency: `${basePrompt} emergency medicine. Emphasize rapid assessment, triage principles, and time-sensitive interventions. Structure responses to prioritize life-threatening conditions first with clear stabilization steps. Include specific dosing for emergency medications, procedural techniques, and immediate management steps. Focus on practical, high-yield information for acute scenarios.`,
    
    pediatrics: `${basePrompt} pediatric medicine. Focus on age-specific considerations, developmental context, and special considerations for the pediatric population. Include weight-based dosing, normal developmental parameters, and family-centered care approaches. Emphasize preventive care, growth/development monitoring, and presentation differences from adult medicine.`,
    
    geriatrics: `${basePrompt} geriatric medicine. Address age-related physiological changes, multimorbidity, and special considerations for older adults. Emphasize medication management with attention to polypharmacy, geriatric syndromes, and functional assessment. Include fall prevention, cognitive assessment, and care coordination approaches. Consider quality of life and goals of care in recommendations.`
  };
  
  return domainSpecificInstructions[domain] || domainSpecificInstructions.general;
}

// PubMed RAG helpers - these can use a simple placeholder approach until full implementation
async function searchPubMed(query: string, maxResults: number = 3): Promise<string[]> {
  // This is a placeholder implementation
  console.log(`Would search PubMed for: ${query} with max results: ${maxResults}`);
  return ["12345678", "23456789", "34567890"].slice(0, maxResults);
}

interface PubMedArticle {
  id: string;
  title: string;
  abstract: string;
  url: string;
}

async function fetchPubMedAbstracts(ids: string[]): Promise<PubMedArticle[]> {
  if (ids.length === 0) return [];
  
  // This is a placeholder implementation
  console.log(`Would fetch abstracts for PubMed IDs: ${ids.join(", ")}`);
  
  return ids.map(id => ({
    id,
    title: `Sample Medical Article ${id}`,
    abstract: "This is a placeholder abstract for demonstration purposes. In production, this would contain actual medical content from PubMed.",
    url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
  }));
}

async function getMedicalLiterature(question: string): Promise<{context: string, citations: Array<{index: number, title: string, url: string}>}> {
  // 1. Search PubMed for relevant articles
  const pubmedIds = await searchPubMed(question, 3);
  
  // 2. Fetch abstracts
  const articles = await fetchPubMedAbstracts(pubmedIds);
  
  // 3. Prepare context from articles
  let context = "";
  let citations: { index: number; title: string; url: string; }[] = [];
  
  if (articles.length > 0) {
    context = "Relevant medical literature:\n\n";
    
    articles.forEach((article, index) => {
      context += `[${index + 1}] ${article.title}\n${article.abstract}\n\n`;
      citations.push({
        index: index + 1,
        title: article.title,
        url: article.url
      });
    });
  } else {
    context = "No specific medical literature found for this query.";
  }
  
  return { context, citations };
}

// Main enhanced functions

export const askQuestion = action({
  args: {
    question: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get the OpenAI client when the function is actually executed
      const openai = getOpenAIClient();
      
      // 1. Assess complexity and medical domain
      const complexity = assessComplexity(args.question);
      const domain = detectMedicalDomain(args.question);
      
      console.log(`Question complexity: ${complexity}, domain: ${domain}, using model: ${getModelConfig("qa", complexity).model}`);
      
      // 2. Get appropriate model config
      const modelConfig = getModelConfig("qa", complexity);
      
      // 3. Get domain-specific system prompt
      const systemPrompt = getSystemPrompt(domain);
      
      // 4. For complex queries, enhance with medical literature
      let medicalLiterature = null;
type ChatMessage = {
  role: "system" | "user" | "assistant" | "function" | "tool";
  content: string;
};

let messages: ChatMessage[] = [];

if (complexity === "complex" || complexity === "expert") {
  medicalLiterature = await getMedicalLiterature(args.question);
  
  messages = [
    {
      role: "system",
      content: systemPrompt + "\n\nIncorporate the relevant medical literature in your response. Cite specific articles using [1], [2], etc. numbers that correspond to the references provided. Be precise with citations, giving attribution to all specific facts that come from these sources.",
    },
    { role: "user", content: args.question },
    { role: "assistant", content: "I'll help answer this medical question using relevant literature." },
    {
      role: "user",
      content: `Please use these references in your answer:\n${medicalLiterature.context}`
    }
  ];
} else {
  messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    { role: "user", content: args.question },
  ];
}
      
      // 5. Generate response with the appropriate model
      const response = await openai.chat.completions.create({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        top_p: modelConfig.topP,
        messages: messages as any,
      });
      
      const answerContent = response.choices[0].message.content || "";
      
      // 6. For high-risk domains, run fact verification
      let factCheck = null;
      if ((domain === "treatment" || domain === "emergency" || domain === "diagnosis") && 
          (complexity === "complex" || complexity === "expert")) {
        
        // Secondary check with a more rigorous model
        const verificationResponse = await openai.chat.completions.create({
          model: "gpt-4o", // Use a capable model for verification
          messages: [
            {
              role: "system",
              content: "You are a medical fact-checking assistant. Your task is to review medical information for accuracy. Identify any potentially misleading or incorrect statements, and provide brief corrections. Focus only on significant factual issues that could impact clinical understanding or patient care. For each issue, note the confidence of your assessment (Low/Medium/High)."
            },
            {
              role: "user",
              content: `Please verify this medical response for accuracy:\n\n${answerContent}`
            }
          ],
        });
        
        factCheck = verificationResponse.choices[0].message.content;
      }
      
      // 7. Format the final response
      if (factCheck && factCheck.toLowerCase().includes("issue") && !factCheck.toLowerCase().includes("no issues found")) {
  // If issues were found, append an editorial note
  return {
    answer: answerContent + "\n\n---\nNote: This information has been reviewed for accuracy. Please consult authoritative medical resources for clinical decision-making.",
    citations: medicalLiterature?.citations || []
  };
} else {
  return {
    answer: answerContent,
    citations: medicalLiterature?.citations || []
  };
}
    } catch (error) {
      console.error("Error in askQuestion:", error);
      throw new Error("Failed to answer question: " + String(error));
    }
  },
});

export const generateFlashcards = action({
  args: {
    topic: v.string(),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      console.log("Generating flashcards for:", {
        topic: args.topic,
        contentLength: args.content?.length || 0
      });
      
      // Get the OpenAI client when the function is actually executed
      const openai = getOpenAIClient();
      
      // For flashcards, we'll use a simpler model regardless of complexity
      const modelConfig = getModelConfig("flashcards", "simple");
      
      const response = await openai.chat.completions.create({
        model: modelConfig.model,
        temperature: 0.7, // Slightly higher temperature for more creative flashcards
        messages: [
          {
            role: "system",
            content: "Create high-yield medical flashcards focusing on key concepts, clinical correlations, and board-relevant points. Format as JSON array with 'front' and 'back' properties. ALWAYS return a valid JSON array, even if empty.",
          },
          { 
            role: "user", 
            content: `Generate flashcards for: ${args.topic}\n\n${args.content ? `Content: ${args.content}` : "Create general flashcards on this medical topic without specific content to reference."}`
          },
        ],
      });
      
      const resultText = response.choices[0].message.content || "[]";
      
      try {
        const flashcards = JSON.parse(resultText);
        
        // Validate the response format
        if (!Array.isArray(flashcards)) {
          console.error("Flashcards response is not an array:", flashcards);
          return [];
        }
        
        // Ensure each flashcard has the required properties
        const validFlashcards = flashcards.filter(card => 
          card && typeof card === 'object' && 
          typeof card.front === 'string' && card.front.trim() !== '' &&
          typeof card.back === 'string' && card.back.trim() !== ''
        );
        
        return validFlashcards;
      } catch (parseError) {
        console.error("Error parsing flashcards response:", parseError);
        
        // Attempt to extract JSON from the response if it's embedded in markdown or text
        const jsonMatch = resultText.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[0];
            const flashcards = JSON.parse(extractedJson);
            
            if (Array.isArray(flashcards)) {
              return flashcards.filter(card => 
                card && typeof card === 'object' && 
                typeof card.front === 'string' && card.front.trim() !== '' &&
                typeof card.back === 'string' && card.back.trim() !== ''
              );
            }
          } catch (extractError) {
            console.error("Failed to extract JSON:", extractError);
          }
        }
        
        // If all else fails, return an empty array
        return [];
      }
    } catch (error) {
      console.error("Error in generateFlashcards:", error);
      return [];
    }
  },
});

export const summarizeNotes = action({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("Summarizing notes length:", args.content.length);
      
      // Get the OpenAI client when the function is actually executed
      const openai = getOpenAIClient();
      
      // Choose model based on content length complexity
      const complexity = args.content.length > 5000 ? "complex" : 
                         args.content.length > 2000 ? "medium" : "simple";
                         
      const modelConfig = getModelConfig("summarization", complexity);
      
      const response = await openai.chat.completions.create({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        messages: [
          {
            role: "system",
            content: "Create concise, structured summaries of medical notes. Focus on key points, clinical pearls, and high-yield concepts. Organize information with clear headings and bullet points for easy review. Prioritize clinically relevant details and board exam concepts.",
          },
          { role: "user", content: args.content },
        ],
      });
      
      const summary = response.choices[0].message.content;
      return summary;
    } catch (error) {
      console.error("Error in summarizeNotes:", error);
      throw new Error("Failed to summarize notes: " + String(error));
    }
  },
});

export const analyzeMedicalImage = action({
  args: {
    imageUrl: v.string(),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      console.log("Analyzing medical image:", {
        imageUrl: args.imageUrl,
        promptLength: args.prompt?.length || 0
      });
      
      const openai = getOpenAIClient();
      
      const systemMessage = {
        role: "system" as const,
        content: "You are Dorothy, a medical education AI assistant specializing in analyzing medical images. Provide detailed, accurate descriptions of medical imagery with educational context. Structure your analysis to describe visible findings, potential diagnoses, key features, and educational points."
      };
      
      const userMessage = {
        role: "user" as const,
        content: [
          { 
            type: "text", 
            text: args.prompt || "Please analyze this medical image and explain what it shows. Identify key structures, any pathological findings, and explain the educational significance." 
          },
          { 
            type: "image_url", 
            image_url: { url: args.imageUrl }
          }
        ]
      };
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using model with vision capabilities
        messages: [
          {
            role: "system",
            content: "You are Dorothy, a medical education AI assistant specializing in analyzing medical images. Provide detailed, accurate descriptions of medical imagery with educational context. Structure your analysis to describe visible findings, potential diagnoses, key features, and educational points."
          },
          {
            role: "user", 
            content: [
              { 
                type: "text" as const, 
                text: args.prompt || "Please analyze this medical image and explain what it shows. Identify key structures, any pathological findings, and explain the educational significance." 
              },
              { 
                type: "image_url" as const, 
                image_url: { url: args.imageUrl }
              }
            ] as any
          }
        ] as ChatCompletionMessageParam[],
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error("Error analyzing medical image:", error);
      throw new Error("Failed to analyze medical image: " + String(error));
    }
  },
});

export const generateStudyPlan = action({
  args: {
    userId: v.string(),
    startDate: v.number(), // Week start timestamp
    endDate: v.number(), // Week end timestamp
    goals: v.array(
      v.object({
        title: v.string(),
        topics: v.array(v.string()),
        priority: v.string(),
        targetDate: v.number(),
      })
    ),
    exams: v.array(
      v.object({
        title: v.string(),
        date: v.number(),
        topics: v.array(v.string()),
        importance: v.string(),
      })
    ),
    progressData: v.array(
      v.object({
        topic: v.string(),
        confidence: v.number(),
        lastReviewed: v.number(),
      })
    ),
    preferences: v.object({
      studySessionLength: v.number(), // minutes
      breaksFrequency: v.string(), // "frequent", "normal", "minimal"
      preferredTimes: v.array(v.string()), // ["morning", "evening"]
      maxDailyHours: v.number(),
      restDays: v.array(v.string()), // ["saturday", "sunday"]
    }),
  },
  handler: async (ctx, args) => {
    try {
      const startDate = new Date(args.startDate);
      const endDate = new Date(args.endDate);
      const daysInPlan = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      console.log("Generating study plan:", {
        userId: args.userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysInPlan,
        goals: args.goals.length,
        exams: args.exams.length,
        progressData: args.progressData.length,
      });
      
      // Get the OpenAI client when the function is actually executed
      const openai = getOpenAIClient();
      
      // Study plan is complex due to many parameters
      const modelConfig = getModelConfig("studyPlan", "complex");
      
      // Format dates and goals/exams for the AI
      const formattedGoals = args.goals.map(goal => ({
        ...goal,
        targetDate: new Date(goal.targetDate).toISOString().split('T')[0],
      }));
      
      const formattedExams = args.exams.map(exam => ({
        ...exam,
        date: new Date(exam.date).toISOString().split('T')[0],
      }));
      
      const formattedProgress = args.progressData.map(progress => ({
        ...progress,
        lastReviewed: new Date(progress.lastReviewed).toISOString().split('T')[0],
      }));
      
      const response = await openai.chat.completions.create({
        model: modelConfig.model,
        temperature: 0.7,
        max_tokens: modelConfig.maxTokens || 3000,
        messages: [
          {
            role: "system",
            content: `You are Dorothy, a medical education AI assistant specializing in creating personalized study plans for medical students. 
            Create a detailed weekly study plan based on the student's goals, upcoming exams, and progress data.
            Consider the student's preferences for study session length, break frequency, preferred times, and rest days.
            Focus on helping the student prioritize effectively while maintaining a balanced schedule.
            The study plan should follow spaced repetition principles, reviewing weaker topics more frequently.
            Format your response as a JSON object containing a 'title' and 'dailyPlans' array.`,
          },
          {
            role: "user",
            content: `Please create a personalized study plan from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}.
            
            My goals are: ${JSON.stringify(formattedGoals)}
            
            My upcoming exams are: ${JSON.stringify(formattedExams)}
            
            My current progress in topics is: ${JSON.stringify(formattedProgress)}
            
            My study preferences are: ${JSON.stringify(args.preferences)}
            
            Please create a detailed daily study plan for each day in the range. The plan should account for my preferences, prioritize topics based on my goals, upcoming exams, and current progress.
            
            Return the plan as a JSON object with 'title' and 'dailyPlans' array of objects for each day, containing 'day', 'date', and 'sessions' array.`
          },
        ],
      });
      
      const resultText = response.choices[0].message.content || "{}";
      
      try {
        // Extract JSON from the response
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
        
        const studyPlan = JSON.parse(jsonStr);
        
        // Validate and format the plan
        if (!studyPlan.title || !Array.isArray(studyPlan.dailyPlans)) {
          console.error("Invalid study plan format:", studyPlan);
          throw new Error("Generated study plan is not in the expected format");
        }
        
        // Calculate total study hours
        let totalStudyHours = 0;
        for (const day of studyPlan.dailyPlans) {
          if (Array.isArray(day.sessions)) {
            for (const session of day.sessions) {
              if (session.startTime && session.endTime) {
                const start = convertTimeToMinutes(session.startTime);
                const end = convertTimeToMinutes(session.endTime);
                if (start !== null && end !== null) {
                  totalStudyHours += (end - start) / 60;
                }
              }
            }
          }
        }
        
        console.log("Generated study plan:", {
          title: studyPlan.title,
          days: studyPlan.dailyPlans.length,
          totalStudyHours: Math.round(totalStudyHours * 10) / 10,
        });
        
        return studyPlan;
      } catch (parseError) {
        console.error("Error parsing study plan response:", parseError);
        throw new Error("Failed to parse the generated study plan");
      }
    } catch (error) {
      console.error("Error in generateStudyPlan:", error);
      throw new Error("Failed to generate study plan: " + String(error));
    }
  },
});

export const processWellnessCheckin = action({
  args: {
    message: v.string(),
    previousCheckins: v.optional(
      v.array(
        v.object({
          mood: v.string(),
          stressLevel: v.number(),
          message: v.string(),
          createdAt: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    try {
      console.log("Processing wellness check-in:", {
        messageLength: args.message.length,
        previousCheckins: args.previousCheckins?.length || 0,
      });
      
      // Get the OpenAI client when the function is actually executed
      const openai = getOpenAIClient();
      
      // Model selection based on complexity of the message
      const complexity = args.message.length > 300 ? "medium" : "simple";
      const modelConfig = getModelConfig("wellness", complexity);
      
      // Format previous check-ins for the AI
      const formattedPrevious = args.previousCheckins?.map(checkin => ({
        ...checkin,
        createdAt: new Date(checkin.createdAt).toISOString(),
      })) || [];
      
      const response = await openai.chat.completions.create({
        model: modelConfig.model,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are Dorothy, a compassionate medical education AI assistant with expertise in supporting medical students' mental health and wellbeing.
            Analyze the student's message, detect their mood and stress level, and provide an empathetic response.
            Offer helpful suggestions for managing stress, maintaining wellness, and improving productivity.
            Your response should be supportive, evidence-based, and tailored to the unique challenges of medical education.
            Format your analysis as a JSON object with 'mood', 'stressLevel', 'analysis', 'response', and 'suggestions'.
            
            The mood should be one of: "great", "good", "okay", "stressed", "overwhelmed", "exhausted", "anxious", "sad", or "frustrated".
            The stressLevel should be a number from 1-10, where 1 is minimal stress and 10 is extreme stress.
            The analysis should briefly explain why you assessed the mood and stress level as you did.
            The response should be a compassionate, conversational message directly addressing the student's concerns.
            The suggestions should be an array of practical, actionable recommendations relevant to the student's situation.`,
          },
          {
            role: "user",
            content: `Here's my check-in message: "${args.message}"
            
            ${formattedPrevious.length > 0 ? `My previous check-ins were: ${JSON.stringify(formattedPrevious)}` : "This is my first check-in."}
            
            Please analyze my message, provide a supportive response, and offer helpful suggestions.`
          },
        ],
      });
      
      const resultText = response.choices[0].message.content || "{}";
      
      try {
        // Extract JSON from the response
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
        
        const wellnessResponse = JSON.parse(jsonStr);
        
        // Validate response format
        if (!wellnessResponse.mood || !wellnessResponse.response || !Array.isArray(wellnessResponse.suggestions)) {
          console.error("Invalid wellness response format:", wellnessResponse);
          throw new Error("Generated wellness response is not in the expected format");
        }
        
        console.log("Generated wellness response:", {
          mood: wellnessResponse.mood,
          stressLevel: wellnessResponse.stressLevel,
          suggestionCount: wellnessResponse.suggestions.length,
        });
        
        return wellnessResponse;
      } catch (parseError) {
        console.error("Error parsing wellness response:", parseError);
        throw new Error("Failed to parse the generated wellness response");
      }
    } catch (error) {
      console.error("Error in processWellnessCheckin:", error);
      throw new Error("Failed to process wellness check-in: " + String(error));
    }
  },
});

export const generateDailyDigest = action({
  args: {
    userId: v.string(),
    date: v.number(), // Timestamp for today
    progressData: v.array(
      v.object({
        topic: v.string(),
        confidence: v.number(),
        lastReviewed: v.number(),
      })
    ),
    upcomingExams: v.array(
      v.object({
        title: v.string(),
        date: v.number(),
        topics: v.array(v.string()),
      })
    ),
    goals: v.array(
      v.object({
        title: v.string(),
        topics: v.array(v.string()),
        targetDate: v.number(),
      })
    ),
    recentActivity: v.array(
      v.object({
        type: v.string(), // "note", "flashcard", "quiz", etc.
        topic: v.string(),
        timestamp: v.number(),
        details: v.optional(v.string()),
      })
    ),
    availableTime: v.optional(v.number()), // minutes available today
  },
  handler: async (ctx, args) => {
    try {
      const today = new Date(args.date);
      
      console.log("Generating daily digest:", {
        userId: args.userId,
        date: today.toISOString(),
        progressData: args.progressData.length,
        upcomingExams: args.upcomingExams.length,
        goals: args.goals.length,
        recentActivity: args.recentActivity.length,
        availableTime: args.availableTime || "unspecified",
      });
      
      // Get the OpenAI client when the function is actually executed
      const openai = getOpenAIClient();
      
      // Select model based on complexity
      const complexity = 
        args.progressData.length > 15 || 
        args.upcomingExams.length > 3 || 
        args.goals.length > 5 ? "medium" : "simple";
        
      const modelConfig = getModelConfig("dailyDigest", complexity);
      
      // Format dates for the AI
      const formattedProgress = args.progressData.map(progress => ({
        ...progress,
        lastReviewed: new Date(progress.lastReviewed).toISOString().split('T')[0],
        daysSinceReview: Math.floor((args.date - progress.lastReviewed) / (1000 * 60 * 60 * 24)),
      }));
      
      const formattedExams = args.upcomingExams.map(exam => ({
        ...exam,
        date: new Date(exam.date).toISOString().split('T')[0],
        daysUntil: Math.ceil((exam.date - args.date) / (1000 * 60 * 60 * 24)),
      }));
      
      const formattedGoals = args.goals.map(goal => ({
        ...goal,
        targetDate: new Date(goal.targetDate).toISOString().split('T')[0],
        daysUntil: Math.ceil((goal.targetDate - args.date) / (1000 * 60 * 60 * 24)),
      }));
      
      const formattedActivity = args.recentActivity.map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp).toISOString(),
        daysAgo: Math.floor((args.date - activity.timestamp) / (1000 * 60 * 60 * 24)),
      }));
      
      const response = await openai.chat.completions.create({
        model: modelConfig.model,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are Dorothy, a medical education AI assistant specializing in creating personalized daily study recommendations.
            Analyze the student's progress data, upcoming exams, goals, and recent activity to generate a focused daily digest.
            Use spaced repetition principles to prioritize topics for review.
            Consider the recency of reviews, confidence levels, and proximity to exams.
            Format your response as a JSON object with 'summary', 'reviewTopics', and 'suggestedActivities'.`,
          },
          {
            role: "user",
            content: `Please create my daily study digest for ${today.toISOString().split('T')[0]}.
            
            My topic progress is: ${JSON.stringify(formattedProgress)}
            
            My upcoming exams are: ${JSON.stringify(formattedExams)}
            
            My current goals are: ${JSON.stringify(formattedGoals)}
            
            My recent study activity: ${JSON.stringify(formattedActivity)}
            
            ${args.availableTime ? `I have ${args.availableTime} minutes available to study today.` : ""}
            
            Based on this information, what should I review today? Please prioritize topics based on spaced repetition principles, upcoming exams, and my confidence levels. The daily digest should include a brief summary, the top topics to review with reasons, and suggested specific activities.`
          },
        ],
      });
      
      const resultText = response.choices[0].message.content || "{}";
      
      try {
        // Extract JSON from the response
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
        
        const dailyDigest = JSON.parse(jsonStr);
        
        // Validate response format
        if (!dailyDigest.summary || !Array.isArray(dailyDigest.reviewTopics) || !Array.isArray(dailyDigest.suggestedActivities)) {
          console.error("Invalid daily digest format:", dailyDigest);
          throw new Error("Generated daily digest is not in the expected format");
        }
        
        console.log("Generated daily digest:", {
          reviewTopicsCount: dailyDigest.reviewTopics.length,
          suggestedActivitiesCount: dailyDigest.suggestedActivities.length,
        });
        
        return dailyDigest;
      } catch (parseError) {
        console.error("Error parsing daily digest response:", parseError);
        throw new Error("Failed to parse the generated daily digest");
      }
    } catch (error) {
      console.error("Error in generateDailyDigest:", error);
      throw new Error("Failed to generate daily digest: " + String(error));
    }
  },
});

// Add to your ai.ts
export const askQuestionWithImage = action({
  args: {
    question: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const openai = getOpenAIClient();
      
      // 1. Assess complexity and medical domain
      const complexity = assessComplexity(args.question);
      const domain = detectMedicalDomain(args.question);
      
      console.log(`Image question complexity: ${complexity}, domain: ${domain}`);
      
      const systemMessage = {
        role: "system" as const,
        content: getSystemPrompt(domain) + " Analyze both the text question and the provided image to give a comprehensive answer."
      };
      
      const userMessage = {
        role: "user" as const,
        content: [
          { type: "text", text: args.question },
          { type: "image_url", image_url: { url: args.imageUrl } }
        ]
      };
      
      // Always use GPT-4o for image analysis
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: getSystemPrompt(domain) + " Analyze both the text question and the provided image to give a comprehensive answer."
          },
          {
            role: "user",
            content: [
              { type: "text" as const, text: args.question },
              { type: "image_url" as const, image_url: { url: args.imageUrl } }
            ] as any
          }
        ] as ChatCompletionMessageParam[],
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error("Error analyzing image question:", error);
      throw new Error("Failed to analyze image with question: " + String(error));
    }
  },
});

// Helper functions
function convertTimeToMinutes(timeString: string): number | null {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }
    return hours * 60 + minutes;
  } catch (error) {
    return null;
  }
}