import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

// Function to create an OpenAI client when needed
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.CONVEX_OPENAI_API_KEY,
  });
}

// PubMed RAG helpers
async function searchPubMed(query: string, maxResults: number = 3) {
  const PUBMED_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
  const searchUrl = `${PUBMED_SEARCH_URL}?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${maxResults}`;
  
  try {
    const response = await fetch(searchUrl);
    const data = await response.json();
    return data.esearchresult.idlist || [];
  } catch (error) {
    console.error("Error searching PubMed:", error);
    return [];
  }
}

async function fetchPubMedAbstracts(ids: string[]) {
  if (ids.length === 0) return [];
  
  const PUBMED_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
  const fetchUrl = `${PUBMED_FETCH_URL}?db=pubmed&id=${ids.join(",")}&retmode=xml&rettype=abstract`;
  
  try {
    const response = await fetch(fetchUrl);
    const data = await response.text();
    
    const articles = [];
    const titleMatches = data.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/g);
    const abstractMatches = data.match(/<Abstract>(.*?)<\/Abstract>/gs);
    
    for (let i = 0; i < (titleMatches?.length || 0); i++) {
      const title = titleMatches?.[i]?.replace(/<\/?ArticleTitle>/g, "") || "";
      const abstract = abstractMatches?.[i]
        ?.replace(/<Abstract>|<\/Abstract>|<AbstractText.*?>|<\/AbstractText>/g, "")
        ?.replace(/<\/?[^>]+(>|$)/g, "") || "";
      
      articles.push({
        id: ids[i],
        title,
        abstract,
        url: `https://pubmed.ncbi.nlm.nih.gov/${ids[i]}/`
      });
    }
    
    return articles;
  } catch (error) {
    console.error("Error fetching PubMed abstracts:", error);
    return [];
  }
}

async function getMedicalLiterature(question: string) {
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

export const generateWithCitations = action({
  args: {
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const openai = getOpenAIClient();
    
    // First, get medical facts directly instead of using internal.medicalRAG
    const { context, citations } = await getMedicalLiterature(args.question);
    
    // Then, enhance with citations
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Dorothy, a medical education AI assistant that produces well-cited responses. 
          When stating medical facts, include citation numbers [1], [2], etc. 
          For facts that are common medical knowledge, no citation is needed.
          Format your response with clear paragraph structure and ensure all specific claims have appropriate citations.`
        },
        {
          role: "user",
          content: `Question: ${args.question}
          
          Please provide a comprehensive answer with proper citations. Use these citations:
          ${citations.map((c: { index: number, title: string }) => `[${c.index}] ${c.title}`).join('\n')}`
        }
      ],
    });
    
    return {
      answer: response.choices[0].message.content,
      citations: citations
    };
  }
});

export const verifyMedicalFacts = action({
  args: {
    medicalText: v.string(),
  },
  handler: async (ctx, args) => {
    const openai = getOpenAIClient();
    
    // Use a model with high factual accuracy
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a medical fact-checking assistant. Your task is to:
          1. Identify medical claims in the provided text
          2. Assess confidence in each claim (High, Medium, Low)
          3. Flag potential inaccuracies
          4. Format the response as a JSON object with "claims" array`
        },
        {
          role: "user",
          content: `Please fact-check this medical text and provide confidence scores for each claim:
          
          ${args.medicalText}`
        }
      ],
    });
    
    try {
      // Extract and parse the JSON response
      const content = response.choices[0].message.content || "";
      const jsonMatch = content.match(/```json([\s\S]*)```/) || content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0].replace(/```json|```/g, ''));
      } else {
        // Fallback if JSON parsing fails
        return {
          raw: content,
          error: "Failed to parse structured response"
        };
      }
    } catch (error) {
      console.error("Error parsing fact check response:", error);
      return {
        error: "Failed to process fact checking results",
        raw: response.choices[0].message.content || ""
      };
    }
  }
});