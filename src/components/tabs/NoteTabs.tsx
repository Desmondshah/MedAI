import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import LectureUploadWrapper from "../ui/LectureUploadWrapper";
import { BookmarksTab } from "./BookmarksTab"; // Assuming it's separate and styled independently or inherits
import { FilesList } from "./FilesList";     // Assuming it's separate and styled independently or inherits

import {
  FileText,
  AlertCircle,
  X,
  Upload,
  Brain, // Keep if still used somewhere, e.g. in LectureUploadWrapper
  BookOpen,
  Calendar, // Keep if used
  Filter,
  Search,
  Edit, // Keep for future edit functionality
  Trash,
  MessageCircle, // Keep if used
  Share, // Keep if used
  Bookmark, // Keep if used
  Plus,
  ChevronRight, // Keep if used
  Tag,
  Sun,
  Moon,
  MoreHorizontal, // Keep if used
  Clock, // Keep if used
  ArrowLeft, // Keep if used
  Download, // Keep if used
  Folder, // Keep if used
  File as FileIconLucide, // Keep if used in FilesList
  SlidersHorizontal,
  User, // Keep if used
  Home, // Keep if used
  Settings, // Keep if used
  HelpCircle, // Keep if used
  LogOut, // Keep if used
  Sparkles,
  Menu, // Keep if used for other layouts
  PenTool,
  ArrowUp, // Keep if used
  GripVertical, // Keep if used
  LayoutGrid,
  ListChecks,
  Save,
  Loader2,
  ArchiveRestore,
  Eye,
  Edit3,
  Info,
  Maximize,
  Minimize,
  CheckCircle,
  AlertTriangle,
  Palette, // Added for theme switching
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
  } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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

const formatDate = (timestamp: number | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (timestamp === undefined) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
    };
    return new Date(timestamp).toLocaleDateString(undefined, options || defaultOptions);
};


