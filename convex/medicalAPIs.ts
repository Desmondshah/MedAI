// medicalAPIs.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import fetch from "node-fetch";

// Define interface for SNOMED CT API response items
interface SnomedConcept {
  conceptId: string;
  fsn: {
    term: string;
  };
  pt?: {
    term: string;
  };
}

interface SnomedResponse {
  items: SnomedConcept[];
}

// SNOMED CT API (example using public SNOMED API)
export const searchSNOMED = action({
  args: {
    term: v.string(),
  },
  handler: async (ctx, args) => {
    const API_URL = "https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/concepts";
    const response = await fetch(`${API_URL}?term=${encodeURIComponent(args.term)}&activeFilter=true&limit=10`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from SNOMED CT: ${response.status}`);
    }
    
    const data = await response.json() as SnomedResponse;
    return data.items.map((item: SnomedConcept) => ({
      id: item.conceptId,
      term: item.fsn.term,
      synonyms: item.pt ? [item.pt.term] : []
    }));
  }
});

// UpToDate API simulation (normally would require subscription)
export const searchUpToDate = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // This is a simulation - in production you would use the actual UpToDate API
    console.log(`Searching UpToDate for: ${args.query}`);
    
    // Simulate API response
    return {
      status: "simulated",
      message: "This is a simulated UpToDate API response. In production, replace this with actual API integration."
    };
  }
});

// DynaMed API integration
export const searchDynaMed = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // In production, you would implement actual API integration with DynaMed
    console.log(`Searching DynaMed for: ${args.query}`);
    
    // Simulate API response
    return {
      status: "simulated",
      message: "This is a simulated DynaMed API response. In production, replace this with actual API integration."
    };
  }
});

// PubMed API integration (expanded from the helper functions in ai.ts)
interface PubMedArticle {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  publicationDate: string;
  journal: string;
  url: string;
}

export const searchPubMed = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const PUBMED_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
    const PUBMED_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
    const maxResults = args.maxResults || 5;
    
    try {
      // Search for articles
      const searchUrl = `${PUBMED_SEARCH_URL}?db=pubmed&term=${encodeURIComponent(args.query)}&retmode=json&retmax=${maxResults}`;
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        throw new Error(`PubMed search failed: ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      const pubmedIds = searchData.esearchresult?.idlist || [];
      
      if (pubmedIds.length === 0) {
        return { articles: [] };
      }
      
      // Fetch full article data
      const fetchUrl = `${PUBMED_FETCH_URL}?db=pubmed&id=${pubmedIds.join(",")}&retmode=xml&rettype=abstract`;
      const fetchResponse = await fetch(fetchUrl);
      
      if (!fetchResponse.ok) {
        throw new Error(`PubMed fetch failed: ${fetchResponse.status}`);
      }
      
      const data = await fetchResponse.text();
      
      // Simple extraction of titles and abstracts
      // In a production system, use a proper XML parser
      const articles: PubMedArticle[] = [];
      const titleMatches = data.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/g);
      const abstractMatches = data.match(/<Abstract>(.*?)<\/Abstract>/gs);
      const authorMatches = data.match(/<Author.*?<\/Author>/gs);
      const journalMatches = data.match(/<Journal.*?<\/Journal>/gs);
      const dateMatches = data.match(/<PubDate.*?<\/PubDate>/gs);
      
      for (let i = 0; i < (titleMatches?.length || 0); i++) {
        const title = titleMatches?.[i]?.replace(/<\/?ArticleTitle>/g, "") || "";
        const abstract = abstractMatches?.[i]
          ?.replace(/<Abstract>|<\/Abstract>|<AbstractText.*?>|<\/AbstractText>/g, "")
          ?.replace(/<\/?[^>]+(>|$)/g, "") || "";
        
        // Extract author names (simplified)
        const authorList: string[] = [];
        const authorText = authorMatches?.[i] || "";
        const lastNameMatches = authorText.match(/<LastName>(.*?)<\/LastName>/g);
        const firstNameMatches = authorText.match(/<ForeName>(.*?)<\/ForeName>/g);
        
        if (lastNameMatches && firstNameMatches) {
          for (let j = 0; j < lastNameMatches.length; j++) {
            const lastName = lastNameMatches[j].replace(/<\/?LastName>/g, "");
            const firstName = firstNameMatches[j]?.replace(/<\/?ForeName>/g, "") || "";
            authorList.push(`${lastName} ${firstName}`);
          }
        }
        
        // Extract journal and date (simplified)
        const journal = journalMatches?.[i]?.match(/<Title>(.*?)<\/Title>/)?.pop()?.replace(/<\/?Title>/g, "") || "";
        const year = dateMatches?.[i]?.match(/<Year>(.*?)<\/Year>/)?.pop()?.replace(/<\/?Year>/g, "") || "";
        const month = dateMatches?.[i]?.match(/<Month>(.*?)<\/Month>/)?.pop()?.replace(/<\/?Month>/g, "") || "";
        
        articles.push({
          id: pubmedIds[i],
          title,
          abstract,
          authors: authorList,
          publicationDate: `${year} ${month}`.trim(),
          journal,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pubmedIds[i]}/`
        });
      }
      
      return { articles };
    } catch (error) {
      console.error("Error searching PubMed:", error);
      throw new Error(`PubMed search failed: ${String(error)}`);
    }
  }
});