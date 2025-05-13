import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import LectureUploadWrapper from "../ui/LectureUploadWrapper";
import { formatDate } from '../../../convex/utils';
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

// Type Definitions
interface UserAwareProps {
  userId: Id<"users">;
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

// BookmarksTab Component
export function BookmarksTab({ userId }: UserAwareProps) {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
    const [showBookmarkModal, setShowBookmarkModal] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
    const [darkMode, setDarkMode] = useState<boolean>(false);
    const [view, setView] = useState<"grid" | "list">("grid");
    const [categories, setCategories] = useState<string[]>(["All", "Notes", "Lectures", "Important"]);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    // API connection
    const getBookmarks = useQuery(api.bookmarks.getAllWithContent, { userId });
    const deleteBookmark = useMutation(api.bookmarks.remove);
    
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
    
    // Mock bookmarks for the demo
    useEffect(() => {
      // Mock loading delay
      const timer = setTimeout(() => {
        // Create mock data if no real data available
        if (!getBookmarks || getBookmarks.length === 0) {
          const mockBookmarks: Bookmark[] = [
            {
              _id: 'bookmark1',
              createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
              note: {
                title: 'Cardiovascular System Overview',
                content: 'The cardiovascular system consists of the heart, blood vessels, and blood. Its primary function is to transport oxygen, nutrients, hormones, and cellular waste products throughout the body. The heart acts as a pump that pushes blood through the circulatory system...',
                tags: ['cardiology', 'anatomy']
              },
              comment: 'Important for the exam next week'
            },
            {
              _id: 'bookmark2',
              createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
              note: {
                title: 'Neurotransmitters and Synaptic Transmission',
                content: 'Neurotransmitters are chemical messengers that transmit signals across a chemical synapse from one neuron to another. Major neurotransmitters include acetylcholine, dopamine, serotonin, and glutamate. Each has distinct functions in the nervous system...',
                tags: ['neurology', 'biochemistry']
              },
              comment: null
            },
            {
              _id: 'bookmark3',
              createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1, // 1 day ago
              note: {
                title: 'Pharmacology of Beta Blockers',
                content: 'Beta blockers are medications that block the effects of epinephrine (adrenaline) on beta-adrenergic receptors. They reduce heart rate, decrease blood pressure, and are commonly used to treat hypertension, angina, and certain arrhythmias...',
                tags: ['pharmacology', 'cardiology']
              },
              comment: 'Focus on side effects and contraindications'
            }
          ];
          
          setBookmarks(mockBookmarks);
          setFilteredBookmarks(mockBookmarks);
        } else {
          // For real data, normalize undefined comments to null
          const normalizedBookmarks = getBookmarks.map(bookmark => ({
            ...bookmark,
            comment: bookmark.comment === undefined ? null : bookmark.comment
          }));
          
          setBookmarks(normalizedBookmarks);
          setFilteredBookmarks(normalizedBookmarks);
        }
        
        setIsLoading(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }, [getBookmarks]);
  
    // Filter bookmarks when search query changes
    useEffect(() => {
      if (!bookmarks || bookmarks.length === 0) return;
      
      let filtered = [...bookmarks];
      
      // Apply category filter
      if (selectedCategory !== "All") {
        // This is just mock filtering logic
        if (selectedCategory === "Important") {
          filtered = filtered.filter(bookmark => bookmark.comment);
        }
      }
      
      // Apply search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(bookmark => 
          (bookmark.note?.title?.toLowerCase().includes(query) || 
          bookmark.note?.content?.toLowerCase().includes(query) ||
          bookmark.comment?.toLowerCase().includes(query) ||
          bookmark.note?.tags?.some(tag => tag.toLowerCase().includes(query)))
        );
      }
      
      setFilteredBookmarks(filtered);
    }, [searchQuery, bookmarks, selectedCategory]);
  
    const handleViewBookmark = (bookmark: Bookmark) => {
      setSelectedBookmark(bookmark);
      setShowBookmarkModal(true);
    };
  
    const handleDeleteBookmark = async (id: string) => {
      try {
        // In a real app, this would call the API
        // await deleteBookmark({ id });
        
        // For the demo, we'll filter out the deleted bookmark from state
        setBookmarks(prev => prev.filter(bookmark => bookmark._id !== id));
        setFilteredBookmarks(prev => prev.filter(bookmark => bookmark._id !== id));
        
        toast.success("Bookmark deleted successfully", {
          position: "bottom-right",
          duration: 3000,
        });
        
        setShowBookmarkModal(false);
      } catch (error) {
        console.error("Error deleting bookmark:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to delete bookmark: ${errorMessage}`);
      }
    };
  
    return (
      <div className={`max-w-6xl mx-auto px-4 fade-in ${darkMode ? 'dark-mode' : ''}`}>
        {/* Header with Toggle and Actions */}
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl font-light ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Bookmarks
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
        
        {/* Search and Filters Bar */}
        <div className={`rounded-2xl overflow-hidden transition-all duration-500 shadow-lg mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className={`p-6 space-y-4`}>
            {/* Search input */}
            <div className="flex space-x-3">
              <div className={`relative flex-1 rounded-xl overflow-hidden ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
                
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bookmarks..."
                  className={`w-full py-3 pl-10 pr-10 transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-700 text-white border-0 placeholder:text-gray-500'
                      : 'bg-gray-50 text-gray-900 border-0 placeholder:text-gray-400'
                  } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                />
                
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                      darkMode 
                        ? 'hover:bg-gray-600 text-gray-400'
                        : 'hover:bg-gray-200 text-gray-500'
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <button 
                className={`p-3 rounded-xl ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
            
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                    selectedCategory === category
                      ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                      : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100')
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bookmarks Section */}
        <div className={`mb-12 ${darkMode ? 'text-white' : ''}`}>        
          {isLoading ? (
            <div className={`rounded-2xl p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="animate-pulse space-y-4">
                <div className={`h-6 w-1/4 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`rounded-xl p-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className={`h-5 w-3/4 rounded mb-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      <div className={`h-16 w-full rounded mb-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      <div className="flex space-x-2">
                        <div className={`h-4 w-16 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                        <div className={`h-4 w-16 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : !filteredBookmarks || filteredBookmarks.length === 0 ? (
            <div className={`
              rounded-2xl p-10 text-center transition-all duration-300
              ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white shadow-lg'}
            `}>
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <Bookmark className={`h-10 w-10 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-xl font-light mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {searchQuery ? "No matching bookmarks found" : "No bookmarks yet"}
              </h3>
              <p className={`max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {searchQuery ? `Try a different search term or check your spelling.` : `Start by bookmarking useful content from the Ask tab or your notes.`}
              </p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className={`mt-4 py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center mx-auto ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-light">
                  {searchQuery ? "Search Results" : 
                   selectedCategory !== "All" ? `${selectedCategory} Bookmarks` : 
                   "All Bookmarks"}
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? "s" : ""} found
                </p>
              </div>
              
              <div className={`grid gap-6 ${view === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredBookmarks.map((bookmark) => (
                  <div 
                    key={bookmark._id}
                    onClick={() => handleViewBookmark(bookmark)}
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
                            <h3 className="font-medium line-clamp-1">{bookmark.note?.title || "Untitled"}</h3>
                            <div className="flex space-x-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBookmark(bookmark._id);
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
                              {formatDate(bookmark.createdAt, 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="p-5">
                          <p className={`line-clamp-3 text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {bookmark.note?.content?.substring(0, 150)}...
                          </p>
                          
                          {bookmark.comment && (
                            <div className={`p-3 rounded-lg mb-4 ${
                              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-800'
                            }`}>
                              <div className="flex items-center mb-1">
                                <MessageCircle className={`h-3 w-3 mr-1.5 ${
                                  darkMode ? 'text-gray-400' : 'text-blue-600'
                                }`} />
                                <span className={`text-xs font-medium ${
                                  darkMode ? 'text-gray-400' : 'text-blue-700'
                                }`}>Note</span>
                              </div>
                              <p className="text-xs line-clamp-2">{bookmark.comment}</p>
                            </div>
                          )}
                          
                          {bookmark.note?.tags && bookmark.note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {bookmark.note.tags.map((tag) => (
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
                          <h3 className="font-medium">{bookmark.note?.title || "Untitled"}</h3>
                          <p className={`mt-1 line-clamp-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {bookmark.note?.content?.substring(0, 150)}...
                          </p>
                          
                          {bookmark.comment && (
                            <div className={`p-2 rounded-lg mt-2 mb-2 ${
                              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-800'
                            }`}>
                              <div className="flex items-center">
                                <MessageCircle className={`h-3 w-3 mr-1.5 ${
                                  darkMode ? 'text-gray-400' : 'text-blue-600'
                                }`} />
                                <p className="text-xs line-clamp-1">{bookmark.comment}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center mt-2">
                            <Clock className={`h-3 w-3 mr-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {formatDate(bookmark.createdAt, 'MMM d, yyyy')}
                            </span>
                          </div>
                          
                          {bookmark.note?.tags && bookmark.note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {bookmark.note.tags.map((tag) => (
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
                              handleDeleteBookmark(bookmark._id);
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
            </>
          )}
        </div>
        
        {/* Bookmark Detail Modal */}
        {showBookmarkModal && selectedBookmark && (
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
                    <Bookmark className={`h-5 w-5 ${
                      darkMode ? 'text-blue-400' : 'text-blue-500'
                    }`} />
                  </div>
                  <h2 className={`text-xl font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>{selectedBookmark.note?.title || "Untitled"}</h2>
                </div>
                <button 
                  onClick={() => setShowBookmarkModal(false)}
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
                {selectedBookmark.note?.content?.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
              
              {selectedBookmark.comment && (
                <div className={`mt-8 p-4 rounded-lg ${
                  darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-blue-50 border border-blue-100'
                }`}>
                  <div className="flex items-center mb-2">
                    <MessageCircle className={`h-4 w-4 mr-2 ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-blue-400' : 'text-blue-700'
                    }`}>Your Comment</p>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-blue-700'
                  }`}>{selectedBookmark.comment}</p>
                </div>
              )}
              
              {selectedBookmark.note?.tags && selectedBookmark.note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8">
                  {selectedBookmark.note.tags.map((tag) => (
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
                Bookmarked on {formatDate(selectedBookmark.createdAt, 'MMMM d, yyyy, h:mm a')}
              </div>
            </div>
            
            <div className={`p-6 flex justify-between border-t ${
              darkMode ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <button 
                onClick={() => setShowBookmarkModal(false)}
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
                  onClick={() => {
                    // In a real app, this would copy a link to the bookmark
                    navigator.clipboard.writeText(`bookmark-${selectedBookmark._id}`);
                    toast.success("Link copied to clipboard!");
                  }}
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </button>
                
                <button 
                  onClick={() => handleDeleteBookmark(selectedBookmark._id)}
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
    </div>
  );
  }