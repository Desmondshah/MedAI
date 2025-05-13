import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import LectureUploadWrapper from "../ui/LectureUploadWrapper";
import {FilesList} from "./FilesList";
import { 
  FileText, 
  AlertCircle, 
  X, 
  Upload, 
  Brain, 
  BookOpen, 
  Calendar, 
  Filter, 
  Search, 
  Edit, 
  Trash,
  MessageCircle,
  Share,
  Bookmark,
  Plus,
  ChevronRight,
  Tag,
  Sun,
  Moon,
  MoreHorizontal,
  Clock,
  ArrowLeft,
  Download,
  Folder,
  File,
  Sliders,
  SlidersHorizontal,
  User,
  Home,
  Settings,
  HelpCircle,
  LogOut,
  Sparkles,
  Menu,
  PenTool,
  ArrowUp
} from "lucide-react";
import { BookmarksTab } from "./BookmarksTab";

// Type Definitions
interface UserAwareProps {
  userId: Id<"users">;
}

interface Note {
  _id: Id<"notes">;
  _creationTime?: number;
  userId: Id<"users">;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
}

interface BookmarkNote {
    title: string | undefined;
    content: string | undefined;
    tags: string[] | undefined;
  }
  
  interface Bookmark {
    _id: string;
    _creationTime?: number;
    userId?: Id<"users">;
    noteId?: Id<"notes">;
    createdAt: number;
    note: BookmarkNote | null;
    comment: string | null | undefined; // Updated to accept undefined
  }

interface FilterSettings {
  fileTypes: string[];
  dateRange: string;
  category: string;
}

// Helper function to format dates
const formatDate = (date: number | Date, format: string): string => {
  if (!date) return '';
  const d = new Date(date);
  
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
  
  // Default format
  return `${month + 1}/${day}/${year}`;
};

