import React, { useState, useEffect, useMemo } from "react"; // Added React, useMemo
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  FileText,
  AlertCircle,
  X,
  Upload,
  Brain, // Keep if used for AI status
  Download,
  File as FileIconLucide, // Renamed to avoid conflict with File type
  Search,
  MoreHorizontal,
  Clock,
  Sparkles, // For AI status or empty states
  Trash2,   // For delete action
  Eye,      // For view details
  LayoutGrid,
  ListChecks,
  Loader2,
  Filter as FilterIcon, // For filter button
  ArrowDownUp, // For sort button
  Tag, // For tags
  CheckCircle2, // For AI processed status
  XCircle, // For AI error status
  AlertTriangle,
  FileImage, // For delete confirmation
} from "lucide-react";
import { Button } from "../../components/ui/button"; // Assuming path is correct
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../../components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import LectureUploadWrapper from "../ui/LectureUploadWrapper"; // For upload modal

// Define the File type based on your Convex schema (files table)
interface FileType {
  _id: Id<"files">;
  _creationTime?: number; // Assuming this is standard
  userId: Id<"users">;
  storageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  lectureTitle: string;
  description?: string;
  tags?: string[];
  uploadedAt: number; // Timestamp
  processed: boolean; // General processing
  processingComplete?: boolean;
  processingError?: string;
  openaiFileId?: string;
  openaiProcessed?: boolean; // Specific to OpenAI processing
  // Add any other fields from your schema like 'version', 'lastUpdated' if needed
}

interface FilesListProps {
  userId: Id<"users">;
  darkMode: boolean; // Pass darkMode as a prop
  // onUploadClick: () => void; // Prop to trigger upload modal from parent
}

// Helper function (can be moved to utils.ts if not already there)
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


