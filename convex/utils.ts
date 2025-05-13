import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatDate(timestamp: number | Date, format?: string): string {
    // If format is provided, use the formatted date
    if (format) {
      const d = new Date(timestamp);
      
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          
      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();
      const hours = d.getHours();
      const minutes = d.getMinutes();
      
      // Format the time as 12-hour with am/pm
      const hour12 = hours % 12 || 12;
      const ampm = hours >= 12 ? 'pm' : 'am';
      const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      
      // Different format patterns
      if (format === 'MMM d, yyyy') {
        return `${shortMonths[month]} ${day}, ${year}`;
      } else if (format === 'MMMM d, yyyy, h:mm a') {
        return `${months[month]} ${day}, ${year}, ${hour12}:${paddedMinutes} ${ampm}`;
      }
      
      // Default formatted date
      return `${month + 1}/${day}/${year}`;
    }
    
    // Use relative date format if no format is specified
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return date.toLocaleDateString();
    }
}
  
// Extract a title from text content (e.g., first sentence)
export function extractTitleFromContent(content: string, maxLength: number = 50): string {
  // Try to get the first sentence
  const firstSentence = content.split(/[.!?][\s\n]/)[0];
  
  // Limit to maxLength characters
  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }
  
  // If first sentence is too long, truncate with ellipsis
  return firstSentence.substring(0, maxLength) + "...";
}

// Calculate reading time in minutes based on content length
export function calculateReadingTime(content: string): number {
  // Average reading speed: 200 words per minute
  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  return Math.max(1, readingTime); // At least 1 minute
}

// Check if a date is today
export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Generate a random color for tags or categories
export function getRandomPastelColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 80%)`;
}

// Split text into chunks for better processing (e.g., for AI)
export function chunkText(text: string, maxChunkSize: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  
  // Split by paragraphs to avoid breaking in the middle of a paragraph
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed maxChunkSize, push the current chunk and start a new one
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      // Otherwise, add this paragraph to the current chunk
      currentChunk += (currentChunk.length > 0 ? "\n\n" : "") + paragraph;
    }
  }
  
  // Don't forget to add the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Simple client-side search function
export function searchInContent(items: any[], searchField: string, searchTerm: string): any[] {
  const lowerCaseSearchTerm = searchTerm.toLowerCase();
  
  return items.filter(item => {
    const fieldValue = item[searchField]?.toLowerCase() || "";
    return fieldValue.includes(lowerCaseSearchTerm);
  });
}

// Extract tags from content based on common medical topics
export function extractPossibleTags(content: string): string[] {
  const commonMedicalTopics = [
    "cardiology", "neurology", "gastroenterology", "nephrology", 
    "pulmonology", "endocrinology", "hematology", "oncology",
    "immunology", "rheumatology", "infectious disease", "pathology",
    "pharmacology", "anatomy", "physiology", "biochemistry",
    "microbiology", "pediatrics", "psychiatry", "orthopedics",
    "dermatology", "urology", "gynecology", "obstetrics",
    "ophthalmology", "otolaryngology", "radiology", "surgery"
  ];
  
  const contentLower = content.toLowerCase();
  return commonMedicalTopics.filter(topic => contentLower.includes(topic));
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}