// NotesTab Component
export function NotesTab({ userId }: UserAwareProps) {
  // State management
  const [notes, setNotes] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [savedNotes, setSavedNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [noteToDelete, setNoteToDelete] = useState<Id<"notes"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(false);
  
  // API connections
  const summarizeNotes = useAction(api.ai.summarizeNotes);
  const createNote = useMutation(api.notes.create);
  const deleteNote = useMutation(api.notes.remove);
  const generateFlashcards = useAction(api.ai.generateFlashcards);
  const createFlashcardBatch = useMutation(api.flashcards.createBatch);
  
  // Get all notes for this user
  const notesQuery = useQuery(api.notes.getAll, { userId });

  
  
  useEffect(() => {
    if (notesQuery) {
      setSavedNotes(notesQuery);
    }
  }, [notesQuery]);

  // Toggle dark mode and set CSS variables
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.setProperty(
      '--color-bg-primary', 
      darkMode ? '#0a0a0b' : '#ffffff'
    );
    document.documentElement.style.setProperty(
      '--color-text-primary', 
      darkMode ? '#f5f5f7' : '#1d1d1f'
    );
  }, [darkMode]);

  const handleSummarizeNotes = async () => {
    if (!notes.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await summarizeNotes({ content: notes.trim() });
      if (response) {
        setSummary(response);
        
        // Show success toast with subtle animation
        toast.success("Summary generated successfully", {
          position: "bottom-right",
          duration: 3000,
          className: "toast-premium"
        });
      } else {
        setError("No summary generated. Please try again with more detailed notes.");
        toast.error("No summary generated. Please try with more detailed notes.");
      }
    } catch (error) {
      console.error("Error summarizing notes:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to summarize notes: ${errorMessage}`);
      toast.error(`Failed to summarize notes: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!title.trim() || !notes.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      await createNote({
        userId,
        title: title.trim(),
        content: notes.trim(),
        tags: tags
      });
      
      toast.success("Note saved successfully", {
        position: "bottom-right",
        duration: 3000,
        className: "toast-premium"
      });
      
      // Clear form
      setTitle("");
      setNotes("");
      setSummary("");
      setTags([]);
    } catch (error) {
      console.error("Error saving note:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to save note: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleGenerateFlashcards = async () => {
    if (!summary && !notes) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const content = summary || notes;
      const topicTitle = title || "Medical Notes";
      
      const flashcards = await generateFlashcards({ 
        topic: topicTitle,
        content
      });
      
      if (flashcards && Array.isArray(flashcards) && flashcards.length > 0) {
        try {
          // Save flashcards to the database
          const savedIds = await createFlashcardBatch({
            userId,
            cards: flashcards.map(card => ({
              ...card,
              category: topicTitle
            }))
          });
          
          toast.success(`${flashcards.length} flashcards created successfully`, {
            position: "bottom-right",
            duration: 3000,
            className: "toast-premium"
          });
        } catch (dbError) {
          console.error("Database error saving flashcards:", dbError);
          const errorMessage = dbError instanceof Error ? dbError.message : "Unknown database error";
          setError(`Error saving flashcards: ${errorMessage}`);
          toast.error(`Error saving flashcards: ${errorMessage}`);
        }
      } else {
        setError("No flashcards could be generated from this content.");
        toast.error("No flashcards could be generated from this content.");
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to generate flashcards: ${errorMessage}`);
      toast.error(`Failed to generate flashcards: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle viewing a note
  const handleViewNote = (note: Note) => {
    setSelectedNote(note);
    setShowNoteModal(true);
  };

  // Handle deleting a note
  const handleDeleteNote = async (noteId: Id<"notes">) => {
    try {
      await deleteNote({ id: noteId });
      toast.success("Note deleted successfully", {
        position: "bottom-right",
        duration: 3000,
      });
      // Close modal if open
      if (selectedNote && selectedNote._id === noteId) {
        setShowNoteModal(false);
        setSelectedNote(null);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete note: ${errorMessage}`);
    } finally {
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
    }
  };

  const handleUploadComplete = (data: any) => {
    toast.success(`Lecture "${data.title}" uploaded successfully!`);
    setShowUploadModal(false);
  };
  
  // Dynamic classNames based on darkMode
  const getBaseClasses = () => {
    return `transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`;
  };

  return (
    <div className={`max-w-6xl mx-auto px-4 fade-in ${darkMode ? 'dark-mode' : ''}`}>
      
      {/* Header with Toggle and Actions */}
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-3xl font-light ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Notes
        </h1>
        <div className="flex items-center space-x-4">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-full p-1">
            <button 
              onClick={() => setView('grid')}
              className={`rounded-full p-2 ${view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'} transition-all duration-300`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button 
              onClick={() => setView('list')}
              className={`rounded-full p-2 ${view === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'} transition-all duration-300`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
          
          {/* Theme toggle button */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-300"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-gray-700" />
            ) : (
              <Moon className="h-5 w-5 text-gray-700" />
            )}
          </button>
        </div>
      </div>
      
      {/* Note Editor */}
      <div className={`rounded-2xl overflow-hidden transition-all duration-500 shadow-lg mb-12 ${darkMode ? 'bg-black border border-gray-900' : 'bg-white'}`}>
        {/* Editor Header */}
        <div className={`p-6 flex justify-between items-center border-b ${darkMode ? 'border-gray-900' : 'border-gray-100'}`}>
          <div className="flex items-center">
            <div className={`p-2 mr-3 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
              <FileText className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create Note</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Take notes, add tags, or summarize content
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'} transition-colors duration-300`}
          >
            {isEditorExpanded ? (
              <ArrowLeft className={`h-5 w-5 ${darkMode ? 'text-gray-900' : 'text-gray-900'}`} />
            ) : (
              <ChevronRight className={`h-5 w-5 ${darkMode ? 'text-gray-900' : 'text-gray-900'}`} />
            )}
          </button>
        </div>
        
        {/* Editor Body */}
        <div className="p-6 space-y-6">
          {/* Title Input */}
          <div className={`group relative transition-all duration-300 ${darkMode ? 'text-white' : ''}`}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className={`w-full px-4 py-3 text-lg font-medium border-0 border-b-2 outline-none transition-all duration-300 ${
                darkMode 
                  ? 'bg-gray-900 border-gray-900 focus:border-blue-500 text-white'
                  : 'bg-white border-gray-200 focus:border-blue-500 text-gray-900'
              }`}
            />
          </div>
          
          {/* Note Content */}
          <div className={`relative transition-all duration-300 ${isEditorExpanded ? 'min-h-96' : 'min-h-64'}`}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type or paste your notes here..."
              className={`w-full p-4 rounded-lg resize-none transition-all duration-300 h-full ${
                darkMode 
                  ? 'bg-gray-900 text-white border-0 placeholder:text-gray-900'
                  : 'bg-gray-50 text-gray-900 border-0 placeholder:text-gray-400'
              } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              style={{ minHeight: isEditorExpanded ? '400px' : '250px' }}
            />
          </div>
          
          {/* Tags Section */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`relative flex-1 ${darkMode ? 'text-white' : ''}`}>
              <div className="relative">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tags (e.g., cardiology, pathology)"
                  className={`w-full pl-10 pr-24 py-3 rounded-lg transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-900 text-white border-0 placeholder:text-gray-900'
                      : 'bg-gray-50 text-gray-900 border-0 placeholder:text-gray-400'
                  } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Tag className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                
                <button 
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 rounded-md transition-all duration-300 ${
                    tagInput.trim() 
                      ? (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700')
                      : (darkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400')
                  }`}
                >
                  Add Tag
                </button>
              </div>
              
              {/* Tag Pills */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map((tag) => (
                    <div 
                      key={tag} 
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium group transition-all duration-300 ${
                        darkMode 
                          ? 'bg-gray-700 text-blue-400'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {tag}
                      <button 
                        onClick={() => handleRemoveTag(tag)} 
                        className={`ml-2 rounded-full p-1 transition-opacity duration-300 ${
                          darkMode
                            ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                            : 'hover:bg-blue-100 text-blue-400 hover:text-blue-700'
                        } opacity-70 group-hover:opacity-100`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setShowUploadModal(true)}
              className={`py-3 px-4 rounded-lg transition-all duration-300 flex items-center ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </button>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 transition-all duration-300 ${
              darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'
            }`}>
              <AlertCircle className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-600'} mt-0.5 flex-shrink-0`} />
              <div>
                <p className={`font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>Error</p>
                <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleSummarizeNotes}
              disabled={isLoading || !notes.trim()}
              className={`
                py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center 
                ${isLoading ? 'opacity-70 cursor-not-allowed' : 'transform hover:-translate-y-1 hover:shadow-md'}
                ${!notes.trim() ? 'opacity-50 cursor-not-allowed' : ''}
                ${darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}
              `}
            >
              {isLoading ? (
                <div className="loader">
                  <div className={`h-1.5 w-1.5 rounded-full ${darkMode ? 'bg-gray-400' : 'bg-gray-500'} mr-1`}></div>
                  <div className={`h-1.5 w-1.5 rounded-full ${darkMode ? 'bg-gray-400' : 'bg-gray-500'} mr-1`}></div>
                  <div className={`h-1.5 w-1.5 rounded-full ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                </div>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Summarize
                </>
              )}
            </button>
            
            <button 
              onClick={handleSaveNote}
              disabled={!title.trim() || !notes.trim() || isSubmitting}
              className={`
                py-2.5 px-5 rounded-lg transition-all duration-300 flex items-center
                ${(!title.trim() || !notes.trim() || isSubmitting) ? 'opacity-70 cursor-not-allowed' : 'transform hover:-translate-y-1 hover:shadow-md'}
                ${darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'}
              `}
            >
              {isSubmitting ? (
                <div className="loader">
                  <div className="h-1.5 w-1.5 rounded-full bg-white mr-1"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white mr-1"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                </div>
              ) : (
                "Save Note"
              )}
            </button>
          </div>
          
          {/* Summary Section */}
          {summary && (
            <div className={`
              rounded-xl p-5 mt-8 transition-all duration-500 transform animate-in zoom-in-95
              ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-blue-50 border border-blue-100'}
            `}>
              <div className="flex items-center mb-4">
                <div className={`p-2 mr-3 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-white'}`}>
                  <FileText className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-blue-900'}`}>Summary</h3>
              </div>
              
              <div className={`prose max-w-none ${darkMode ? 'text-gray-300' : 'text-blue-900'}`}>
                {summary.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-3">{paragraph}</p>
                ))}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleGenerateFlashcards}
                  disabled={isLoading}
                  className={`
                    px-4 py-2 rounded-lg transition-all duration-300 flex items-center
                    ${isLoading ? 'opacity-70 cursor-not-allowed' : 'transform hover:-translate-y-1 hover:shadow-md'}
                    ${darkMode 
                      ? 'bg-gray-800 text-blue-400 hover:bg-gray-900'
                      : 'bg-white text-blue-700 hover:bg-gray-50'}
                  `}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {isLoading ? "Generating..." : "Generate Flashcards"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Notes Section */}
      <div className={`mb-12 ${darkMode ? 'text-white' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-light">Recent Notes</h2>
          <div className="flex space-x-2">
            <div className={`relative rounded-lg transition-all duration-300 ${
              darkMode ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                placeholder="Search notes..."
                className={`w-full h-10 pl-10 pr-4 rounded-lg transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800 text-white placeholder:text-gray-500 border-0'
                    : 'bg-gray-100 text-gray-800 placeholder:text-gray-400 border-0'
                } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
            </div>
            
            <button className={`h-10 px-3 rounded-lg flex items-center transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-800 text-gray-400 hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}>
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {!savedNotes || savedNotes.length === 0 ? (
          <div className={`
            rounded-2xl p-10 text-center transition-all duration-300
            ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white shadow-lg'}
          `}>
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <FileText className={`h-10 w-10 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <h3 className={`text-xl font-light mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>No notes yet</h3>
            <p className={`max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Create your first note using the form above to get started. Notes help you organize your knowledge.
            </p>
          </div>
        ) : (
          <div className={`grid gap-6 ${view === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {savedNotes.map((note) => (
              <div 
                key={note._id}
                onClick={() => handleViewNote(note)}
                className={`
                  rounded-xl overflow-hidden transition-all duration-300 cursor-pointer
                  transform hover:-translate-y-1 hover:shadow-xl
                  ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white shadow-md'}
                  ${view === 'list' ? 'p-5' : ''}
                `}
              >
                {view === 'grid' ? (
                  <>
                    <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className="flex justify-between">
                        <h3 className="font-medium line-clamp-1">{note.title}</h3>
                        <div className="flex space-x-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteToDelete(note._id);
                              setShowDeleteConfirm(true);
                            }}
                            className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                              darkMode 
                                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
                            }`}
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center mt-2">
                        <Clock className={`h-3 w-3 mr-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatDate(note.createdAt, 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className={`line-clamp-3 text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {note.content.substring(0, 150)}...
                      </p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {note.tags.map((tag) => (
                            <span 
                              key={tag}
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                darkMode 
                                  ? 'bg-gray-700 text-gray-300'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{note.title}</h3>
                      <p className={`mt-1 line-clamp-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {note.content.substring(0, 150)}...
                      </p>
                      <div className="flex items-center mt-2">
                        <Clock className={`h-3 w-3 mr-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatDate(note.createdAt, 'MMM d, yyyy')}
                        </span>
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {note.tags.map((tag) => (
                            <span 
                              key={tag}
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                darkMode 
                                  ? 'bg-gray-700 text-gray-300'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex items-start">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteToDelete(note._id);
                          setShowDeleteConfirm(true);
                        }}
                        className={`p-2 rounded-full transition-all duration-300 ${
                          darkMode 
                            ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Note Detail Modal */}
      {showNoteModal && selectedNote && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300">
          <div 
            className={`w-full max-w-4xl rounded-2xl overflow-hidden animate-in zoom-in-95 transition-all duration-300 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className={`p-6 flex justify-between items-center border-b ${
              darkMode ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <div className="flex items-center">
                <div className={`p-2 mr-3 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-blue-50'
                }`}>
                  <FileText className={`h-5 w-5 ${
                    darkMode ? 'text-blue-400' : 'text-blue-500'
                  }`} />
                </div>
                <h2 className={`text-xl font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>{selectedNote.title}</h2>
              </div>
              <button 
                onClick={() => setShowNoteModal(false)}
                className={`p-2 rounded-full transition-all duration-300 ${
                  darkMode 
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className={`p-6 max-h-[70vh] overflow-y-auto ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <div className="prose max-w-none">
                {selectedNote.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
              
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8">
                  {selectedNote.tags.map((tag) => (
                    <span 
                      key={tag}
                      className={`px-3 py-1 rounded-full text-sm ${
                        darkMode 
                          ? 'bg-gray-800 text-blue-400'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              <div className={`mt-8 pt-6 border-t flex items-center ${
                darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-500'
              }`}>
                <Calendar className="h-4 w-4 mr-2" />
                Created on {formatDate(selectedNote.createdAt, 'MMMM d, yyyy, h:mm a')}
              </div>
            </div>
            
            <div className={`p-6 flex justify-between border-t ${
              darkMode ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <button 
                onClick={() => setShowNoteModal(false)}
                className={`py-2.5 px-4 rounded-lg transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Close
              </button>
              
              <div className="flex space-x-3">
                <button 
                  className={`py-2.5 px-4 rounded-lg flex items-center transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                
                <button 
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteToDelete(selectedNote._id);
                    setShowDeleteConfirm(true);
                  }}
                  className={`py-2.5 px-4 rounded-lg flex items-center transition-all duration-300 ${
                    darkMode 
                      ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && noteToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300">
          <div 
            className={`w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 transition-all duration-300 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-5 ${
                darkMode ? 'bg-red-900/20' : 'bg-red-100'
              }`}>
                <AlertCircle className={`h-8 w-8 ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`} />
              </div>
              
              <h3 className={`text-xl font-medium mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>Delete Note</h3>
              
              <p className={`mb-6 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Are you sure you want to delete this note? This action cannot be undone.
              </p>
              
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setNoteToDelete(null);
                  }}
                  className={`py-2.5 px-5 rounded-lg transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={() => handleDeleteNote(noteToDelete)}
                  className={`py-2.5 px-5 rounded-lg transition-all duration-300 ${
                    darkMode 
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal Component */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300">
          <div 
            className={`w-full max-w-3xl rounded-2xl overflow-hidden animate-in zoom-in-95 transition-all duration-300 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className={`p-6 flex justify-between items-center border-b ${
              darkMode ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <div className="flex items-center">
                <div className={`p-2 mr-3 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-blue-50'
                }`}>
                  <Upload className={`h-5 w-5 ${
                    darkMode ? 'text-blue-400' : 'text-blue-500'
                  }`} />
                </div>
                <h2 className={`text-xl font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>Upload Lecture Material</h2>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className={`p-2 rounded-full transition-all duration-300 ${
                  darkMode 
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
  <LectureUploadWrapper 
    userId={userId}
    onUploadComplete={handleUploadComplete}
  />
</div>
          </div>
        </div>
      )}
    </div>
  );
}

export { BookmarksTab };

