import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import fetch from "node-fetch";

// PubMed API URLs
const PUBMED_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

// Function to create an OpenAI client when needed
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.CONVEX_OPENAI_API_KEY,
  });
}

// Function to search PubMed
async function searchPubMed(query: string, maxResults: number = 3): Promise<string[]> {
    try {
      const apiUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${maxResults}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`PubMed search failed: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      return data.esearchresult.idlist || [];
    } catch (error) {
      console.error("Error searching PubMed:", error);
      return [];
    }
  }

// Function to fetch article abstracts
async function fetchPubMedAbstracts(ids: string[]) {
  if (ids.length === 0) return [];
  
  const fetchUrl = `${PUBMED_FETCH_URL}?db=pubmed&id=${ids.join(",")}&retmode=xml&rettype=abstract`;
  
  try {
    const response = await fetch(fetchUrl);
    const data = await response.text();
    
    // Simple extraction of titles and abstracts
    // In a production system, use a proper XML parser
    const articles = [];
    const titleMatches = data.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/g);
    const abstractMatches = data.match(/<Abstract>(.*?)<\/Abstract>/gs);
    
    for (let i = 0; i < (titleMatches?.length || 0); i++) {
      const title = titleMatches?.[i].replace(/<\/?ArticleTitle>/g, "") || "";
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

export const medicalRAG = action({
  args: {
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const openai = getOpenAIClient();
    
    // 1. Search PubMed for relevant articles
    const pubmedIds = await searchPubMed(args.question, 3);
    
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
    
    // 4. Generate response with RAG
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Dorothy, a medical education AI assistant. Use the provided medical literature to answer the question. Cite specific articles using [1], [2], etc. Your response should synthesize information from these sources and provide educational context."
        },
        {
          role: "user",
          content: `Question: ${args.question}\n\nContext: ${context}`
        }
      ],
    });
    
    return {
      answer: response.choices[0].message.content,
      citations: citations
    };
  }
});
