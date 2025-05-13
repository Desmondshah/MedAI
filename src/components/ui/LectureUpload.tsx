import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { FileText, Upload, AlertCircle, CheckCircle, File, X, Clock, Sparkles } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { Progress } from "../ui/progress";
import { Switch } from "../ui/switch";

// Define types for our Convex mutations
type GetUploadUrlFn = () => Promise<string>;
type StoreFileMetadataFn = (args: {
  userId: Id<"users">;
  storageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  lectureTitle?: string;
  description?: string;
  tags?: string[];
  useOpenAI?: boolean;
}) => Promise<any>;

interface LectureUploadProps {
  userId: Id<"users">;
  onUploadComplete?: (data: {
    title: string;
    fileName: string;
    fileType: string;
    storageId: string;
    openaiProcessed?: boolean;
  }) => void;
  getUploadUrlFn: GetUploadUrlFn;
  storeFileMetadataFn: StoreFileMetadataFn;
}

export default function LectureUpload({ 
  userId, 
  onUploadComplete,
  getUploadUrlFn,
  storeFileMetadataFn
}: LectureUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [useOpenAI, setUseOpenAI] = useState(true);
  const [storageId, setStorageId] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const supportedTypes = [
    ".pdf", ".docx", ".doc", ".txt", ".md",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown"
  ];
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        // Set default title based on filename without extension
        const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
        setTitle(fileName);
      }
      setError(null);
      setIsComplete(false);
      setStorageId("");
    }
  };
  
  // Handle drag and drop events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Check if file type is supported
      const fileExtension = `.${droppedFile.name.split('.').pop()?.toLowerCase()}`;
      const fileType = droppedFile.type;
      
      if (supportedTypes.includes(fileExtension) || supportedTypes.includes(fileType)) {
        setFile(droppedFile);
        if (!title) {
          // Set default title based on filename without extension
          const fileName = droppedFile.name.split('.').slice(0, -1).join('.');
          setTitle(fileName);
        }
        setError(null);
        setIsComplete(false);
        setStorageId("");
      } else {
        setError(`Unsupported file type. Please upload one of the following: PDF, Word document, or text file.`);
      }
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    
    if (!title.trim()) {
      setError("Please provide a title for the lecture");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Step 1: Get upload URL from Convex
      console.log("Getting upload URL...");
      const uploadUrl = await getUploadUrlFn();
      console.log("Got upload URL:", uploadUrl);
      
      // Step 2: Upload the file to the URL and get the storage ID
      const id = await uploadFileToUrl(file, uploadUrl);
      
      // If we reach this point, the upload was successful
      console.log("Successfully uploaded file to storage with ID:", id);
      
      // Make sure we have a storage ID before proceeding
      if (!id) {
        throw new Error("Failed to get storage ID from file upload");
      }
      
      // Step 3: Save metadata in Convex
      console.log("Storing file metadata with storage ID:", id);
      await storeFileMetadataFn({
        userId,
        storageId: id, // Pass just the string ID, not an object
        fileName: file.name,
        fileType: file.type || getMimeType(file.name),
        fileSize: file.size,
        lectureTitle: title,
        description: description,
        tags: tags,
        useOpenAI: useOpenAI,
      });
      
      setIsUploading(false);
      setUploadProgress(100);
      setIsProcessing(true);
      
      // Simulate processing time
      setTimeout(() => {
        setIsProcessing(false);
        setIsComplete(true);
        
        if (onUploadComplete) {
          onUploadComplete({
            title,
            fileName: file.name,
            fileType: file.type || getMimeType(file.name),
            storageId: id, // Pass just the string ID, not an object
            openaiProcessed: useOpenAI,
          });
        }
      }, 1500);
      
    } catch (err: any) {
      console.error("Upload error:", err);
      setIsUploading(false);
      setIsProcessing(false);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };
  
  // Upload file using XMLHttpRequest to track progress
  const uploadFileToUrl = (file: File, url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      
      // Setup progress tracking
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          console.log(`Upload progress: ${progress}%`);
          setUploadProgress(progress);
        }
      });
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log("Upload complete. Raw response:", xhr.responseText);
          
          // The response contains the storage ID. Parse it if it's JSON, otherwise use directly
          let id = xhr.responseText;
          
          try {
            // Check if the response is JSON
            if (id.startsWith('{')) {
              const parsed = JSON.parse(id);
              if (parsed.storageId) {
                // Extract just the ID string
                id = parsed.storageId;
                console.log("Extracted storage ID from JSON:", id);
              }
            }
          } catch (e) {
            console.warn("Could not parse response as JSON, using raw response");
          }
          
          setStorageId(id);
          resolve(id);
        } else {
          console.error("Upload failed with status:", xhr.status);
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        console.error("Network error during upload");
        reject(new Error("Network error during upload"));
      };
      
      xhr.ontimeout = () => {
        console.error("Upload timed out");
        reject(new Error("Upload timed out"));
      };
      
      xhr.send(file);
    });
  };
  
  // Helper function to get MIME type from filename
  const getMimeType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc':
        return 'application/msword';
      case 'txt':
        return 'text/plain';
      case 'md':
        return 'text/markdown';
      default:
        return 'application/octet-stream';
    }
  };
  
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  // Get file icon based on type
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <File className="h-6 w-6 text-red-500" />;
      case 'docx':
      case 'doc':
        return <File className="h-6 w-6 text-blue-500" />;
      case 'txt':
      case 'md':
        return <File className="h-6 w-6 text-gray-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };
  
  // Cancel upload
  const cancelUpload = () => {
    if (isUploading) {
      // In a real application, you'd abort the XHR request here
      setIsUploading(false);
    }
    setFile(null);
    setUploadProgress(0);
    setIsProcessing(false);
    setIsComplete(false);
    setError(null);
    setStorageId("");
  };
  
  return (
    <Card className="overflow-hidden bg-white shadow-sm border border-gray-100 rounded-xl">
      <CardContent className="p-6 space-y-5">
        <div 
          className={`flex flex-col items-center justify-center border-2 ${isDragging ? 'border-blue-300 bg-blue-50' : 'border-dashed border-gray-200'} rounded-xl p-8 transition-colors hover:border-blue-200 hover:bg-gray-50`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={supportedTypes.join(",")}
            className="hidden"
          />
          
          {file ? (
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                {getFileIcon(file.name)}
              </div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mb-3">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={triggerFileSelect}
                  disabled={isUploading || isProcessing}
                  className="hover-lift"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Change File
                </Button>
                {!isComplete && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={cancelUpload}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 hover-lift"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-3 animate-pulse">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <p className="font-medium text-gray-900 mb-1">Drop your file here or</p>
              <Button 
                variant="premium"
                onClick={triggerFileSelect}
                className="mt-2 hover-lift"
              >
                Browse Files
              </Button>
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: PDF, DOCX, DOC, TXT, MD
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="lecture-title" className="block text-sm font-medium text-gray-700">
            Lecture Title
          </label>
          <Input
            id="lecture-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for this lecture"
            className="input-premium"
            disabled={isUploading || isProcessing || isComplete}
          />
        </div>
        
        {/* New OpenAI Processing option */}
        <div className="flex items-center justify-between p-3 border border-blue-100 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <div className="p-1.5 mr-2 rounded-full bg-blue-100">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">AI Processing</p>
              <p className="text-xs text-blue-600">Enable AI search and insights for this lecture</p>
            </div>
          </div>
          <Switch 
            checked={useOpenAI} 
            onCheckedChange={setUseOpenAI}
            disabled={isUploading || isProcessing || isComplete}
          />
        </div>
        
        {error && (
          <div className="flex items-center p-3 text-sm bg-red-50 text-red-600 rounded-md border border-red-100">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {isUploading && (
          <div className="space-y-2 bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between text-sm">
              <div className="flex items-center text-gray-700">
                <Upload className="h-4 w-4 mr-2 text-blue-500" />
                <span>Uploading...</span>
              </div>
              <span className="font-medium text-gray-900">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} showValue={false} size="lg" animate={true} />
          </div>
        )}
        
        {isProcessing && (
          <div className="flex items-center p-3 text-sm bg-blue-50 text-blue-600 rounded-md">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {useOpenAI ? 
              "Processing your lecture with AI..." : 
              "Processing your lecture..."}
          </div>
        )}
        
        {isComplete && (
          <div className="flex items-center p-3 text-sm bg-green-50 text-green-600 rounded-md">
            <CheckCircle className="h-4 w-4 mr-2" />
            Lecture uploaded and processed successfully!
            {useOpenAI && " It's now searchable with AI."}
          </div>
        )}
        
        <div className="flex justify-end space-x-3 pt-2">
          {!isComplete ? (
            <>
              <Button
                variant="outline"
                onClick={cancelUpload}
                disabled={!file || isUploading || isProcessing}
                className="hover-lift"
              >
                Cancel
              </Button>
              <Button
                variant="premium"
                onClick={handleUpload}
                disabled={!file || isUploading || isProcessing || isComplete || !title.trim()}
                isLoading={isUploading || isProcessing}
                className="hover-lift"
              >
                {isUploading ? "Uploading..." : isProcessing ? "Processing..." : "Upload Lecture"}
              </Button>
            </>
          ) : (
            <Button
              variant="premium"
              onClick={() => {
                setFile(null);
                setTitle("");
                setIsComplete(false);
                setStorageId("");
              }}
              className="hover-lift"
            >
              Upload Another
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}