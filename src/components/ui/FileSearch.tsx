import React, { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { 
  AlertCircle, 
  Search, 
  File, 
  Download, 
  Sparkles, 
  Info, 
  CheckCircle, 
  RefreshCw,
  Clock, 
  Sun, 
  Moon, 
  SlidersHorizontal,
  X,
  Upload,
  FileText
} from "lucide-react";
import { Progress } from "../ui/progress";
import { toast } from "sonner";

interface FileSearchProps {
  userId: Id<"users">;
}

interface FilterSettings {
  fileTypes: string[];
  dateRange: string;
  category: string;
}

export default function FileSearch({ userId }: FileSearchProps) {
  // Core search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // File selection state
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<string, any>>({});
  const [isCheckingFiles, setIsCheckingFiles] = useState(false);
  
  // UI and filter state
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedFilters, setSelectedFilters] = useState<FilterSettings>({
    fileTypes: [],
    dateRange: 'all',
    category: 'all'
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'medical ethics', 'cardiovascular system', 'neurology'
  ]);
  
  // API connections
  const openaiFiles = useQuery(api.file.getOpenAIFiles, { userId });
  const searchFileContent = useAction(api.openai.searchFileContent);
  const checkFileStatus = useAction(api.openai.checkFileStatus);
  
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
  
  // Reset selected files when available files change
  useEffect(() => {
    if (openaiFiles && openaiFiles.length > 0) {
      // By default, select all files for search
      setSelectedFiles(openaiFiles.map(file => file.openaiFileId).filter(Boolean) as string[]);
      
      // Check status of all files
      checkAllFileStatuses(openaiFiles.map(file => file.openaiFileId).filter(Boolean) as string[]);
    } else {
      setSelectedFiles([]);
    }
  }, [openaiFiles]);
  
  const checkAllFileStatuses = async (fileIds: string[]) => {
    if (!fileIds.length) return;
    
    setIsCheckingFiles(true);
    const statuses: Record<string, any> = {};
    
    for (const fileId of fileIds) {
      try {
        const status = await checkFileStatus({ fileId });
        statuses[fileId] = status;
      } catch (error) {
        console.error(`Error checking status for file ${fileId}:`, error);
        statuses[fileId] = { error: true, message: String(error) };
      }
    }
    
    setFileStatuses(statuses);
    setIsCheckingFiles(false);
  };
  
  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
    }
  };
  
  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || selectedFiles.length === 0) {
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
      
      // Add to recent searches if not already there
      if (!recentSearches.includes(searchQuery.trim())) {
        setRecentSearches(prev => [searchQuery.trim(), ...prev.slice(0, 4)]);
      }
    } catch (error: any) {
      console.error("Error searching file content:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };
  
  // Toggle filter
  const toggleFilter = (type: string, value: string) => {
    setSelectedFilters(prev => {
      if (type === 'fileTypes') {
        if (prev.fileTypes.includes(value)) {
          return {
            ...prev,
            fileTypes: prev.fileTypes.filter(v => v !== value)
          };
        } else {
          return {
            ...prev,
            fileTypes: [...prev.fileTypes, value]
          };
        }
      } else {
        return {
          ...prev,
          [type]: value
        };
      }
    });
  };
  
  // Get file status label and color
  const getFileStatusInfo = (fileId: string) => {
    const status = fileStatuses[fileId];
    
    if (!status) {
      return { 
        label: "Unknown", 
        color: darkMode ? "text-gray-400" : "text-gray-500", 
        bgColor: darkMode ? "bg-gray-700" : "bg-gray-100" 
      };
    }
    
    if (status.error) {
      return { 
        label: "Error", 
        color: darkMode ? "text-red-400" : "text-red-600", 
        bgColor: darkMode ? "bg-red-900/20" : "bg-red-100" 
      };
    }
    
    switch (status.status) {
      case "processed":
        return { 
          label: "Ready", 
          color: darkMode ? "text-green-400" : "text-green-600", 
          bgColor: darkMode ? "bg-green-900/20" : "bg-green-100" 
        };
      case "processing":
        return { 
          label: "Processing", 
          color: darkMode ? "text-amber-400" : "text-amber-600", 
          bgColor: darkMode ? "bg-amber-900/20" : "bg-amber-100" 
        };
      case "error":
        return { 
          label: "Error", 
          color: darkMode ? "text-red-400" : "text-red-600", 
          bgColor: darkMode ? "bg-red-900/20" : "bg-red-100" 
        };
      default:
        return { 
          label: status.status, 
          color: darkMode ? "text-blue-400" : "text-blue-600", 
          bgColor: darkMode ? "bg-blue-900/20" : "bg-blue-100" 
        };
    }
  };
  
  return (
    <div className={`max-w-6xl mx-auto px-4 fade-in ${darkMode ? 'dark-mode' : ''}`}>
      {/* Header with Title and Dark Mode */}
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-3xl font-light ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Lecture Search
        </h1>
        
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
      
      {/* Search area */}
      <div className={`rounded-2xl overflow-hidden transition-all duration-500 shadow-lg mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <div className={`p-6 flex justify-between items-center border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center">
            <div className={`p-2 mr-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <Sparkles className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                AI Lecture Search
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Search through your lecture files using AI
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors duration-300`}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Search input */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ask about your lecture content..."
                className={`w-full py-3 pl-12 pr-12 transition-all duration-300 rounded-xl ${
                  darkMode 
                    ? 'bg-gray-700 text-white border-0 placeholder:text-gray-500'
                    : 'bg-gray-50 text-gray-900 border-0 placeholder:text-gray-400'
                } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
              
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className={`absolute right-16 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                    darkMode 
                      ? 'hover:bg-gray-600 text-gray-400'
                      : 'hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim() || selectedFiles.length === 0}
              className={`py-3 px-5 rounded-lg transition-all duration-300 flex items-center ${
                !searchQuery.trim() || isSearching || selectedFiles.length === 0
                  ? (darkMode ? 'bg-gray-700 text-gray-500 opacity-50' : 'bg-gray-200 text-gray-400 opacity-50')
                  : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
              }`}
            >
              {isSearching ? (
                <div className="loader flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-white mr-1 animate-pulse"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white mr-1 animate-pulse delay-150"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse delay-300"></div>
                </div>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Lectures
                </>
              )}
            </Button>
          </div>
          
          {/* Filters section - collapsible */}
          {showFilters && (
            <div className={`p-4 rounded-xl transition-all duration-300 animate-in zoom-in-95 ${
              darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className="flex flex-wrap gap-4">
                {/* File types */}
                <div className="space-y-2">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    File Types
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['PDF', 'DOCX', 'PPT', 'Notes'].map(type => (
                      <button
                        key={type}
                        onClick={() => toggleFilter('fileTypes', type)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-all duration-300 ${
                          selectedFilters.fileTypes.includes(type)
                            ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                            : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white' : 'bg-white text-gray-700 hover:bg-gray-100')
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Date range */}
                <div className="space-y-2">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Date Range
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All Time' },
                      { key: 'week', label: 'Past Week' },
                      { key: 'month', label: 'Past Month' },
                      { key: 'year', label: 'Past Year' }
                    ].map(range => (
                      <button
                        key={range.key}
                        onClick={() => toggleFilter('dateRange', range.key)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-all duration-300 ${
                          selectedFilters.dateRange === range.key
                            ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                            : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white' : 'bg-white text-gray-700 hover:bg-gray-100')
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* File Selection Area */}
          {openaiFiles && openaiFiles.length > 0 ? (
            <div className={`rounded-xl p-4 border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Search in these files ({selectedFiles.length}/{openaiFiles.length} selected):
                </h3>
                <Button 
                  variant={darkMode ? "outline" : "outline"}
                  size="sm" 
                  onClick={() => checkAllFileStatuses(openaiFiles.map(file => file.openaiFileId).filter(Boolean) as string[])}
                  disabled={isCheckingFiles}
                  className={`h-8 ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isCheckingFiles ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {openaiFiles.map((file) => {
                  const fileId = file.openaiFileId;
                  if (!fileId) return null;
                  
                  const statusInfo = getFileStatusInfo(fileId);
                  
                  return (
                    <div 
                      key={file._id} 
                      className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all ${
                        fileId && selectedFiles.includes(fileId)
                          ? (darkMode ? 'border-blue-600 bg-blue-900/20' : 'border-blue-200 bg-blue-50 shadow-sm')
                          : (darkMode ? 'border-gray-700 bg-gray-800 hover:border-blue-500 hover:bg-blue-900/10' : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50')
                      }`}
                      onClick={() => fileId && toggleFileSelection(fileId)}
                    >
                      <div className={`p-2 rounded-md mr-3 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                        <File className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                      </div>
                      <div className="flex-1 truncate">
                        <p className={`font-medium text-sm truncate ${darkMode ? 'text-white' : ''}`}>{file.lectureTitle}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>{file.fileName}</p>
                        <div className="flex items-center mt-1">
                          <span className={`inline-block h-2 w-2 rounded-full ${statusInfo.bgColor} mr-1.5`}></span>
                          <span className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                      </div>
                      {fileId && selectedFiles.includes(fileId) && (
                        <div className={`h-5 w-5 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center ml-2`}>
                          <CheckCircle className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Info box about file processing */}
              <div className={`mt-4 p-3 rounded-lg text-sm flex items-start ${
                darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-700'
              }`}>
                <Info className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${
                  darkMode ? 'text-blue-400' : 'text-blue-500'
                }`} />
                <p>
                  Files may take a few minutes to be fully processed by AI. If your search doesn't return expected results, 
                  check file status or try again later. Only files with "Ready" status can be searched reliably.
                </p>
              </div>
            </div>
          ) : (
            <div className={`text-center py-6 space-y-3 border rounded-xl ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-white shadow-sm'
              }`}>
                <File className={`h-8 w-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>No AI-processed files yet</p>
                <p className={`text-sm max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Upload lecture files with AI processing enabled to search through them.
                </p>
              </div>
              <Button 
                variant={darkMode ? "outline" : "outline"} 
                className={`mt-2 ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
              >
                Upload Lecture
              </Button>
            </div>
          )}
          
          {/* Recent searches */}
          {recentSearches.length > 0 && !searchResults && !isSearching && (
            <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Recent Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(term);
                      handleSearch();
                    }}
                    className={`flex items-center px-3 py-1.5 rounded-full text-sm transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md ${
                      darkMode 
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    <Clock className="h-3 w-3 mr-2" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className={`flex items-center p-3 text-sm rounded-md border ${
              darkMode ? 'bg-red-900/20 text-red-400 border-red-900/50' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              <AlertCircle className={`h-4 w-4 mr-2 flex-shrink-0 ${
                darkMode ? 'text-red-400' : 'text-red-600'
              }`} />
              <span>{error}</span>
            </div>
          )}
          
          {/* Loading state */}
          {isSearching && (
            <div className="p-8 text-center">
              <div className="relative mx-auto mb-4">
                <div className={`h-12 w-12 rounded-full border-4 animate-spin ${
                  darkMode ? 'border-gray-700 border-t-blue-400' : 'border-blue-200 border-t-blue-600'
                }`}></div>
                <Sparkles className={`h-6 w-6 ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                } absolute top-3 left-3`} />
              </div>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Searching lecture content with AI...</p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                This may take up to 2 minutes for larger files
              </p>
              <Progress 
                value={65} 
                className="mt-4 max-w-md mx-auto" 
                animate={true} 
                variant={darkMode ? "info" : "default"}
              />
            </div>
          )}
          
          {/* Search results */}
          {searchResults && (
            <div className={`p-6 rounded-xl shadow-sm ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-secondary'
            }`}>
              <div className="flex items-center mb-4">
                <div className={`p-1.5 mr-2 rounded-full ${
                  darkMode ? 'bg-gray-700' : 'bg-white'
                }`}>
                  <Sparkles className={`h-5 w-5 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                </div>
                <h3 className={`font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>Search Results</h3>
              </div>
              
              <div className={`prose max-w-none ${
                darkMode ? 'text-gray-300 prose-headings:text-white prose-a:text-blue-400' : 'text-gray-700 prose-blue'
              }`}>
                {searchResults.results.map((result: any, index: number) => (
                  <div key={index} className="mb-4">
                    {result.content.map((content: any, i: number) => (
                      <div key={i}>
                        {content.type === 'text' && (
                          <p>{content.text.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  variant={darkMode ? "outline" : "outline"} 
                  className={`hover-lift ${
                    darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''
                  }`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save Results
                </Button>
              </div>
            </div>
          )}
          
          {/* Empty state - show only when not searching and no results */}
          {!searchResults && !isSearching && openaiFiles && openaiFiles.length > 0 && (
            <div className={`
              rounded-xl p-6 text-center transition-all duration-300 mt-4
              ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50/50 border border-gray-100'}
            `}>
              <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Ready to search
              </h3>
              <p className={`max-w-md mx-auto mb-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Enter your question above to search through your lecture content
              </p>
            </div>
          )}
        </div>
        
        <div className={`p-4 text-sm border-t ${
          darkMode ? 'text-gray-500 border-gray-700' : 'text-gray-500 border-gray-100'
        }`}>
          <p>AI search uses the content from your uploaded lecture files to provide answers</p>
        </div>
      </div>
    </div>
  );
}
