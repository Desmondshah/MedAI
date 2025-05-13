export type ModelComplexity = "simple" | "medium" | "complex" | "expert";
export type ModelTask = "qa" | "summarization" | "flashcards" | "diagnosis" | "studyPlan";

interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
}

export function getModelConfig(task: ModelTask, complexity: ModelComplexity): ModelConfig {
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
    default:
      return configs.medium;
  }
}

// Helper to determine complexity based on input
export function assessComplexity(input: string): ModelComplexity {
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