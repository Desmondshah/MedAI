import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import LectureUploadWrapper from "../ui/LectureUploadWrapper";
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
import { NotesTab } from "./NoteTabs";
import FileSearch from "../ui/FileSearch";
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

// Main AppLayout Component
interface AppLayoutProps {
    userId: Id<"users">;
    }
    
    const AppLayout = ({ userId }: AppLayoutProps) => {
    const [activeTab, setActiveTab] = useState<string>("notes");
    const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
    const [darkMode, setDarkMode] = useState<boolean>(false);
    const [scrolled, setScrolled] = useState<boolean>(false);
    
    // Track scroll position
    useEffect(() => {
      const handleScroll = () => {
        const isScrolled = window.scrollY > 20;
        if (isScrolled !== scrolled) {
          setScrolled(isScrolled);
        }
      };
      
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, [scrolled]);
    
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
    
    const renderActiveTab = () => {
      switch (activeTab) {
        case "notes":
          return <NotesTab userId={userId} />;
        case "search":
          return <FileSearch userId={userId} />;
        case "bookmarks":
          return <BookmarksTab userId={userId} />;
        default:
          return <NotesTab userId={userId} />;
      }
    };
    
    return (
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {/* Header */}
        <header 
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled 
              ? (darkMode ? 'bg-gray-900/90 backdrop-blur-xl shadow-lg' : 'bg-white/90 backdrop-blur-xl shadow-lg') 
              : (darkMode ? 'bg-gray-900' : 'bg-white')
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center">
                <div className={`flex items-center justify-center h-9 w-9 rounded-xl ${darkMode ? 'bg-blue-600' : 'bg-blue-100'} mr-3`}>
                  <BookOpen className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <span className="text-xl font-medium tracking-tight">
                  MedLearn
                </span>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-1">
                <button 
                  onClick={() => setActiveTab("notes")}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    activeTab === "notes" 
                      ? (darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-blue-600') 
                      : (darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}
                >
                  <div className="flex items-center">
                    <PenTool className="h-4 w-4 mr-2" />
                    Notes
                  </div>
                </button>
                
                <button 
                  onClick={() => setActiveTab("search")}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    activeTab === "search" 
                      ? (darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-blue-600') 
                      : (darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}
                >
                  <div className="flex items-center">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </div>
                </button>
                
                <button 
                  onClick={() => setActiveTab("bookmarks")}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    activeTab === "bookmarks" 
                      ? (darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-blue-600') 
                      : (darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}
                >
                  <div className="flex items-center">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Bookmarks
                  </div>
                </button>
              </nav>
              
              {/* User menu and mobile menu toggle */}
              <div className="flex items-center space-x-3">
                {/* Dark mode toggle */}
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-full transition-colors duration-300 ${
                    darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
                
                {/* User profile button */}
                <button 
                  className={`h-9 w-9 rounded-full transition-colors duration-300 overflow-hidden ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  aria-label="User menu"
                >
                  <User className="h-5 w-5 mx-auto" />
                </button>
                
                {/* Mobile menu toggle */}
                <button 
                  onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                  className={`p-2 rounded-md md:hidden transition-colors duration-300 ${
                    darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                  }`}
                  aria-label="Toggle mobile menu"
                >
                  {isMobileNavOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Mobile navigation overlay */}
        {isMobileNavOpen && (
          <div 
            className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className="pt-20 pb-6 px-6">
              <nav className="flex flex-col space-y-2">
                <button 
                  onClick={() => {
                    setActiveTab("notes");
                    setIsMobileNavOpen(false);
                  }}
                  className={`px-4 py-3 rounded-lg transition-all duration-300 ${
                    activeTab === "notes" 
                      ? (darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-blue-600') 
                      : (darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}
                >
                  <div className="flex items-center">
                    <PenTool className="h-5 w-5 mr-3" />
                    Notes
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setActiveTab("search");
                    setIsMobileNavOpen(false);
                  }}
                  className={`px-4 py-3 rounded-lg transition-all duration-300 ${
                    activeTab === "search" 
                      ? (darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-blue-600') 
                      : (darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}
                >
                  <div className="flex items-center">
                    <Search className="h-5 w-5 mr-3" />
                    Search
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setActiveTab("bookmarks");
                    setIsMobileNavOpen(false);
                  }}
                  className={`px-4 py-3 rounded-lg transition-all duration-300 ${
                    activeTab === "bookmarks" 
                      ? (darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-blue-600') 
                      : (darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}
                >
                  <div className="flex items-center">
                    <Bookmark className="h-5 w-5 mr-3" />
                    Bookmarks
                  </div>
                </button>
                
                <div className="my-3 border-t border-gray-200 dark:border-gray-700"></div>
                
                <button 
                  className={`px-4 py-3 rounded-lg transition-all duration-300 ${
                    darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <Settings className="h-5 w-5 mr-3" />
                    Settings
                  </div>
                </button>
                
                <button 
                  className={`px-4 py-3 rounded-lg transition-all duration-300 ${
                    darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-3" />
                    Help & Support
                  </div>
                </button>
                
                <button 
                  className={`px-4 py-3 rounded-lg transition-all duration-300 ${
                    darkMode ? 'text-red-400 hover:text-red-300 hover:bg-gray-800' : 'text-red-600 hover:text-red-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <LogOut className="h-5 w-5 mr-3" />
                    Sign Out
                  </div>
                </button>
              </nav>
            </div>
          </div>
        )}
        
        {/* Main content */}
        <main className="pt-24 pb-16">
          {renderActiveTab()}
        </main>
        
        {/* Mobile Bottom Navigation */}
        <div className={`fixed bottom-0 left-0 right-0 md:hidden z-40 transition-all duration-300 ${
          darkMode ? 'bg-gray-900/90 backdrop-blur-xl border-t border-gray-800' : 'bg-white/90 backdrop-blur-xl border-t border-gray-200'
        } py-2`}>
          <div className="flex justify-around">
            <button 
              onClick={() => setActiveTab("notes")}
              className={`flex flex-col items-center py-2 px-5 rounded-lg transition-colors duration-300 ${
                activeTab === "notes" 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-gray-500' : 'text-gray-500')
              }`}
            >
              <PenTool className="h-5 w-5" />
              <span className="text-xs mt-1">Notes</span>
            </button>
            
            <button 
              onClick={() => setActiveTab("search")}
              className={`flex flex-col items-center py-2 px-5 rounded-lg transition-colors duration-300 ${
                activeTab === "search" 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-gray-500' : 'text-gray-500')
              }`}
            >
              <Search className="h-5 w-5" />
              <span className="text-xs mt-1">Search</span>
            </button>
            
            <button 
              onClick={() => setActiveTab("bookmarks")}
              className={`flex flex-col items-center py-2 px-5 rounded-lg transition-colors duration-300 ${
                activeTab === "bookmarks" 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-gray-500' : 'text-gray-500')
              }`}
            >
              <Bookmark className="h-5 w-5" />
              <span className="text-xs mt-1">Bookmarks</span>
            </button>
          </div>
        </div>
      </div>
    );
    };
    
    // Main App Component
    interface AppProps {
    // Add any app-level props here
    }
    
    export function App({}: AppProps) {
    // In a real app, this would come from auth context
    const userId = "user123" as unknown as Id<"users">;
    
    return (
      <AppLayout userId={userId} />
    );
    }
    
    export default App;