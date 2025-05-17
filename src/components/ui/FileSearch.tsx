import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api"; // Adjusted path assuming FileSearch is in ui
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "./button"; // Relative path from ui folder
import { Input } from "./input";   // Relative path
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "./card"; // Relative path
import { 
  AlertCircle, 
  Search, 
  File as FileIconLucide, // Renamed from File
  Download, 
  Sparkles, 
  Info, 
  CheckCircle as CheckCircleIcon, // Renamed from CheckCircle
  RefreshCw,
  Clock, 
  Sun, 
  Moon, 
  SlidersHorizontal,
  X,
  Upload,
  FileText,
  LayoutGrid,
  ListChecks,
  Loader2,
  Filter as FilterIcon,
  ArrowDownUp,
  Tag,
  XCircle,
  AlertTriangle,
  FileImage,
  Palette, // Added for theme switching
  Eye,
  Trash2,
} from "lucide-react";
import { Progress } from "./progress"; // Relative path
import { toast } from "sonner";
import { Badge } from "./badge"; // Relative path
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./dialog"; // Relative path
import { motion, AnimatePresence } from "framer-motion";
// Assuming LectureUploadWrapper might be used in a modal here, adjust path if different
// import LectureUploadWrapper from "./LectureUploadWrapper"; 

interface FileSearchProps {
  userId: Id<"users">;
}

interface FileType { // This should match your Convex schema for 'files'
  _id: Id<"files">;
  _creationTime?: number;
  userId: Id<"users">;
  storageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  lectureTitle: string;
  description?: string;
  tags?: string[];
  uploadedAt: number;
  processed: boolean;
  processingComplete?: boolean;
  processingError?: string;
  openaiFileId?: string;
  openaiProcessed?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (timestamp: number | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (timestamp === undefined) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    };
    return new Date(timestamp).toLocaleDateString(undefined, options || defaultOptions);
};


