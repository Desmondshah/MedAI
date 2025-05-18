import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Bookmark as BookmarkIcon, FileText, X, Search, LayoutGrid, ListChecks,
  Sun, Moon, Palette, MoreHorizontal, Trash2, Eye, Edit3, Plus, AlertTriangle, MessageCircle,
  ArchiveRestore, Loader2, SlidersHorizontal, CheckCircle2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface UserAwareProps {
  userId: Id<"users">;
}

interface BookmarkNote {
  title: string | undefined;
  content: string | undefined;
  tags?: string[] | undefined;
}

interface Bookmark {
  _id: Id<"bookmarks">;
  _creationTime?: number;
  userId?: Id<"users">;
  noteId?: Id<"notes">;
  createdAt: number;
  note: BookmarkNote | null;
  comment?: string | null;
}

const formatDate = (timestamp: number | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (timestamp === undefined) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
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
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categories, setCategories] = useState<string[]>(["All", "Important", "Notes", "Lectures"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingComment, setEditingComment] = useState<string>("");
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);

  const getBookmarksQuery = useQuery(api.bookmarks.getAllWithContent, { userId });
  const deleteBookmarkMutation = useMutation(api.bookmarks.remove);
  const updateBookmarkCommentMutation = useMutation(api.bookmarks.updateComment);

  useEffect(() => {
    if (darkMode && !useNotebookTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode, useNotebookTheme]);

  useEffect(() => {
    setIsLoading(true);
    if (getBookmarksQuery) {
      const normalizedBookmarks = getBookmarksQuery
        .map(bookmark => ({
          ...bookmark,
          _id: bookmark._id, 
          comment: bookmark.comment === undefined ? null : bookmark.comment,
          noteId: bookmark.noteId as Id<"notes"> | undefined
        }))
        .sort((a,b) => b.createdAt - a.createdAt);
      setBookmarks(normalizedBookmarks as Bookmark[]);
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
        if (selectedCategory === "Notes" && bookmark.noteId && (!bookmark.note?.tags || !bookmark.note.tags.includes("lecture"))) return true;
        if (selectedCategory === "Lectures" && bookmark.note?.tags?.includes("lecture")) return true;
        return false; 
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
      await deleteBookmarkMutation({ id: bookmarkToDelete._id });
      toast.success(`Bookmark for "${bookmarkToDelete.note?.title || 'item'}" deleted.`);
    } catch (error) {
      toast.error("Failed to delete bookmark.");
    } finally {
        setShowDeleteConfirmModal(false);
        setBookmarkToDelete(null);
        if(selectedBookmark && selectedBookmark._id === bookmarkToDelete._id) {
            setShowBookmarkModal(false);
            setSelectedBookmark(null);
        }
    }
  };

  const handleUpdateComment = async () => {
    if (!selectedBookmark) return;
    try {
        await updateBookmarkCommentMutation({ id: selectedBookmark._id, comment: editingComment.trim() });
        toast.success("Comment updated!");
        setBookmarks(prev => prev.map(b => b._id === selectedBookmark._id ? {...b, comment: editingComment.trim()} : b));
        setSelectedBookmark(prev => prev ? { ...prev, comment: editingComment.trim() } : null);
        setIsEditingComment(false);
    } catch (error) { toast.error("Failed to update comment."); }
  };
  
  const rootThemeClass = useNotebookTheme ? 'notebook-theme' : (darkMode ? 'dark' : '');

  const renderCategoryButtons = () => (
    <div className={`mb-6 flex flex-wrap items-center gap-2 ${useNotebookTheme ? 'bookmarks-controls-area !bg-transparent !border-none !p-0' : ''}`}>
        <span className={`text-sm font-medium mr-2 ${useNotebookTheme ? 'text-amber-700 font-["Architect_Daughter"]' : (darkMode ? 'text-neutral-400' : 'text-gray-600')}`}>Categories:</span>
        {categories.map((category) => {
            const isActive = selectedCategory === category;
            let themeSpecificClasses = "";
            if (useNotebookTheme) {
                themeSpecificClasses = `bookmarks-category-button ${isActive ? 'active' : ''}`;
            } else { // Original Theme styling
                if (isActive) {
                    themeSpecificClasses = darkMode 
                        ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' 
                        : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'; 
                } else {
                    // Ensure inactive buttons in original theme are visible with black text and white/light gray background
                    themeSpecificClasses = darkMode 
                        ? 'bg-neutral-700 border-neutral-500 text-neutral-200 hover:bg-neutral-600' 
                        : 'bg-white border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400';
                }
            }
            return (
                <Button
                    key={category}
                    // For original theme, we let Tailwind classes define the variant completely
                    variant={useNotebookTheme ? "outline" : undefined} 
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={`
                        px-3.5 py-1.5 text-xs shadow-sm transition-all duration-200 rounded-full
                        ${themeSpecificClasses}
                    `}
                >
                    {category}
                </Button>
            );
        })}
    </div>
  );


  return (
    <div className={`bookmarkstab-container space-y-8 ${rootThemeClass}`}>
      {/* Header Section */}
      <div className={`
        flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 pb-4 mb-6
        ${useNotebookTheme 
          ? 'bookmarkstab-header-bar' 
          : (darkMode ? 'border-b border-neutral-700' : 'border-b border-gray-200')
        }
      `}>
        <div className={`flex items-center ${useNotebookTheme ? 'bookmarkstab-title-group' : ''}`}>
          <div className={`
            p-2.5 mr-3 rounded-xl shadow-md
            ${useNotebookTheme 
              ? 'bookmarkstab-title-icon-bg' 
              : (darkMode ? 'bg-indigo-700' : 'bg-indigo-600') 
            }
          `}>
            <BookmarkIcon className={`h-6 w-6 text-white ${useNotebookTheme ? '' : ''}`} />
          </div>
          <div>
            <h1 className={`
              tracking-tight
              ${useNotebookTheme 
                ? 'bookmarkstab-title' 
                : `text-3xl font-bold ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`
              }
            `}>My Bookmarks</h1>
            <p className={`
              ${useNotebookTheme 
                ? 'bookmarkstab-description' 
                : `text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`
              }
            `}>Access your saved notes and important content.</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 ${useNotebookTheme ? 'bookmarkstab-header-controls' : ''}`}>
            <Button variant="outline" size="icon" onClick={() => setUseNotebookTheme(!useNotebookTheme)} className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''} ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'}`} title="Toggle Notebook Theme"><Palette className="h-5 w-5"/></Button>
            <Button variant="outline" size="icon" onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not for notebook theme.");}} className={`notetab-header-button ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'}`} title="Toggle Dark Mode">{darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
        </div>
      </div>

      <div className={`bookmarks-controls-area ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200')} p-4 rounded-xl shadow-sm`}>
          <div className={`flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4`}>
              <div className={`relative flex-grow w-full md:w-auto`}>
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 bookmarks-search-input-icon ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} />
                <Input
                  type="search"
                  placeholder="Search bookmarks by title, content, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bookmarks-search-input pl-10 rounded-lg w-full h-10 ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30')}`}
                />
              </div>
              <div className={`bookmarks-viewmode-toggle p-0.5 rounded-lg flex border ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-200 border-gray-300')}`}>
                    <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`rounded-md h-8 w-8 ${viewMode === 'grid' ? (useNotebookTheme ? 'active' : (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')) : '' }`} title="Grid View"><LayoutGrid className="h-4 w-4"/></Button>
                    <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-md h-8 w-8 ${viewMode === 'list' ? (useNotebookTheme ? 'active' : (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')) : '' }`} title="List View"><ListChecks className="h-4 w-4"/></Button>
                </div>
          </div>
          {renderCategoryButtons()}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
                <div key={i} className={`rounded-xl p-5 animate-pulse ${useNotebookTheme ? 'bg-amber-50' : (darkMode ? 'bg-neutral-800' : 'bg-gray-200')}`}>
                    <div className={`h-5 w-3/4 rounded mb-3 ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-neutral-700' : 'bg-gray-300')}`}></div>
                    <div className={`h-3 w-1/2 rounded mb-4 ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-neutral-700' : 'bg-gray-300')}`}></div>
                </div> ))} </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className={`
            bookmarks-empty-state 
            ${useNotebookTheme 
                ? '' 
                : `py-16 rounded-xl text-center ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200 shadow-sm'}`
            }
        `}>
          <ArchiveRestore className={`h-16 w-16 mx-auto mb-4 ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} />
          <h3 className={`
            ${useNotebookTheme 
                ? '' 
                : `text-xl font-bold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`
            }
          `}>
            {searchQuery || selectedCategory !== "All" ? "No Bookmarks Match Your Criteria" : "Your Bookmark Collection is Empty"}
          </h3>
          <p className={`
            mt-2 
            ${useNotebookTheme 
                ? '' 
                : `text-base ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`
            }
          `}>
            {searchQuery || selectedCategory !== "All" ? "Try adjusting your search or filter." : "Start bookmarking important notes!"}
          </p>
        </div>
      ) : (
        <motion.div layout className={`grid gap-4 sm:gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredBookmarks.map((bookmark) => (
            <motion.div
              layout key={bookmark._id.toString()} initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`bookmark-item-card ${viewMode === 'grid' ? 'bookmark-item-grid' : 'bookmark-item-list'} 
                          ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600' : 'bg-white border-gray-200 hover:border-gray-300')}`}
              onClick={() => handleViewBookmark(bookmark)}
            >
              {viewMode === 'grid' ? ( <>
                  <div className="p-4 sm:p-5 flex-grow">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className={`bookmark-item-title line-clamp-2`}>{bookmark.note?.title || "Untitled Bookmark"}</h3>
                        <BookmarkIcon className={`h-4 w-4 flex-shrink-0 ${useNotebookTheme ? 'text-orange-400' : (darkMode ? 'text-indigo-400' : 'text-indigo-500')} opacity-70 group-hover:opacity-100`} />
                    </div>
                    <p className={`text-xs mb-2 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>Bookmarked: {formatDate(bookmark.createdAt)}</p>
                    {bookmark.comment && (<div className={`bookmark-item-comment p-2 rounded-md my-2 text-xs italic relative`}> <MessageCircle className={`h-3 w-3 inline mr-1 opacity-60`} /> {bookmark.comment} </div>)}
                    <p className={`bookmark-item-content-preview text-sm line-clamp-3 mt-1`}>{bookmark.note?.content || "No content preview."}</p>
                  </div>
                  <div className={`px-4 sm:px-5 py-3 border-t mt-auto bookmark-item-tags ${useNotebookTheme ? 'border-amber-200' : (darkMode ? 'border-neutral-700' : 'border-gray-100')}`}>
                    {bookmark.note?.tags && bookmark.note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {bookmark.note.tags.slice(0,3).map((tag) => (<Badge key={tag} variant="secondary" className={`bookmark-tag-badge`}>{tag}</Badge>))}
                        {bookmark.note.tags.length > 3 && <Badge variant="secondary" className={`bookmark-tag-badge`}>+{bookmark.note.tags.length - 3}</Badge>}
                      </div> )}
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 item-actions">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={(e) => {e.stopPropagation(); handleViewBookmark(bookmark);}} title="View"><Eye className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={(e) => { e.stopPropagation(); setBookmarkToDelete(bookmark); setShowDeleteConfirmModal(true); }} title="Delete"><Trash2 className="h-4 w-4"/></Button>
                    </div>
                  </div> </>
              ) : ( /* List View */ <>
                  <div className={`p-1.5 rounded-md mr-3 ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-neutral-700' : 'bg-gray-100')}`}>
                      <BookmarkIcon className={`h-5 w-5 ${useNotebookTheme ? 'text-orange-500' : (darkMode ? 'text-indigo-400' : 'text-indigo-500')}`} />
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <h3 className={`bookmark-item-title font-medium truncate`}>{bookmark.note?.title || "Untitled Bookmark"}</h3>
                    {bookmark.comment && <p className={`text-xs truncate italic ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>"{bookmark.comment}"</p>}
                    <div className="flex items-center gap-2 mt-1"> <span className={`text-xs ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`}>{formatDate(bookmark.createdAt)}</span> </div>
                  </div>
                  <div className="flex-shrink-0 ml-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity item-actions">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => {e.stopPropagation(); handleViewBookmark(bookmark);}} title="View"><Eye className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); setBookmarkToDelete(bookmark); setShowDeleteConfirmModal(true); }} title="Delete"><Trash2 className="h-4 w-4"/></Button>
                  </div> </>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showBookmarkModal && selectedBookmark && (
          <Dialog open={showBookmarkModal} onOpenChange={setShowBookmarkModal}>
            <DialogContent className={`sm:max-w-2xl dialog-content-notebook bookmark-view-modal ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white')}`}>
              <DialogHeader className={`dialog-header-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700' : 'border-gray-200')}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-indigo-500/20':'bg-indigo-100')}`}> <BookmarkIcon className={`h-5 w-5 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-indigo-300':'text-indigo-600')}`}/></div>
                    <DialogTitle className={`dialog-title-notebook`}>{selectedBookmark?.note?.title || "Bookmarked Item"}</DialogTitle>
                </div>
              </DialogHeader>
              <div className={`p-5 sm:p-6 max-h-[60vh] overflow-y-auto custom-scrollbar`}>
                <div className={`comment-section-notebook mb-4`}>
                    <label className={`block text-sm font-medium mb-1 ${useNotebookTheme ? 'font-["Architect_Daughter"] text-amber-800' : (darkMode? 'text-neutral-300' : 'text-gray-700')}`}>Your Comment:</label>
                    {isEditingComment ? ( 
                        <div className="space-y-2">
                            <Textarea value={editingComment} onChange={(e) => setEditingComment(e.target.value)} placeholder="Add or edit your comment..." className={`min-h-[80px] rounded-lg studyplan-modal-textarea ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600' : 'border-gray-300')}`}/>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => {setIsEditingComment(false); setEditingComment(selectedBookmark?.comment || "");}} className={`dialog-button-notebook outline ${useNotebookTheme ? '' : ''}`}>Cancel</Button>
                                <Button size="sm" onClick={handleUpdateComment} className={`dialog-button-notebook primary ${useNotebookTheme ? '' : ''}`}>Save Comment</Button>
                            </div>
                        </div>
                    ) : ( 
                        <div onClick={() => setIsEditingComment(true)} className={`comment-display p-3 rounded-lg cursor-text min-h-[40px] ${useNotebookTheme ? 'bg-amber-50 border border-amber-200' : (darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-50 border-gray-200')} ${selectedBookmark.comment ? '' : (useNotebookTheme ? 'text-amber-700 opacity-70' : 'text-gray-400 italic')}`}>
                            {selectedBookmark.comment || "Click to add a comment..."}
                            {!selectedBookmark.comment && <Edit3 className="h-3 w-3 inline ml-2 opacity-50"/>}
                        </div>
                     )}
                </div>
                <div className={`note-content-display ${useNotebookTheme ? '' : (darkMode ? 'prose prose-invert' : 'prose')} max-w-none`}>
                    <h3 className={`text-lg font-semibold mb-2 mt-0 ${useNotebookTheme ? 'font-["Architect_Daughter"] text-amber-900' : ''}`}>Original Note:</h3>
                    {(selectedBookmark?.note?.content || "No content available.").split('\n').map((p, i) => <p key={i} className="mb-3 last:mb-0">{p}</p>)}
                </div>
              </div>
              {selectedBookmark?.note?.tags && selectedBookmark.note.tags.length > 0 && ( 
                <div className={`px-5 sm:px-6 py-3 border-t flex flex-wrap gap-2 ${useNotebookTheme ? 'border-amber-200 bg-amber-50/30':'border-gray-100 bg-gray-50/50'}`}>
                  {selectedBookmark.note.tags.map(tag => <Badge key={tag} variant="secondary" className={`bookmark-tag-badge ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 text-neutral-300':'bg-gray-100 text-gray-600')}`}>{tag}</Badge>)}
                </div> )}
              <DialogFooter className={`dialog-footer-notebook p-4 sm:p-5 border-t flex justify-between items-center ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700 bg-neutral-800/70':'border-gray-100 bg-gray-50/70')}`}>
                 <Button variant="outline" onClick={() => { setBookmarkToDelete(selectedBookmark); setShowDeleteConfirmModal(true); setShowBookmarkModal(false);}} className={`dialog-button-notebook outline ${useNotebookTheme ? '!border-red-400 !text-red-600 hover:!bg-red-50' : ''}`}> <Trash2 className="h-4 w-4 mr-2"/> Delete </Button>
                <DialogClose asChild><Button className={`dialog-button-notebook primary ${useNotebookTheme ? '' : ''}`}>Close</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {showDeleteConfirmModal && bookmarkToDelete && (
          <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
            <DialogContent className={`sm:max-w-md dialog-content-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white')}`}>
                <div className="p-6 text-center">
                    <div className={`mx-auto w-14 h-14 flex items-center justify-center rounded-full mb-4 ${useNotebookTheme ? 'bg-red-100' : (darkMode ? 'bg-red-500/10':'bg-red-100')}`}>
                        <AlertTriangle className={`h-7 w-7 ${useNotebookTheme ? 'text-red-500' : (darkMode ? 'text-red-400':'text-red-500')}`} />
                    </div>
                    <DialogTitle className={`dialog-title-notebook text-lg font-semibold mb-2`}>Confirm Deletion</DialogTitle>
                    <DialogDescription className={`mb-5 text-sm ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-400':'text-gray-500')}`}>
                        Are you sure you want to delete the bookmark for "<strong>{bookmarkToDelete?.note?.title || 'this item'}</strong>"? This action cannot be undone.
                    </DialogDescription>
                     <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => {setShowDeleteConfirmModal(false); setBookmarkToDelete(null);}} className={`dialog-button-notebook outline w-full`}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteBookmark} className={`dialog-button-notebook w-full ${useNotebookTheme ? '!bg-red-500 hover:!bg-red-600 text-white' : ''}`}>Delete Bookmark</Button>
                    </div>
                </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}