export function NotesTab({ userId }: UserAwareProps) {
  const [notesContent, setNotesContent] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false); // For AI actions like summarize/flashcards
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For saving note
  
  const [savedNotes, setSavedNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showViewNoteModal, setShowViewNoteModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false); // New state for notebook theme

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  const summarizeNotesAction = useAction(api.ai.summarizeNotes);
  const createNoteMutation = useMutation(api.notes.create);
  const deleteNoteMutation = useMutation(api.notes.remove);
  const generateFlashcardsAction = useAction(api.ai.generateFlashcards);
  const createFlashcardBatchMutation = useMutation(api.flashcards.createBatch);
  const notesQuery = useQuery(api.notes.getAll, { userId });

  useEffect(() => {
    if (notesQuery) {
      const sortedNotes = [...notesQuery].sort((a, b) => b.createdAt - a.createdAt);
      setSavedNotes(sortedNotes);
    }
  }, [notesQuery]);

  useEffect(() => {
    let tempNotes = [...savedNotes];
    if (searchTerm) {
      tempNotes = tempNotes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (activeFilters.length > 0) {
      tempNotes = tempNotes.filter(note =>
        activeFilters.every(filterTag => note.tags.includes(filterTag))
      );
    }
    setFilteredNotes(tempNotes);
  }, [searchTerm, activeFilters, savedNotes]);

  useEffect(() => {
    // Apply dark class to HTML element if dark mode is on AND notebook theme is OFF
    if (darkMode && !useNotebookTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, useNotebookTheme]);

  const handleSummarizeNotes = async () => {
    if (!notesContent.trim()) {
        toast.error("Please enter some notes to summarize.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await summarizeNotesAction({ content: notesContent.trim() });
      if (response) {
        setSummary(response);
        toast.success("Summary generated successfully!");
      } else {
        setError("No summary generated. The content might be too short or unclear.");
        toast.error("Could not generate summary.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error during summarization";
      setError(`Failed to summarize notes: ${errorMessage}`);
      toast.error(`Summarization failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!title.trim()) {
        toast.error("Note title cannot be empty.");
        return;
    }
    if (!notesContent.trim()) {
        toast.error("Note content cannot be empty.");
        return;
    }
    setIsSubmitting(true);
    try {
      await createNoteMutation({
        userId,
        title: title.trim(),
        content: notesContent.trim(),
        tags: tags,
      });
      toast.success(`Note "${title.trim()}" saved!`);
      setTitle("");
      setNotesContent("");
      setSummary("");
      setTags([]);
      setTagInput("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error while saving";
      toast.error(`Failed to save note: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleGenerateFlashcards = async () => {
    const contentToUse = summary.trim() || notesContent.trim();
    if (!contentToUse) {
        toast.error("Please enter some notes or generate a summary first.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const topicTitle = title.trim() || "General Medical Notes";
      const flashcards = await generateFlashcardsAction({
        topic: topicTitle,
        content: contentToUse,
      });
      if (flashcards && flashcards.length > 0) {
        await createFlashcardBatchMutation({
          userId,
          cards: flashcards.map(card => ({ ...card, category: topicTitle })),
        });
        toast.success(`${flashcards.length} flashcards created for "${topicTitle}"!`);
      } else {
        setError("No flashcards could be generated from this content.");
        toast.info("No flashcards generated. Try with more specific content.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error during flashcard generation";
      setError(`Failed to generate flashcards: ${errorMessage}`);
      toast.error(`Flashcard generation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewNote = (note: Note) => {
    setSelectedNote(note);
    setShowViewNoteModal(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await deleteNoteMutation({ id: noteToDelete._id });
      toast.success(`Note "${noteToDelete.title}" deleted.`);
      setShowDeleteConfirmModal(false);
      setNoteToDelete(null);
       if (selectedNote && selectedNote._id === noteToDelete._id) {
        setShowViewNoteModal(false);
        setSelectedNote(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error during deletion";
      toast.error(`Failed to delete note: ${errorMessage}`);
    }
  };

  const handleUploadComplete = (data: any) => {
    toast.success(`Lecture "${data.title}" uploaded successfully! Ready for note-taking or summarization.`);
    setShowUploadModal(false);
  };

  const allAvailableTags = Array.from(new Set(savedNotes.flatMap(note => note.tags))).sort();

  const toggleFilterTag = (tag: string) => {
    setActiveFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  useEffect(() => {
    if (notesTextareaRef.current) {
        notesTextareaRef.current.style.height = 'auto';
        const newHeight = Math.min(notesTextareaRef.current.scrollHeight, isEditorExpanded ? 600 : 200); // Min height 200px for notebook theme
        notesTextareaRef.current.style.height = `${newHeight}px`;
    }
  }, [notesContent, isEditorExpanded, useNotebookTheme]); // Rerun on theme change too

  const rootThemeClass = useNotebookTheme ? 'notebook-theme' : (darkMode ? 'dark' : '');

  return (
    <div className={`max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-300 notetab-container ${rootThemeClass}`}>
      <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 ${useNotebookTheme ? 'notetab-header-bar' : ''}`}>
        <div className="flex items-center">
            <div className={`p-2.5 mr-3 rounded-xl shadow-md ${useNotebookTheme ? 'bg-blue-600' : (darkMode ? 'bg-blue-500' : 'bg-blue-600')}`}>
                <PenTool className="h-6 w-6 text-white" />
            </div>
            <div>
                <h1 className={`text-3xl font-bold tracking-tight ${useNotebookTheme ? 'notetab-title' : (darkMode ? 'text-neutral-100' : 'text-gray-900')}`}>My Notes</h1>
                <p className={`text-sm ${useNotebookTheme ? 'text-amber-800' /* Example specific color */ : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>Create, organize, and summarize your medical knowledge.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Button /* Notebook Theme Toggle */
            variant="outline"
            size="icon"
            className={`rounded-full notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''} ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
            onClick={() => setUseNotebookTheme(!useNotebookTheme)}
            title={useNotebookTheme ? "Switch to Original Theme" : "Switch to Notebook Theme"}
          >
            <Palette className="h-5 w-5" />
          </Button>
          <Button /* Dark Mode Toggle */
            variant="outline"
            size="icon"
            className={`rounded-full notetab-header-button ${darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
            onClick={() => {
              if (!useNotebookTheme) setDarkMode(!darkMode);
              else toast.info("Dark mode not applicable to Notebook theme.", {duration: 2000});
            }}
            title={useNotebookTheme ? "Notebook theme active" : "Toggle Dark/Light Mode"}
          >
            {darkMode && !useNotebookTheme ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            onClick={() => setShowUploadModal(true)}
            className={`rounded-lg shadow-sm notetab-header-button ${useNotebookTheme ? '' : (darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}`}
          >
            <Upload className="h-4 w-4 mr-2" /> Upload Lecture
          </Button>
        </div>
      </div>

      <motion.div layout className={`rounded-xl shadow-lg overflow-hidden transition-all duration-300 note-editor-card ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200')}`}>
        <div className={`p-5 sm:p-6 border-b note-editor-header ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700' : 'border-gray-200')}`}>
            <div className="flex justify-between items-center">
                <h2 className={`text-lg font-semibold note-editor-title ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-100' : 'text-gray-900')}`}>Create or Edit Note</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsEditorExpanded(!isEditorExpanded)} title={isEditorExpanded ? "Collapse Editor" : "Expand Editor"} 
                        className={`rounded-full ${useNotebookTheme ? 'text-amber-700 hover:bg-amber-100' : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500')}`}>
                    {isEditorExpanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
            </div>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note..."
            className={`text-xl font-semibold border-0 border-b-2 rounded-none px-1 py-2 focus:ring-0 note-title-input
                        ${useNotebookTheme ? '' : (darkMode ? 'bg-transparent border-neutral-600 focus:border-blue-500 text-neutral-100 placeholder:text-neutral-500'
                                  : 'bg-transparent border-gray-300 focus:border-blue-600 text-gray-900 placeholder:text-gray-400')}`}
          />
          <Textarea
            ref={notesTextareaRef}
            value={notesContent}
            onChange={(e) => setNotesContent(e.target.value)}
            placeholder="Start typing your medical notes here... You can summarize them later."
            className={`w-full p-3 rounded-lg resize-none transition-all duration-200 custom-scrollbar note-content-textarea ${isEditorExpanded ? 'expanded' : ''}
                        ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700/50 border-neutral-600 focus:border-blue-500 focus:ring-blue-500/30 text-neutral-200 placeholder:text-neutral-500'
                                  : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/30 text-gray-800 placeholder:text-gray-400')}`}
          />
          <div className={`flex flex-col sm:flex-row gap-2 items-start ${useNotebookTheme ? 'note-tag-input-container' : ''}`}>
            <div className="relative flex-grow">
                <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add relevant tags (e.g., Cardiology, Exam Prep)"
                    className={`w-full pr-20 rounded-lg ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30')}`}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                />
                <Button onClick={handleAddTag} size="sm" className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md ${useNotebookTheme ? '' : (darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white')}`}>Add Tag</Button>
            </div>
            {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-0 max-w-full overflow-x-auto pb-1">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={`py-1 px-2.5 rounded-full cursor-pointer group whitespace-nowrap note-tag-badge ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 text-neutral-300 border-neutral-600 hover:bg-neutral-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-red-100 hover:text-red-700 hover:border-red-300')}`}
                  onClick={() => handleRemoveTag(tag)}
                  title="Click to remove tag"
                >
                  {tag}
                  <X className="h-3 w-3 ml-1.5 opacity-50 group-hover:opacity-100" />
                </Badge>
              ))}
            </div>
          )}
          </div>

          {error && (
            <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className={`p-3 rounded-md text-sm flex items-center gap-2 ${useNotebookTheme ? 'bg-red-100 text-red-700 border border-red-300' : (darkMode ? 'bg-red-900/20 text-red-300 border border-red-700/50' : 'bg-red-50 text-red-700 border border-red-200')}`}>
              <AlertCircle className="h-4 w-4" /> {error}
            </motion.div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSummarizeNotes} disabled={isLoading || !notesContent.trim()} variant="outline" className={`shadow-sm note-action-button ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-200' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700')}`}>
              {isLoading && !isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Summarize Notes
            </Button>
            <Button onClick={handleGenerateFlashcards} disabled={isLoading || (!summary.trim() && !notesContent.trim())} variant="outline" className={`shadow-sm note-action-button ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-200' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700')}`}>
              {isLoading && !isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
              Create Flashcards
            </Button>
            <Button onClick={handleSaveNote} disabled={isSubmitting || !title.trim() || !notesContent.trim()} className={`ml-auto shadow-md note-action-button save-button ${useNotebookTheme ? '' : (darkMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 text-white')}`}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Note
            </Button>
          </div>
        </div>

        {summary && (
          <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className={`p-5 sm:p-6 border-t overflow-hidden note-summary-box ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-blue-50/50 border-blue-100')}`}>
            <h3 className={`text-md font-semibold mb-2 flex items-center gap-2 ${useNotebookTheme ? '' : (darkMode ? 'text-blue-300' : 'text-blue-700')}`}>
                <FileText className="h-4 w-4"/>AI Generated Summary
            </h3>
            <div className={`prose prose-sm max-w-none rounded-md p-3 custom-scrollbar max-h-60 overflow-y-auto ${useNotebookTheme ? '' : (darkMode ? 'prose-invert bg-neutral-700/30 text-neutral-200' : 'bg-white text-gray-700')}`}>
              {summary.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Notes Collection Display */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          <h2 className={`text-2xl font-semibold notes-collection-header ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-100 border-neutral-700' : 'text-gray-800 border-gray-200')}`}>Your Notes Collection</h2>
          <div className={`flex items-center gap-2 w-full sm:w-auto ${useNotebookTheme ? 'notes-filter-controls' : ''}`}>
            <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} />
              <Input
                type="search"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 rounded-lg w-full ${useNotebookTheme ? 'notes-filter-input' : (darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30')}`}
              />
            </div>
             <div className={`p-0.5 rounded-lg flex border ${useNotebookTheme ? 'bg-amber-50 border-amber-200' : (darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-200 border-gray-300')}`}>
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`rounded-md h-8 w-8 ${viewMode === 'grid' && (useNotebookTheme ? 'bg-amber-500 text-white' : (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')) }`} title="Grid View"><LayoutGrid className="h-4 w-4"/></Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-md h-8 w-8 ${viewMode === 'list' && (useNotebookTheme ? 'bg-amber-500 text-white' : (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')) }`} title="List View"><ListChecks className="h-4 w-4"/></Button>
            </div>
          </div>
        </div>

        {allAvailableTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
                <span className={`text-sm font-medium mr-2 ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-400' : 'text-gray-600')}`}>Filter by tag:</span>
                {allAvailableTags.map(tag => (
                <Button
                    key={tag}
                    variant="outline" // Base variant, theming done by CSS or specific classes
                    size="sm"
                    onClick={() => toggleFilterTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs shadow-sm filter-tag-button ${activeFilters.includes(tag) ? 'active' : ''}
                                ${useNotebookTheme ? '' : (activeFilters.includes(tag)
                                    ? (darkMode ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-600 text-white border-blue-600')
                                    : (darkMode ? 'bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400'))}`}
                >
                    {activeFilters.includes(tag) && <CheckCircle className="h-3 w-3 mr-1.5"/>}
                    {tag}
                </Button>
                ))}
                {activeFilters.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveFilters([])} className={`rounded-full text-xs ${useNotebookTheme ? 'text-red-600 hover:bg-red-100' : (darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50')}`}>
                        <X className="h-3 w-3 mr-1"/> Clear Filters
                    </Button>
                )}
            </div>
        )}

        {/* Notes List/Grid */}
        {filteredNotes.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${useNotebookTheme ? 'bg-yellow-50 border-2 border-dashed border-yellow-200' : (darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200 shadow-sm')}`}>
            <ArchiveRestore className={`h-12 w-12 mx-auto mb-3 ${useNotebookTheme ? 'text-yellow-600' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} />
            <h3 className={`text-lg font-medium ${useNotebookTheme ? 'text-yellow-800' : (darkMode ? 'text-neutral-200' : 'text-gray-700')}`}>
              {searchTerm || activeFilters.length > 0 ? "No notes match your filters." : "Your note collection is empty."}
            </h3>
            <p className={`mt-1 text-sm ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>
              {searchTerm || activeFilters.length > 0 ? "Try adjusting your search or filters." : "Start by creating a new note above!"}
            </p>
          </div>
        ) : (
          <motion.div layout className={`grid gap-4 sm:gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {filteredNotes.map((note) => (
              <motion.div
                layout
                key={note._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`rounded-xl cursor-pointer group transition-all duration-200 ease-in-out
                            ${useNotebookTheme 
                                ? (viewMode === 'grid' ? 'note-card-grid flex flex-col overflow-hidden' : 'note-item-list flex items-center p-3 sm:p-4')
                                : (darkMode ? 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600 hover:shadow-blue-500/10' 
                                      : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg')}
                            ${viewMode === 'grid' ? '' : 'shadow-sm hover:shadow-md'}`}
                onClick={() => handleViewNote(note)}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="p-4 sm:p-5 flex-grow">
                      <h3 className={`font-semibold text-md line-clamp-2 mb-1 ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>{note.title}</h3>
                      <p className={`text-xs mb-2 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>
                        Created: {formatDate(note.createdAt)}
                      </p>
                      <p className={`text-sm line-clamp-3 note-card-content-preview ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-300' : 'text-gray-600')}`}>{note.content}</p>
                    </div>
                    <div className={`px-4 sm:px-5 py-3 border-t mt-auto ${useNotebookTheme ? 'border-amber-200' : (darkMode ? 'border-neutral-700' : 'border-gray-100')}`}>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {note.tags.slice(0,3).map((tag) => (
                            <Badge key={tag} variant="secondary" className={`text-xs rounded-full note-card-tag ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600')}`}>{tag}</Badge>
                          ))}
                          {note.tags.length > 3 && <Badge variant="secondary" className={`text-xs rounded-full note-card-tag ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600')}`}>+{note.tags.length - 3}</Badge>}
                        </div>
                      )}
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${useNotebookTheme ? 'text-amber-700 hover:bg-amber-100' : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500')}`} onClick={(e) => {e.stopPropagation(); handleViewNote(note);}} title="View Note"><Eye className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${useNotebookTheme ? 'text-amber-700 hover:bg-amber-100' : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500')}`} onClick={(e) => {e.stopPropagation(); toast.info("Edit: Coming soon!")}} title="Edit Note"><Edit3 className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${useNotebookTheme ? 'text-red-500 hover:bg-red-100' : (darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500')}`} onClick={(e) => { e.stopPropagation(); setNoteToDelete(note); setShowDeleteConfirmModal(true); }} title="Delete Note"><Trash className="h-4 w-4"/></Button>
                        </div>
                    </div>
                  </>
                ) : ( // List View
                  <>
                    <div className={`p-1.5 rounded-md mr-3 ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-neutral-700' : 'bg-gray-100')}`}>
                        <FileText className={`h-5 w-5 ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-blue-400' : 'text-blue-500')}`} />
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <h3 className={`font-medium truncate ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>{note.title}</h3>
                      <p className={`text-xs truncate ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>
                        {note.content.substring(0, 80)}{note.content.length > 80 ? '...' : ''}
                      </p>
                       <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`}>{formatDate(note.createdAt)}</span>
                        {note.tags && note.tags.length > 0 && (
                            <>
                            <span className={`text-xs ${useNotebookTheme ? 'text-amber-300' : (darkMode ? 'text-neutral-600' : 'text-gray-300')}`}>|</span>
                            <div className="flex flex-wrap gap-1">
                            {note.tags.slice(0,2).map((tag) => (
                                <Badge key={tag} variant="secondary" className={`text-xs rounded note-card-tag ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600')}`}>{tag}</Badge>
                            ))}
                            {note.tags.length > 2 && <Badge variant="secondary" className={`text-xs rounded note-card-tag ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600')}`}>...</Badge>}
                            </div>
                            </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${useNotebookTheme ? 'text-amber-700 hover:bg-amber-100' : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500')}`} onClick={(e) => {e.stopPropagation(); handleViewNote(note);}} title="View Note"><Eye className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${useNotebookTheme ? 'text-amber-700 hover:bg-amber-100' : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500')}`} onClick={(e) => {e.stopPropagation(); toast.info("Edit functionality coming soon.")}} title="Edit Note"><Edit3 className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${useNotebookTheme ? 'text-red-500 hover:bg-red-100' : (darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500')}`} onClick={(e) => { e.stopPropagation(); setNoteToDelete(note); setShowDeleteConfirmModal(true); }} title="Delete Note"><Trash className="h-4 w-4"/></Button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Modals (View Note, Delete Confirm, Upload Lecture) */}
      {/* These modals will use the .dialog-content-notebook class for theming */}
      <AnimatePresence>
        {showViewNoteModal && selectedNote && (
          <Dialog open={showViewNoteModal} onOpenChange={setShowViewNoteModal}>
            <DialogContent className={`sm:max-w-2xl rounded-xl shadow-2xl border-0 p-0 overflow-hidden dialog-content-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white')}`}>
              <DialogHeader className={`p-5 sm:p-6 border-b dialog-header-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700' : 'border-gray-200')}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-blue-500/20':'bg-blue-100')}`}> <FileText className={`h-5 w-5 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-blue-300':'text-blue-600')}`}/></div>
                    <DialogTitle className={`text-xl font-semibold dialog-title-notebook ${useNotebookTheme ? '' : ''}`}>{selectedNote.title}</DialogTitle>
                </div>
                <DialogDescription className={`text-xs mt-1 ${useNotebookTheme ? 'text-amber-800':'text-gray-500'}`}>
                    Created on: {formatDate(selectedNote.createdAt, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </DialogDescription>
              </DialogHeader>
              <div className={`p-5 sm:p-6 max-h-[60vh] overflow-y-auto custom-scrollbar ${useNotebookTheme ? 'prose-notebook' : (darkMode ? 'prose prose-invert' : 'prose')} max-w-none`}>
                {selectedNote.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-3 last:mb-0">{paragraph}</p>
                ))}
              </div>
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className={`px-5 sm:px-6 py-3 border-t flex flex-wrap gap-2 ${useNotebookTheme ? 'border-amber-200 bg-amber-50/30':'border-gray-100 bg-gray-50/50'}`}>
                  {selectedNote.tags.map(tag => <Badge key={tag} variant="secondary" className={`rounded-full note-card-tag ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 text-neutral-300':'bg-gray-100 text-gray-600')}`}>{tag}</Badge>)}
                </div>
              )}
              <DialogFooter className={`p-4 sm:p-5 border-t flex justify-between items-center dialog-footer-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700 bg-neutral-800/70':'border-gray-100 bg-gray-50/70')}`}>
                <Button variant="outline" onClick={() => { setNoteToDelete(selectedNote); setShowDeleteConfirmModal(true); setShowViewNoteModal(false);}} className={`rounded-lg dialog-button-notebook outline ${useNotebookTheme ? 'border-red-400 text-red-600 hover:bg-red-50' : (darkMode ? 'border-red-500/30 text-red-400 hover:bg-red-500/10':'border-red-200 text-red-600 hover:bg-red-50')}`}>
                    <Trash className="h-4 w-4 mr-2"/> Delete
                </Button>
                <DialogClose asChild>
                  <Button variant="default" className={`rounded-lg dialog-button-notebook primary ${useNotebookTheme ? '' : (darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white':'bg-blue-600 hover:bg-blue-700 text-white')}`}>Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {showDeleteConfirmModal && noteToDelete && (
          <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
            <DialogContent className={`sm:max-w-md rounded-xl shadow-2xl border-0 p-0 overflow-hidden dialog-content-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white')}`}>
                <div className="p-6 text-center">
                    <div className={`mx-auto w-14 h-14 flex items-center justify-center rounded-full mb-4 ${useNotebookTheme ? 'bg-red-100' : (darkMode ? 'bg-red-500/10':'bg-red-100')}`}>
                        <AlertTriangle className={`h-7 w-7 ${useNotebookTheme ? 'text-red-500' : (darkMode ? 'text-red-400':'text-red-500')}`} />
                    </div>
                    <DialogTitle className={`text-lg font-semibold mb-2 dialog-title-notebook ${useNotebookTheme ? '' : ''}`}>Confirm Deletion</DialogTitle>
                    <DialogDescription className={`mb-5 text-sm ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-400':'text-gray-500')}`}>
                        Are you sure you want to delete the note titled "<strong>{noteToDelete.title}</strong>"? This action cannot be undone.
                    </DialogDescription>
                     <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => {setShowDeleteConfirmModal(false); setNoteToDelete(null);}} className={`rounded-lg w-full dialog-button-notebook outline ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-600 hover:bg-neutral-700':'border-gray-300 hover:bg-gray-100')}`}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteNote} className={`rounded-lg w-full dialog-button-notebook ${useNotebookTheme ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}>Delete Note</Button>
                    </div>
                </div>
            </DialogContent>
          </Dialog>
        )}

        {showUploadModal && (
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogContent className={`sm:max-w-2xl rounded-xl shadow-2xl border-0 p-0 overflow-hidden dialog-content-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white')}`}>
                <DialogHeader className={`p-5 sm:p-6 border-b dialog-header-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700' : 'border-gray-200')}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-blue-500/20':'bg-blue-100')}`}> <Upload className={`h-5 w-5 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-blue-300':'text-blue-600')}`}/></div>
                        <DialogTitle className={`text-xl font-semibold dialog-title-notebook ${useNotebookTheme ? '' : ''}`}>Upload Lecture Material</DialogTitle>
                    </div>
                    <DialogDescription className={`text-xs mt-1 ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-400':'text-gray-500')}`}>
                        Upload PDF, DOCX, or TXT files. The content can be used to generate notes.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-5 sm:p-6">
                    {/* The LectureUploadWrapper should ideally also adapt its internal styling if useNotebookTheme is true, 
                        or its parent .dialog-content-notebook styles should be specific enough to theme it. */}
                    <LectureUploadWrapper userId={userId} onUploadComplete={handleUploadComplete} />
                </div>
                 <DialogFooter className={`p-4 sm:p-5 border-t dialog-footer-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700 bg-neutral-800/70':'border-gray-100 bg-gray-50/70')}`}>
                    <DialogClose asChild>
                        <Button variant="outline" className={`rounded-lg dialog-button-notebook outline lecture-upload-dialog-button ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-600 hover:bg-neutral-700':'border-gray-300 hover:bg-gray-100')}`}>Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export other tabs if they are defined in this file (though they seem separate)
export { BookmarksTab };
export { FilesList }; // Assuming FilesList might be used elsewhere or as part of a larger structure