export function FilesList({ userId, darkMode /*, onUploadClick */ }: FilesListProps) {
  const [allFiles, setAllFiles] = useState<FileType[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortOption, setSortOption] = useState<string>("uploadedAt_desc"); // e.g., 'name_asc', 'size_desc'

  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileType | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);


  const filesQuery = useQuery(api.file.getAll, { userId });
  const deleteFileMutation = useMutation(api.file.deleteFile);


  useEffect(() => {
    if (filesQuery !== undefined) {
      setAllFiles(filesQuery as FileType[]); // Cast if necessary, ensure FileType matches schema
      setIsLoading(false);
    }
  }, [filesQuery]);

  useEffect(() => {
    let tempFiles = [...allFiles];

    // Search
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempFiles = tempFiles.filter(file =>
        file.lectureTitle.toLowerCase().includes(lowerSearchTerm) ||
        file.fileName.toLowerCase().includes(lowerSearchTerm) ||
        file.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Sort
    const [sortBy, sortOrder] = sortOption.split('_');
    tempFiles.sort((a, b) => {
        let comparison = 0;
        const valA = (a as any)[sortBy]; // Use type assertion for dynamic sort key
        const valB = (b as any)[sortBy];

        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            comparison = (valA === valB) ? 0 : (valA ? -1 : 1);
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
    });


    setFilteredFiles(tempFiles);
  }, [allFiles, searchTerm, sortOption]);


  const getFileIcon = (fileName: string, fileType?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeBase = fileType?.split('/')[0];

    if (mimeBase === 'image') return <FileImage className={`h-5 w-5 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />;
    if (mimeBase === 'audio') return <Sparkles className={`h-5 w-5 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />; // Placeholder for audio icon
    if (mimeBase === 'video') return <Sparkles className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;   // Placeholder for video icon

    switch (extension) {
      case 'pdf': return <FileIconLucide className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;
      case 'docx': case 'doc': return <FileIconLucide className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />;
      case 'pptx': case 'ppt': return <FileIconLucide className={`h-5 w-5 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />;
      case 'xlsx': case 'xls': return <FileIconLucide className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />;
      case 'txt': case 'md': return <FileText className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
      default: return <FileIconLucide className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
    }
  };

  const getAIStatusBadge = (file: FileType) => {
    if (file.openaiProcessed) {
      return <Badge variant="default" className={`text-xs rounded-full ${darkMode ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200'}`}><CheckCircle2 className="h-3 w-3 mr-1"/> AI Ready</Badge>;
    }
    if (file.processed && !file.processingComplete && !file.processingError) {
      return <Badge variant="outline" className={`text-xs rounded-full ${darkMode ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20 animate-pulse' : 'bg-yellow-50 text-yellow-600 border-yellow-100 animate-pulse'}`}><Loader2 className="h-3 w-3 mr-1 animate-spin"/> Processing</Badge>;
    }
    if (file.processingError) {
        return <Badge variant="destructive" className={`text-xs rounded-full ${darkMode ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200'}`}><XCircle className="h-3 w-3 mr-1"/> Error</Badge>;
    }
    return <Badge variant="secondary" className={`text-xs rounded-full ${darkMode ? 'bg-neutral-700 text-neutral-400 border-neutral-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>Not Processed</Badge>;
  };

  const handleDownload = (file: FileType) => {
    // This would ideally get a download URL from Convex storage
    // const url = await convex.storage.getUrl(file.storageId);
    // window.open(url, '_blank');
    toast.info(`Download for "${file.lectureTitle}" would start. (Backend needed)`);
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
        // Optimistic update or rely on query refetch
        // setAllFiles(prev => prev.filter(f => f._id !== fileToDelete._id));
    } catch (error) {
        toast.error("Failed to delete file.");
        console.error("Delete file error:", error);
    } finally {
        setShowDeleteModal(false);
        setFileToDelete(null);
    }
  };

  const handleUploadComplete = (data: { title: string }) => {
    toast.success(`File "${data.title}" uploaded. It will appear in the list shortly.`);
    setShowUploadModal(false);
    // filesQuery will refetch automatically
  };


  if (isLoading && filesQuery === undefined) { // Check query too to avoid flash of loading state
    return (
        <div className={`p-6 space-y-4 ${darkMode ? 'text-neutral-300' : 'text-gray-600'}`}>
            <div className="flex justify-between items-center">
                <div className={`h-8 w-48 rounded ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'} animate-pulse`}></div>
                <div className={`h-10 w-32 rounded-lg ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'} animate-pulse`}></div>
            </div>
            <div className={`h-10 w-full rounded-lg ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'} animate-pulse mb-4`}></div>
            {[...Array(5)].map((_, i) => (
            <div key={i} className={`p-4 rounded-lg ${darkMode ? 'bg-neutral-800' : 'bg-white shadow-sm'} animate-pulse flex items-center gap-3`}>
                <div className={`h-8 w-8 rounded-md ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
                <div className="flex-1 space-y-2">
                    <div className={`h-4 w-3/4 rounded ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
                    <div className={`h-3 w-1/2 rounded ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
                </div>
                <div className={`h-6 w-20 rounded-full ${darkMode ? 'bg-neutral-700' : 'bg-gray-300'}`}></div>
            </div>
            ))}
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 space-y-6 ${darkMode ? 'text-neutral-200' : ''}`}>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b_dark:border-neutral-700">
        <div>
            <h2 className={`text-2xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Lecture Materials</h2>
            <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Manage and search your uploaded lecture files.</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className={`rounded-lg shadow-sm ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
          <Upload className="h-4 w-4 mr-2" /> Upload New File
        </Button>
      </div>

      <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          <div className="relative flex-grow w-full sm:w-auto">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
            <Input
              type="search"
              placeholder="Search files by title, name, or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 rounded-lg w-full h-10 ${darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500' : 'bg-white border-gray-300 placeholder:text-gray-400'}`}
            />
          </div>
          {/* Placeholder for more filters and sort */}
          <Button variant="outline" className={`h-10 rounded-lg text-sm ${darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-100'}`} onClick={() => toast.info("Advanced filters coming soon!")}>
            <FilterIcon className="h-4 w-4 mr-2"/> Filters
          </Button>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className={`h-10 rounded-lg px-3 border text-sm ${darkMode ? 'bg-neutral-700 border-neutral-600 text-neutral-200 focus:ring-blue-500 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 focus:ring-blue-500 focus:border-blue-500'}`}
            >
            <option value="uploadedAt_desc">Sort: Newest</option>
            <option value="uploadedAt_asc">Sort: Oldest</option>
            <option value="lectureTitle_asc">Sort: Title (A-Z)</option>
            <option value="lectureTitle_desc">Sort: Title (Z-A)</option>
            <option value="fileSize_desc">Sort: Size (Largest)</option>
            <option value="fileSize_asc">Sort: Size (Smallest)</option>
          </select>
          <div className={`p-0.5 rounded-lg flex ${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-200 border-gray-300'} border`}>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-md h-8 w-8 ${viewMode === 'list' && (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') }`} title="List View"><ListChecks className="h-4 w-4"/></Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`rounded-md h-8 w-8 ${viewMode === 'grid' && (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') }`} title="Grid View"><LayoutGrid className="h-4 w-4"/></Button>
          </div>
        </div>

        {/* Files Display */}
        {isLoading && filesQuery === undefined ? (
             <div className="py-10 text-center"><Loader2 className={`h-8 w-8 mx-auto animate-spin ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`} /> <p className="mt-2">Loading files...</p></div>
        ) : filteredFiles.length === 0 ? (
          <div className={`text-center py-12 rounded-lg ${darkMode ? 'bg-neutral-700/30' : 'bg-gray-50'}`}>
            <FileIconLucide className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-medium ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>
              {searchTerm ? "No files match your search." : "No files uploaded yet."}
            </h3>
            <p className={`mt-1 text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
              {searchTerm ? "Try different keywords or clear the search." : "Upload a file to get started."}
            </p>
            {!searchTerm && <Button onClick={() => setShowUploadModal(true)} className="mt-4"> <Upload className="h-4 w-4 mr-2"/> Upload File</Button>}
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              layout
              className={viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-3"
              }
            >
              {filteredFiles.map((file) => (
                <motion.div
                  layout
                  key={file._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`group relative rounded-xl transition-all duration-200 ease-in-out 
                              ${darkMode ? 'bg-neutral-700/70 border border-neutral-600 hover:border-neutral-500' 
                                        : 'bg-white border border-gray-200 hover:shadow-xl hover:border-gray-300'}
                              ${viewMode === 'grid' ? 'flex flex-col shadow-md' : 'flex items-center p-3 shadow-sm'}`}
                >
                  {/* File Icon and Main Info */}
                  <div className={`flex-shrink-0 p-2 rounded-lg m-2 ${darkMode ? 'bg-neutral-600' : 'bg-gray-100'} ${viewMode === 'grid' ? 'self-start' : ''}`}>
                    {getFileIcon(file.fileName, file.fileType)}
                  </div>
                  <div className="flex-grow overflow-hidden p-2">
                    <h4
                      className={`font-semibold truncate cursor-pointer ${darkMode ? 'text-neutral-100 hover:text-blue-400' : 'text-gray-800 hover:text-blue-600'}`}
                      onClick={() => { setSelectedFile(file); setShowDetailsModal(true); }}
                      title={file.lectureTitle}
                    >
                      {file.lectureTitle}
                    </h4>
                    <p className={`text-xs truncate ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`} title={file.fileName}>{file.fileName}</p>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className={`${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{formatFileSize(file.fileSize)}</span>
                      <span className={`${darkMode ? 'text-neutral-600' : 'text-gray-300'}`}>•</span>
                      <span className={`${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{formatDate(file.uploadedAt, { month:'short', day:'numeric', year:'2-digit' })}</span>
                    </div>
                    <div className="mt-1.5">{getAIStatusBadge(file)}</div>
                    {viewMode === 'grid' && file.tags && file.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 max-h-12 overflow-y-auto custom-scrollbar">
                            {file.tags.map(tag => <Badge key={tag} variant="secondary" className={`text-xs ${darkMode ? 'bg-neutral-600 text-neutral-300' : 'bg-gray-100 text-gray-500'}`}>{tag}</Badge>)}
                        </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className={`flex-shrink-0 ${viewMode === 'list' ? 'ml-2' : 'p-2 border-t_dark:border-neutral-600 w-full flex justify-end gap-1'}`}>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-neutral-600 text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`} onClick={() => handleDownload(file)} title="Download"><Download className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-neutral-600 text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`} onClick={() => { setSelectedFile(file); setShowDetailsModal(true); }} title="View Details"><Eye className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`} onClick={() => handleDeleteRequest(file)} title="Delete File"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
         {allFiles.length > 5 && filteredFiles.length > 5 && ( // Simplified "View All" logic
          <div className="mt-6 text-center">
            <Button variant="outline" className={`rounded-lg ${darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-100'}`} onClick={() => toast.info("Pagination/full list view coming soon!")}>
                Show All {filteredFiles.length} Files
            </Button>
          </div>
        )}
      </div>


        {/* Upload Modal */}
        <AnimatePresence>
        {showUploadModal && (
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogContent className={`sm:max-w-2xl rounded-xl shadow-2xl border-0 p-0 overflow-hidden ${darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white'}`}>
                <DialogHeader className={`p-5 sm:p-6 border-b ${darkMode ? 'border-neutral-700' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/20':'bg-blue-100'}`}> <Upload className={`h-5 w-5 ${darkMode ? 'text-blue-300':'text-blue-600'}`}/></div>
                        <DialogTitle className="text-xl font-semibold">Upload New Lecture Material</DialogTitle>
                    </div>
                </DialogHeader>
                <div className="p-5 sm:p-6">
                    <LectureUploadWrapper userId={userId} onUploadComplete={handleUploadComplete} />
                </div>
            </DialogContent>
          </Dialog>
        )}
        </AnimatePresence>


      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedFile && (
          <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
            <DialogContent className={`max-w-lg rounded-xl shadow-2xl border-0 p-0 overflow-hidden ${darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white'}`}>
              <DialogHeader className={`p-5 sm:p-6 border-b ${darkMode ? 'border-neutral-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-neutral-700':'bg-gray-100'}`}>{getFileIcon(selectedFile.fileName, selectedFile.fileType)}</div>
                    <DialogTitle className="text-xl font-semibold line-clamp-2">{selectedFile.lectureTitle}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="p-5 sm:p-6 space-y-3 text-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
                <p><strong>File Name:</strong> {selectedFile.fileName}</p>
                <p><strong>File Type:</strong> {selectedFile.fileType}</p>
                <p><strong>Size:</strong> {formatFileSize(selectedFile.fileSize)}</p>
                <p><strong>Uploaded:</strong> {formatDate(selectedFile.uploadedAt)}</p>
                <p><strong>AI Status:</strong> {getAIStatusBadge(selectedFile)}</p>
                {selectedFile.description && <p><strong>Description:</strong> {selectedFile.description}</p>}
                {selectedFile.tags && selectedFile.tags.length > 0 && (
                  <div><strong>Tags:</strong> <div className="flex flex-wrap gap-1 mt-1">{selectedFile.tags.map(tag => <Badge key={tag} variant="secondary" className={`${darkMode ? 'bg-neutral-700 text-neutral-300':'bg-gray-100'}`}>{tag}</Badge>)}</div></div>
                )}
              </div>
              <DialogFooter className={`p-4 sm:p-5 border-t flex justify-between items-center ${darkMode ? 'border-neutral-700 bg-neutral-800/70':'border-gray-100 bg-gray-50/70'}`}>
                <Button variant="outline" onClick={() => {setShowDetailsModal(false); handleDeleteRequest(selectedFile);}} className={`rounded-lg ${darkMode ? 'border-red-500/30 text-red-400 hover:bg-red-500/10':'border-red-200 text-red-600 hover:bg-red-50'}`}>
                    <Trash2 className="h-4 w-4 mr-2"/> Delete
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleDownload(selectedFile)} className={`rounded-lg ${darkMode ? 'border-neutral-600 hover:bg-neutral-700':'border-gray-300 hover:bg-gray-100'}`}>Download</Button>
                    <DialogClose asChild><Button className="rounded-lg">Close</Button></DialogClose>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && fileToDelete && (
          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent className={`sm:max-w-md rounded-xl shadow-2xl border-0 p-0 overflow-hidden ${darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white'}`}>
                <div className="p-6 text-center">
                    <div className={`mx-auto w-14 h-14 flex items-center justify-center rounded-full mb-4 ${darkMode ? 'bg-red-500/10':'bg-red-100'}`}>
                        <AlertTriangle className={`h-7 w-7 ${darkMode ? 'text-red-400':'text-red-500'}`} />
                    </div>
                    <DialogTitle className="text-lg font-semibold mb-2">Confirm Deletion</DialogTitle>
                    <DialogDescription className={`mb-5 text-sm ${darkMode ? 'text-neutral-400':'text-gray-500'}`}>
                        Are you sure you want to delete "<strong>{fileToDelete.lectureTitle}</strong>"? This action cannot be undone.
                    </DialogDescription>
                     <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => {setShowDeleteModal(false); setFileToDelete(null);}} className={`rounded-lg w-full ${darkMode ? 'border-neutral-600 hover:bg-neutral-700':'border-gray-300 hover:bg-gray-100'}`}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteFile} className="rounded-lg w-full">Delete File</Button>
                    </div>
                </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

    </div>
  );
}