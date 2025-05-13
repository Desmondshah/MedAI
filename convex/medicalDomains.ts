export type MedicalDomain = 
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

export function getSystemPrompt(domain: MedicalDomain): string {
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

// Helper function to detect domain from question
export function detectMedicalDomain(question: string): MedicalDomain {
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