import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
// LectureUploadWrapper and FilesList are not directly used by BookmarksTab functionality
// NotesTab is the parent context but not directly imported here
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
  Bookmark as BookmarkIcon,
  Plus, // Added for "Add a comment" button
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
  SlidersHorizontal,
  User,
  Home,
  Settings,
  HelpCircle,
  LogOut,
  Sparkles,
  Menu,
  PenTool,
  ArrowUp,
  LayoutGrid,
  ListChecks,
  ArchiveRestore,
  Loader2,
  AlertTriangle, // Already imported from previous fix
  Eye,
  Edit3,
  CheckCircle, // Already imported from previous fix
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

// Type Definitions
interface UserAwareProps {
  userId: Id<"users">;
}

interface BookmarkNote {
  title: string | undefined;
  content: string | undefined;
  tags?: string[] | undefined;
}

interface Bookmark {
  _id: string;
  _creationTime?: number;
  userId?: Id<"users">;
  noteId?: Id<"notes">;
  createdAt: number;
  note: BookmarkNote | null;
  comment: string | null | undefined;
}

const formatDate = (timestamp: number | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (timestamp === undefined) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
    };
    return new Date(timestamp).toLocaleDateString(undefined, options || defaultOptions);
};

export function BookmarksTab({ userId }: UserAwareProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [showBookmarkModal, setShowBookmarkModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<Bookmark | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categories, setCategories] = useState<string[]>(["All", "Notes", "Important", "Lectures"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingComment, setEditingComment] = useState<string>("");
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);

  const getBookmarksQuery = useQuery(api.bookmarks.getAllWithContent, { userId });
  const deleteBookmarkMutation = useMutation(api.bookmarks.remove);
  const updateBookmarkCommentMutation = useMutation(api.bookmarks.updateComment);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    setIsLoading(true);
    if (getBookmarksQuery) {
      const normalizedBookmarks = getBookmarksQuery.map(bookmark => ({
        ...bookmark,
        _id: String(bookmark._id),
        comment: bookmark.comment === undefined ? null : bookmark.comment,
        noteId: bookmark.noteId as Id<"notes"> | undefined
      })).sort((a,b) => b.createdAt - a.createdAt);
      setBookmarks(normalizedBookmarks);
      setIsLoading(false);
    } else if (getBookmarksQuery === undefined) {
        // Still loading
    } else {
        setBookmarks([]);
        setIsLoading(false);
    }
  }, [getBookmarksQuery]);

  useEffect(() => {
    let tempBookmarks = [...bookmarks];
    if (selectedCategory !== "All") {
      tempBookmarks = tempBookmarks.filter(bookmark => {
        if (selectedCategory === "Important" && bookmark.comment && bookmark.comment.trim() !== "") return true;
        if (selectedCategory === "Notes" && bookmark.noteId) return true;
        if (selectedCategory === "Lectures" && bookmark.note?.tags?.includes("lecture")) return true;
        if (selectedCategory === "All") return true; // Should not be filtered if "All"
        return false; // Default for unhandled categories
      });
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tempBookmarks = tempBookmarks.filter(bookmark =>
        bookmark.note?.title?.toLowerCase().includes(query) ||
        bookmark.note?.content?.toLowerCase().includes(query) ||
        bookmark.comment?.toLowerCase().includes(query) ||
        bookmark.note?.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    setFilteredBookmarks(tempBookmarks);
  }, [searchQuery, bookmarks, selectedCategory]);

  const handleViewBookmark = (bookmark: Bookmark) => {
    setSelectedBookmark(bookmark);
    setEditingComment(bookmark.comment || "");
    setIsEditingComment(false);
    setShowBookmarkModal(true);
  };

  const confirmDeleteBookmark = async () => {
    if (!bookmarkToDelete) return;
    try {
      await deleteBookmarkMutation({ id: bookmarkToDelete._id as Id<"bookmarks"> });
      toast.success(`Bookmark for "${bookmarkToDelete.note?.title || 'item'}" deleted.`);
      setShowDeleteConfirmModal(false);
      setBookmarkToDelete(null);
      if(selectedBookmark && selectedBookmark._id === bookmarkToDelete._id) {
        setShowBookmarkModal(false);
        setSelectedBookmark(null);
      }
    } catch (error) {
      toast.error("Failed to delete bookmark.");
      console.error("Delete bookmark error:", error);
    }
  };

  const handleUpdateComment = async () => {
    if (!selectedBookmark) return;
    try {
        const bookmarkId = selectedBookmark._id as Id<"bookmarks">;
        await updateBookmarkCommentMutation({
            id: bookmarkId,
            comment: editingComment.trim()
        });
        toast.success("Comment updated successfully!");
        setSelectedBookmark(prev => prev ? { ...prev, comment: editingComment.trim() } : null);
        setIsEditingComment(false);
    } catch (error) {
        toast.error("Failed to update comment.");
        console.error("Update comment error:", error);
    }
};

  const renderCategoryButtons = () => (
    <div className="mb-6 flex flex-wrap items-center gap-2"> {/* Wrapped in a div */}
        <span className={`text-sm font-medium mr-2 ${darkMode ? 'text-neutral-400' : 'text-gray-600'}`}>Filter:</span>
        {categories.map((category) => (
            <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full px-3.5 py-1.5 text-xs shadow-sm transition-all duration-200
                        ${selectedCategory === category
                            ? (darkMode ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-600 text-white border-blue-600')
                            : (darkMode ? 'bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400')
                        }`}
            >
            {category}
            </Button>
        ))}
    </div>
  );


  return (
    <div className={`max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-300 ${darkMode ? 'bg-neutral-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center">
            <div className={`p-2.5 mr-3 rounded-xl shadow-md ${darkMode ? 'bg-indigo-500' : 'bg-indigo-600'}`}>
                <BookmarkIcon className="h-6 w-6 text-white" />
            </div>
            <div>
                <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`}>My Bookmarks</h1>
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Access your saved notes and important content.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className={`rounded-full ${darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
            title="Toggle Theme"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className={`flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 p-4 rounded-xl shadow-sm 
                      ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200' }`}>
          <div className={`relative flex-grow w-full md:w-auto`}> {/* Corrected className: removed object syntax */}
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
            <Input
              type="search"
              placeholder="Search bookmarks by title, content, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 rounded-lg w-full h-10 ${darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => toast.info("Advanced filters coming soon!")} className={`rounded-lg h-10 w-10 ${darkMode ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600' : 'bg-white border-gray-300 hover:bg-gray-100'}`} title="Filter Options">
                <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <div className={`p-0.5 rounded-lg flex ${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-200 border-gray-300'} border`}>
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`rounded-md h-8 w-8 ${viewMode === 'grid' && (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') }`} title="Grid View"><LayoutGrid className="h-4 w-4"/></Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-md h-8 w-8 ${viewMode === 'list' && (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') }`} title="List View"><ListChecks className="h-4 w-4"/></Button>
            </div>
          </div>
      </div>

      {renderCategoryButtons()}

      {isLoading ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
                <div key={i} className={`rounded-xl p-5 animate-pulse ${darkMode ? 'bg-neutral-800' : 'bg-gray-200'}`}>
                    <div className={`h-5 w-3/4 rounded mb-3 ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
                    <div className={`h-3 w-1/2 rounded mb-4 ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
                    <div className={`h-12 w-full rounded mb-3 ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
                    <div className="flex gap-2">
                        <div className={`h-4 w-12 rounded-full ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
                        <div className={`h-4 w-16 rounded-full ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
                    </div>
                </div>
            ))}
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className={`text-center py-16 rounded-xl ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <ArchiveRestore className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>
            {searchQuery || selectedCategory !== "All" ? "No Bookmarks Match Your Criteria" : "Your Bookmark List is Empty"}
          </h3>
          <p className={`mt-2 text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
            {searchQuery || selectedCategory !== "All" ? "Try adjusting your search or filter options." : "Start bookmarking important notes or content!"}
          </p>
        </div>
      ) : (
        <motion.div layout className={`grid gap-4 sm:gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredBookmarks.map((bookmark) => (
            <motion.div
              layout
              key={bookmark._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl cursor-pointer group transition-all duration-200 ease-in-out relative
                          ${darkMode ? 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600 hover:shadow-indigo-500/10' 
                                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl'}
                          ${viewMode === 'grid' ? 'flex flex-col overflow-hidden shadow-lg' : 'flex items-center p-3 sm:p-4 shadow-md'}`}
              onClick={() => handleViewBookmark(bookmark)}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="p-4 sm:p-5 flex-grow">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-semibold text-md line-clamp-2 ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{bookmark.note?.title || "Untitled Bookmark"}</h3>
                        <BookmarkIcon className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'} opacity-70 group-hover:opacity-100`} />
                    </div>
                    <p className={`text-xs mb-2 ${darkMode ? 'text-neutral-500' : 'text-gray-500'}`}>
                      Bookmarked: {formatDate(bookmark.createdAt)}
                    </p>
                    {bookmark.comment && (
                        <div className={`p-2 rounded-md my-2 text-xs italic relative ${darkMode ? 'bg-neutral-700/70 text-neutral-300' : 'bg-gray-50 text-gray-600'}`}>
                            <MessageCircle className={`h-3 w-3 inline mr-1 opacity-60`} /> {bookmark.comment}
                        </div>
                    )}
                    <p className={`text-sm line-clamp-3 mt-1 ${darkMode ? 'text-neutral-300' : 'text-gray-600'}`}>{bookmark.note?.content || "No content preview."}</p>
                  </div>
                  <div className={`px-4 sm:px-5 py-3 border-t mt-auto ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                    {bookmark.note?.tags && bookmark.note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {bookmark.note.tags.slice(0,3).map((tag) => (
                          <Badge key={tag} variant="secondary" className={`text-xs rounded-full ${darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'}`}>{tag}</Badge>
                        ))}
                        {bookmark.note.tags.length > 3 && <Badge variant="secondary" className={`text-xs rounded-full ${darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'}`}>+{bookmark.note.tags.length - 3}</Badge>}
                      </div>
                    )}
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`} onClick={(e) => {e.stopPropagation(); handleViewBookmark(bookmark);}} title="View Details"><Eye className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`} onClick={(e) => { e.stopPropagation(); setBookmarkToDelete(bookmark); setShowDeleteConfirmModal(true); }} title="Delete Bookmark"><Trash className="h-4 w-4"/></Button>
                    </div>
                  </div>
                </>
              ) : ( 
                <>
                  <div className={`p-1.5 rounded-md mr-3 ${darkMode ? 'bg-neutral-700' : 'bg-gray-100'}`}>
                      <BookmarkIcon className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <h3 className={`font-medium truncate ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{bookmark.note?.title || "Untitled Bookmark"}</h3>
                    {bookmark.comment && <p className={`text-xs truncate italic ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>"{bookmark.comment}"</p>}
                    {!bookmark.comment && bookmark.note?.content && <p className={`text-xs truncate ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{bookmark.note.content.substring(0,80)}...</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{formatDate(bookmark.createdAt)}</span>
                      {bookmark.note?.tags && bookmark.note.tags.length > 0 && (
                          <>
                          <span className={`text-xs ${darkMode ? 'text-neutral-600' : 'text-gray-300'}`}>|</span>
                          <div className="flex flex-wrap gap-1">
                          {bookmark.note.tags.slice(0,2).map((tag) => (
                              <Badge key={tag} variant="secondary" className={`text-xs rounded ${darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'}`}>{tag}</Badge>
                          ))}
                          {bookmark.note.tags.length > 2 && <Badge variant="secondary" className={`text-xs rounded ${darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'}`}>...</Badge>}
                          </div>
                          </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`} onClick={(e) => {e.stopPropagation(); handleViewBookmark(bookmark);}} title="View Details"><Eye className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`} onClick={(e) => { e.stopPropagation(); setBookmarkToDelete(bookmark); setShowDeleteConfirmModal(true); }} title="Delete Bookmark"><Trash className="h-4 w-4"/></Button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showBookmarkModal && selectedBookmark && (
          <Dialog open={showBookmarkModal} onOpenChange={setShowBookmarkModal}>
            <DialogContent className={`sm:max-w-2xl rounded-xl shadow-2xl border-0 p-0 overflow-hidden ${darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white'}`}>
              <DialogHeader className={`p-5 sm:p-6 border-b ${darkMode ? 'border-neutral-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/20':'bg-indigo-100'}`}> <BookmarkIcon className={`h-5 w-5 ${darkMode ? 'text-indigo-300':'text-indigo-600'}`}/></div>
                    <DialogTitle className="text-xl font-semibold">{selectedBookmark?.note?.title || "Bookmarked Item"}</DialogTitle>
                </div>
                 <DialogDescription className={`text-xs mt-1 ${darkMode ? 'text-neutral-400':'text-gray-500'}`}>
                    Bookmarked on: {formatDate(selectedBookmark?.createdAt, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </DialogDescription>
              </DialogHeader>
              <div className={`p-5 sm:p-6 max-h-[60vh] overflow-y-auto custom-scrollbar`}>
                {isEditingComment ? (
                    <div className="mb-4 space-y-2">
                        <Textarea
                            value={editingComment}
                            onChange={(e) => setEditingComment(e.target.value)}
                            placeholder="Add or edit your comment..."
                            className={`min-h-[80px] rounded-lg ${darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => {setIsEditingComment(false); setEditingComment(selectedBookmark?.comment || "");}}>Cancel</Button>
                            <Button size="sm" onClick={handleUpdateComment}>Save Comment</Button>
                        </div>
                    </div>
                ) : selectedBookmark?.comment ? (
                    <div className={`mb-4 p-3 rounded-lg relative ${darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-blue-50 text-blue-800'}`}>
                        <div className="flex justify-between items-start">
                            <p className="text-sm italic">"{selectedBookmark.comment}"</p>
                            <Button variant="ghost" size="icon" className={`h-6 w-6 rounded-full -mt-1 -mr-1 ${darkMode ? 'text-neutral-400 hover:bg-neutral-600' : 'text-gray-500 hover:bg-blue-100'}`} onClick={() => setIsEditingComment(true)}>
                                <Edit3 className="h-3.5 w-3.5"/>
                            </Button>
                        </div>
                    </div>
                ) : (
                     <Button variant="outline" size="sm" onClick={() => setIsEditingComment(true)} className={`mb-4 w-full justify-start ${darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-100'}`}>
                        <Plus className="h-4 w-4 mr-2"/> Add a comment
                    </Button>
                 )}
                <div className={`${darkMode ? 'prose prose-invert' : 'prose'} max-w-none`}>
                    <h3 className="text-lg font-semibold mb-2 mt-0">Original Note Content:</h3>
                    {(selectedBookmark?.note?.content || "No content available for this bookmark.").split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3 last:mb-0">{paragraph}</p>
                    ))}
                </div>
              </div>
              {selectedBookmark?.note?.tags && selectedBookmark.note.tags.length > 0 && (
                <div className={`px-5 sm:px-6 py-3 border-t flex flex-wrap gap-2 ${darkMode ? 'border-neutral-700 bg-neutral-800/50':'border-gray-100 bg-gray-50/50'}`}>
                  {selectedBookmark.note.tags.map(tag => <Badge key={tag} variant="secondary" className={`rounded-full ${darkMode ? 'bg-neutral-700 text-neutral-300':'bg-gray-100 text-gray-600'}`}>{tag}</Badge>)}
                </div>
              )}
              <DialogFooter className={`p-4 sm:p-5 border-t flex justify-between items-center ${darkMode ? 'border-neutral-700 bg-neutral-800/70':'border-gray-100 bg-gray-50/70'}`}>
                 <Button variant="outline" onClick={() => { setBookmarkToDelete(selectedBookmark); setShowDeleteConfirmModal(true); setShowBookmarkModal(false);}} className={`rounded-lg ${darkMode ? 'border-red-500/30 text-red-400 hover:bg-red-500/10':'border-red-200 text-red-600 hover:bg-red-50'}`}>
                    <Trash className="h-4 w-4 mr-2"/> Delete Bookmark
                </Button>
                <DialogClose asChild>
                  <Button variant="default" className={`rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white':'bg-blue-600 hover:bg-blue-700 text-white'}`}>Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {showDeleteConfirmModal && bookmarkToDelete && (
          <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
            <DialogContent className={`sm:max-w-md rounded-xl shadow-2xl border-0 p-0 overflow-hidden ${darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white'}`}>
                <div className="p-6 text-center">
                    <div className={`mx-auto w-14 h-14 flex items-center justify-center rounded-full mb-4 ${darkMode ? 'bg-red-500/10':'bg-red-100'}`}>
                        <AlertTriangle className={`h-7 w-7 ${darkMode ? 'text-red-400':'text-red-500'}`} />
                    </div>
                    <DialogTitle className="text-lg font-semibold mb-2">Confirm Deletion</DialogTitle>
                    <DialogDescription className={`mb-5 text-sm ${darkMode ? 'text-neutral-400':'text-gray-500'}`}>
                        Are you sure you want to delete the bookmark for "<strong>{bookmarkToDelete?.note?.title || 'this item'}</strong>"? This action cannot be undone.
                    </DialogDescription>
                     <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => {setShowDeleteConfirmModal(false); setBookmarkToDelete(null);}} className={`rounded-lg w-full ${darkMode ? 'border-neutral-600 hover:bg-neutral-700':'border-gray-300 hover:bg-gray-100'}`}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteBookmark} className="rounded-lg w-full">Delete Bookmark</Button>
                    </div>
                </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export other tabs if they are defined in this file
// For example, if NotesTab, FilesList were part of this 'NoteTabs.tsx' originally
// export { NotesTab } from "./NoteTabs"; // This would be recursive if NotesTab is in this file
// export { FilesList } from "./FilesList";