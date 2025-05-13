
import { useQuery } from "convex/react";
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
import { useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";



// FilesList Component to show recent uploads
export function FilesList({ userId, darkMode }: { userId: Id<"users">, darkMode: boolean }) {
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Query all files for this user
    const allFiles = useQuery(api.file.getAll, { userId });
    
    useEffect(() => {
      if (allFiles) {
        setFiles(allFiles);
        setIsLoading(false);
      }
    }, [allFiles]);
  
    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };
    
    const getFileIcon = (fileName: string) => {
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'pdf':
          return <File className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;
        case 'docx':
        case 'doc':
          return <File className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />;
        case 'txt':
        case 'md':
          return <File className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
        default:
          return <File className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
      }
    };
  
    if (isLoading) {
      return (
        <div className="p-6 animate-pulse">
          <div className={`h-6 w-1/3 mb-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center">
                <div className={`h-8 w-8 rounded mr-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <div className="flex-1">
                  <div className={`h-4 w-2/3 rounded mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                  <div className={`h-3 w-1/3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (!files || files.length === 0) {
      return (
        <div className="p-8 text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <File className={`h-8 w-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>No uploads yet</h3>
          <p className={`text-sm max-w-md mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Upload lecture materials to build your collection
          </p>
          <button 
            onClick={() => {/* Placeholder for upload action */}}
            className={`py-2 px-4 rounded-lg transition-all duration-300 inline-flex items-center ${
              darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </button>
        </div>
      );
    }
    
    // Show the most recent 5 files
    const recentFiles = [...files].sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 5);
  
    return (
      <div className="p-4">
        <div className={`overflow-hidden ${
          darkMode ? 'divide-gray-700' : 'divide-gray-100'
        } divide-y`}>
          {recentFiles.map((file) => (
            <div 
              key={file._id} 
              className={`py-3 px-2 flex items-center justify-between transition-colors duration-200 ${
                darkMode 
                  ? 'hover:bg-gray-700/50' 
                  : 'hover:bg-gray-50'
              } cursor-pointer rounded-lg`}
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className={`p-2 rounded mr-3 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  {getFileIcon(file.fileName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {file.lectureTitle || file.fileName}
                  </h4>
                  <div className="flex items-center mt-1">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatFileSize(file.fileSize)}
                    </span>
                    <span className={`mx-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>•</span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                    
                    {file.openaiProcessed && (
                      <>
                        <span className={`mx-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>•</span>
                        <span className={`text-xs flex items-center ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          <Sparkles className="h-3 w-3 mr-1" /> AI Processed
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button 
                className={`p-2 rounded-full ${
                  darkMode 
                    ? 'hover:bg-gray-600 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        
        {files.length > 5 && (
          <div className="mt-3 text-center">
            <button 
              className={`text-sm ${
                darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              View All Files ({files.length})
            </button>
          </div>
        )}
      </div>
    );
  }