export default function FileSearch({ userId }: FileSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null); // Consider defining a type for results
  const [error, setError] = useState<string | null>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<string, any>>({});
  const [isCheckingFiles, setIsCheckingFiles] = useState(false);
  
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false); // Notebook theme state
  
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // For file display
  const [sortOption, setSortOption] = useState<string>("uploadedAt_desc");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentSelectedFile, setCurrentSelectedFile] = useState<FileType | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileType | null>(null);
  
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'medical ethics', 'cardiovascular system', 'neurology'
  ]);
  
  const openaiFilesQuery = useQuery(api.file.getOpenAIFiles, { userId }); // Renamed to avoid conflict
  const allFilesQuery = useQuery(api.file.getAll, {userId}); // Fetch all files for display
  
  const searchFileContent = useAction(api.openai.searchFileContent);
  const checkFileStatus = useAction(api.openai.checkFileStatus);
  const deleteFileMutation = useMutation(api.file.deleteFile); // For deleting files

  const [displayFiles, setDisplayFiles] = useState<FileType[]>([]);


  useEffect(() => {
    if (darkMode && !useNotebookTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, useNotebookTheme]);
  
  useEffect(() => {
    const filesToUse = allFilesQuery || [];
    if (filesToUse.length > 0 && openaiFilesQuery && openaiFilesQuery.length > 0 && selectedFiles.length === 0) {
        // Auto-select OpenAI-processed files for search by default if no selection yet
        const openAIFileIds = openaiFilesQuery.map(file => file.openaiFileId).filter(Boolean) as string[];
        setSelectedFiles(openAIFileIds);
        checkAllFileStatuses(openAIFileIds);
    }
    
    // Filter and sort all files for display
    let tempFiles = [...(allFilesQuery || [])] as FileType[];
    if (searchQuery && !isSearching) { // Only filter display files if not actively searching (to avoid race conditions)
        const lowerSearch = searchQuery.toLowerCase();
        tempFiles = tempFiles.filter(f => f.lectureTitle.toLowerCase().includes(lowerSearch) || f.fileName.toLowerCase().includes(lowerSearch));
    }
    // Add sorting logic based on sortOption
    const [sortBy, sortOrder] = sortOption.split('_');
    tempFiles.sort((a, b) => {
        let valA = (a as any)[sortBy];
        let valB = (b as any)[sortBy];
        if (sortBy === 'uploadedAt') { // Ensure timestamp comparison
            valA = a.uploadedAt;
            valB = b.uploadedAt;
        }
        if (typeof valA === 'string' && typeof valB === 'string') return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        if (typeof valA === 'number' && typeof valB === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
        return 0;
    });

    setDisplayFiles(tempFiles);

  }, [allFilesQuery, openaiFilesQuery, searchQuery, sortOption]); // Added selectedFiles to dependencies if it should trigger status checks

  const checkAllFileStatuses = async (fileIds: string[]) => {
    if (!fileIds.length) return;
    setIsCheckingFiles(true);
    const statuses: Record<string, any> = {};
    for (const fileId of fileIds) {
      try {
        const status = await checkFileStatus({ fileId });
        statuses[fileId] = status;
      } catch (error) {
        statuses[fileId] = { error: true, message: String(error) };
      }
    }
    setFileStatuses(statuses);
    setIsCheckingFiles(false);
  };
  
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
        toast.error("Please enter a search query.");
        return;
    }
    if (selectedFiles.length === 0) {
        toast.error("Please select at least one file to search within.");
        // Fallback: if no files are selected, maybe search all available openAI files?
        // const allOpenAIFileIds = openaiFilesQuery?.map(f => f.openaiFileId).filter(Boolean) as string[];
        // if(allOpenAIFileIds && allOpenAIFileIds.length > 0) {
        //   setSelectedFiles(allOpenAIFileIds);
        // } else {
        //   toast.error("No AI-processed files available to search.");
        //   return;
        // }
        return;
    }
    
    setIsSearching(true);
    setError(null);
    setSearchResults(null);
    
    try {
      const results = await searchFileContent({
        query: searchQuery.trim(),
        fileIds: selectedFiles,
      });
      setSearchResults(results);
      if (!recentSearches.includes(searchQuery.trim())) {
        setRecentSearches(prev => [searchQuery.trim(), ...prev.slice(0, 4)]);
      }
    } catch (error: any) {
      setError(error instanceof Error ? error.message : "An unknown error occurred during search.");
      toast.error("Search failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setError(null);
  };

  const getFileIcon = (fileName: string, fileType?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeBase = fileType?.split('/')[0];
    const iconClass = useNotebookTheme ? 'h-5 w-5 text-amber-700' : (darkMode ? 'h-5 w-5 text-blue-400' : 'h-5 w-5 text-blue-500');

    if (mimeBase === 'image') return <FileImage className={iconClass} />;
    switch (extension) {
      case 'pdf': return <FileIconLucide className={`${iconClass} ${useNotebookTheme ? '!text-red-600' : (darkMode ? '!text-red-400' : '!text-red-500')}`} />;
      case 'docx': case 'doc': return <FileIconLucide className={`${iconClass} ${useNotebookTheme ? '!text-blue-700' : (darkMode ? '!text-blue-300' : '!text-blue-600')}`} />;
      case 'pptx': case 'ppt': return <FileIconLucide className={`${iconClass} ${useNotebookTheme ? '!text-orange-600' : (darkMode ? '!text-orange-400' : '!text-orange-500')}`} />;
      default: return <FileText className={iconClass} />;
    }
  };

  const getAIStatusBadge = (file: FileType) => {
    const baseClass = "text-xs rounded-full file-status-badge-notebook"; // Base for notebook theme
    if (file.openaiProcessed && fileStatuses[file.openaiFileId!]?.status === 'processed') {
      return <Badge className={`${baseClass} ready`}><CheckCircleIcon className="h-3 w-3 mr-1"/> AI Ready</Badge>;
    }
    if (file.openaiFileId && fileStatuses[file.openaiFileId!]?.status === 'processing') {
      return <Badge className={`${baseClass} processing`}><Loader2 className="h-3 w-3 mr-1 animate-spin"/> Processing</Badge>;
    }
    if (file.openaiFileId && fileStatuses[file.openaiFileId!]?.error) {
        return <Badge className={`${baseClass} error-badge`}><XCircle className="h-3 w-3 mr-1"/> Error</Badge>;
    }
    if (file.processingError) { // General processing error
      return <Badge className={`${baseClass} error-badge`}><XCircle className="h-3 w-3 mr-1"/> Error</Badge>;
    }
    return <Badge className={`${baseClass} unknown`}><Clock className="h-3 w-3 mr-1"/> Pending AI</Badge>;
  };

  const handleDeleteRequest = (file: FileType) => {
    setFileToDelete(file);
    setShowDeleteModal(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
        await deleteFileMutation({ fileId: fileToDelete._id });
        toast.success(`File "${fileToDelete.lectureTitle}" deleted successfully.`);
        // Relies on Convex query auto-update
    } catch (error) {
        toast.error("Failed to delete file.");
    } finally {
        setShowDeleteModal(false);
        setFileToDelete(null);
        if(currentSelectedFile?._id === fileToDelete._id) setCurrentSelectedFile(null);
    }
  };
  
  const rootThemeClass = useNotebookTheme ? 'notebook-theme' : (darkMode ? 'dark' : '');

  return (
    <div className={`max-w-6xl mx-auto px-4 filesearch-page-container ${rootThemeClass}`}>
      <div className={`flex justify-between items-center gap-4 ${useNotebookTheme ? 'filesearch-header-bar' : 'mb-6'}`}>
        <h1 className={`text-3xl font-light flex items-center ${useNotebookTheme ? 'filesearch-title' : (darkMode ? 'text-white' : 'text-gray-900')}`}>
          <Search className={`h-7 w-7 mr-3 ${useNotebookTheme ? 'text-amber-700' : ''}`} />
          Lecture Search
        </h1>
        <div className={`flex items-center gap-2 ${useNotebookTheme ? 'filesearch-header-controls' : ''}`}>
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full notetab-header-button ${useNotebookTheme ? (useNotebookTheme && 'active-theme-button') : ''} ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
            onClick={() => setUseNotebookTheme(!useNotebookTheme)}
            title={useNotebookTheme ? "Switch to Original Theme" : "Switch to Notebook Theme"}
          >
            <Palette className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full notetab-header-button ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
            onClick={() => {
                if (!useNotebookTheme) setDarkMode(!darkMode);
                else toast.info("Dark mode not applicable to Notebook theme.", {duration: 2000});
            }}
            title={useNotebookTheme ? "Notebook theme active" : "Toggle Dark/Light Mode"}
          >
            {darkMode && !useNotebookTheme ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      <div className={`rounded-2xl overflow-hidden transition-all duration-300 shadow-lg mb-8 filesearch-main-card ${useNotebookTheme ? '' : (darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white')}`}>
        <div className={`p-6 flex justify-between items-center border-b filesearch-card-header ${useNotebookTheme ? '' : (darkMode ? 'border-gray-700' : 'border-gray-100')}`}>
          <div className="flex items-center">
            <div className={`p-2 mr-3 rounded-lg ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-gray-700' : 'bg-blue-50')}`}>
              <Sparkles className={`h-5 w-5 ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-blue-400' : 'text-blue-500')}`} />
            </div>
            <div>
              <h2 className={`text-xl font-medium ${useNotebookTheme ? '' : (darkMode ? 'text-white' : 'text-gray-900')}`}>
                AI Lecture Search
              </h2>
              <p className={`text-sm ${useNotebookTheme ? '' : (darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                Search through your AI-processed lecture files
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className={`flex flex-col md:flex-row gap-4 filesearch-input-group`}>
            <div className="relative flex-1">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 search-icon-absolute ${
                useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-gray-500' : 'text-gray-400')
              }`} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ask about your lecture content..."
                className={`w-full py-3 pl-12 pr-12 transition-all duration-300 rounded-xl 
                           ${useNotebookTheme ? '' : (darkMode 
                              ? 'bg-gray-700 text-white border-0 placeholder:text-gray-500'
                              : 'bg-gray-50 text-gray-900 border-0 placeholder:text-gray-400')} 
                           focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className={`absolute right-16 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                    useNotebookTheme ? 'text-amber-700 hover:bg-amber-100' : (darkMode 
                      ? 'hover:bg-gray-600 text-gray-400'
                      : 'hover:bg-gray-200 text-gray-500')
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim() || selectedFiles.length === 0}
              className={`py-3 px-5 rounded-lg transition-all duration-300 flex items-center filesearch-action-button
                          ${(!searchQuery.trim() || isSearching || selectedFiles.length === 0) && (useNotebookTheme ? 'opacity-60 cursor-not-allowed' : (darkMode ? 'bg-gray-700 text-gray-500 opacity-50' : 'bg-gray-200 text-gray-400 opacity-50'))}
                        `}
            >
              {isSearching ? (
                <div className="loader flex items-center">
                  <div className={`h-1.5 w-1.5 rounded-full mr-1 animate-pulse ${useNotebookTheme ? 'bg-amber-800' : 'bg-white'}`}></div>
                  <div className={`h-1.5 w-1.5 rounded-full mr-1 animate-pulse delay-150 ${useNotebookTheme ? 'bg-amber-800' : 'bg-white'}`}></div>
                  <div className={`h-1.5 w-1.5 rounded-full animate-pulse delay-300 ${useNotebookTheme ? 'bg-amber-800' : 'bg-white'}`}></div>
                </div>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Lectures
                </>
              )}
            </Button>
          </div>
          
          {/* File Selection Area */}
          {openaiFilesQuery && openaiFilesQuery.length > 0 ? (
            <div className={`rounded-xl p-4 border filesearch-filter-section ${useNotebookTheme ? '' : (darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50')}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-sm font-medium filter-label ${useNotebookTheme ? '' : (darkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                  Search in these AI-ready files ({selectedFiles.length}/{openaiFilesQuery.filter(f => f.openaiFileId && f.openaiProcessed).length} selected):
                </h3>
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={() => checkAllFileStatuses(openaiFilesQuery.map(file => file.openaiFileId).filter(Boolean) as string[])}
                  disabled={isCheckingFiles}
                  className={`h-8 filesearch-action-button !bg-opacity-20 hover:!bg-opacity-30 ${useNotebookTheme ? '' : (darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : '')}`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isCheckingFiles ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
              </div>
              
              <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 ${viewMode === 'grid' ? '' : 'space-y-2'}`}>
                {openaiFilesQuery.filter(f => f.openaiFileId && f.openaiProcessed).map((file) => {
                  const fileId = file.openaiFileId!;
                  const isSelected = selectedFiles.includes(fileId);
                  return (
                    <div 
                      key={file._id} 
                      className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all file-item-notebook ${viewMode === 'grid' ? 'file-item-grid' : 'file-item-list'}
                                  ${isSelected
                                    ? (useNotebookTheme ? 'border-amber-500 bg-amber-50 shadow-amber-500/10' : (darkMode ? 'border-blue-600 bg-blue-900/20' : 'border-blue-200 bg-blue-50 shadow-sm'))
                                    : (useNotebookTheme ? 'hover:border-amber-400 hover:bg-amber-50/50' : (darkMode ? 'border-gray-700 bg-gray-800 hover:border-blue-500 hover:bg-blue-900/10' : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'))
                                  }`}
                      onClick={() => toggleFileSelection(fileId)}
                    >
                      <div className={`p-2 rounded-md mr-3 file-icon-area ${useNotebookTheme ? '' : (darkMode ? 'bg-gray-700' : 'bg-white')}`}>
                        {getFileIcon(file.fileName, file.fileType)}
                      </div>
                      <div className="flex-1 truncate">
                        <p className={`font-medium text-sm truncate file-title ${useNotebookTheme ? '' : (darkMode ? 'text-white' : '')}`}>{file.lectureTitle}</p>
                        <p className={`text-xs file-meta-text ${useNotebookTheme ? '' : (darkMode ? 'text-gray-400' : 'text-gray-500')} truncate`}>{file.fileName}</p>
                        <div className="flex items-center mt-1">
                          {getAIStatusBadge(file)}
                        </div>
                      </div>
                      {isSelected && (
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ml-2 ${useNotebookTheme ? 'bg-amber-500' : (darkMode ? 'bg-blue-600' : 'bg-blue-500')}`}>
                          <CheckCircleIcon className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`text-center py-6 space-y-3 border rounded-xl filesearch-empty-state ${useNotebookTheme ? '' : (darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100')}`}>
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-gray-700' : 'bg-white shadow-sm')}`}>
                <FileIconLucide className={`h-8 w-8 ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`} />
              </div>
              <div>
                <h3 className={`font-medium ${useNotebookTheme ? '' : (darkMode ? 'text-white' : 'text-gray-700')}`}>No AI-processed files available</h3>
                <p className={`text-sm max-w-md mx-auto ${useNotebookTheme ? '' : (darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                  Upload lecture files and enable AI processing to search them.
                </p>
              </div>
            </div>
          )}
          
          {error && (
            <div className={`flex items-center p-3 text-sm rounded-md border ${useNotebookTheme ? 'bg-red-100 text-red-700 border-red-200' : (darkMode ? 'bg-red-900/20 text-red-400 border-red-900/50' : 'bg-red-50 text-red-600 border-red-100')}`}>
              <AlertCircle className={`h-4 w-4 mr-2 flex-shrink-0 ${useNotebookTheme ? 'text-red-600' : (darkMode ? 'text-red-400' : 'text-red-600')}`} />
              <span>{error}</span>
            </div>
          )}
          
          {isSearching && (
            <div className={`p-8 text-center filesearch-loading-state ${useNotebookTheme ? '' : ''}`}>
              <div className="relative mx-auto mb-4">
                <div className={`h-12 w-12 rounded-full border-4 animate-spin ${useNotebookTheme ? 'border-amber-200 border-t-amber-600' : (darkMode ? 'border-gray-700 border-t-blue-400' : 'border-blue-200 border-t-blue-600')}`}></div>
                <Sparkles className={`h-6 w-6 absolute top-3 left-3 ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-blue-400' : 'text-blue-600')}`} />
              </div>
              <p className={`${useNotebookTheme ? '' : (darkMode ? 'text-gray-300' : 'text-gray-600')}`}>Searching lecture content with AI...</p>
            </div>
          )}
          
          {searchResults && (
            <div className={`p-6 rounded-xl shadow-sm filesearch-results-area ${useNotebookTheme ? '' : (darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-secondary')}`}>
              <div className="flex items-center mb-4">
                <div className={`p-1.5 mr-2 rounded-full ${useNotebookTheme ? 'bg-amber-100' : (darkMode ? 'bg-gray-700' : 'bg-white')}`}>
                  <Sparkles className={`h-5 w-5 ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-blue-400' : 'text-blue-600')}`} />
                </div>
                <h3 className={`font-semibold ${useNotebookTheme ? '' : (darkMode ? 'text-white' : 'text-gray-900')}`}>Search Results</h3>
              </div>
              <div className={`prose max-w-none ${useNotebookTheme ? '' : (darkMode ? 'text-gray-300 prose-headings:text-white prose-a:text-blue-400' : 'text-gray-700 prose-blue')}`}>
                {searchResults.results.map((result: any, index: number) => (
                  <div key={index} className="mb-4">
                    {result.content.map((content: any, i: number) => (
                      <div key={i}>
                        {content.type === 'text' && (<p>{content.text.value}</p>)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
