import React, { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "./card";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { FileText, Upload, CheckCircle, Clock, Info, AlertCircle, ChevronDown, ChevronUp, Tag, X, Sparkles } from "lucide-react";
import LectureUpload from "../ui/LectureUpload";

interface LectureUploadWrapperProps {
  userId: Id<"users">;
  onUploadComplete: (data: {
    title: string;
    fileName: string;
    fileType: string;
    storageId: string;
    openaiProcessed?: boolean;
  }) => void;
}

export default function LectureUploadWrapper({ 
  userId, 
  onUploadComplete 
}: LectureUploadWrapperProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  // Get function references from Convex
  const generateUploadUrl = useMutation(api.file.generateUploadUrl);
  const saveFileRecord = useMutation(api.file.saveFileRecord);
  
  const handleAddTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput("");
  };
  
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  const handleUploadComplete = (data: {
    title: string;
    fileName: string;
    fileType: string;
    storageId: string;
    openaiProcessed?: boolean;
  }) => {
    // Add additional metadata
    const enhancedData = {
      ...data,
      description,
      tags
    };
    
    // Call the parent's onUploadComplete with the enhanced data
    onUploadComplete(enhancedData);
    
    // Reset the form
    setDescription("");
    setTags([]);
    setTagInput("");
    setShowAdvanced(false);
  };
  
  return (
    <Card className="overflow-hidden bg-white shadow-sm border border-gray-100 rounded-xl">
      <CardHeader className="pb-0">
        <div className="flex items-center mb-1">
          <div className="p-1.5 mr-3 rounded-lg bg-blue-50">
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <CardTitle className="text-xl text-gray-900">Upload Lecture Material</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Upload study materials like lecture notes, slides, or textbook chapters
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <LectureUpload 
          userId={userId} 
          onUploadComplete={handleUploadComplete}
          getUploadUrlFn={generateUploadUrl}
          storeFileMetadataFn={async (args) => {
            // Make sure lectureTitle is required and not undefined
            if (!args.lectureTitle) {
              throw new Error("Lecture title is required");
            }
            
            // Add description and tags to the file metadata
            const enhancedArgs = {
              ...args,
              lectureTitle: args.lectureTitle,  // Explicitly pass lectureTitle
              description: description || undefined,
              tags: tags.length > 0 ? tags : undefined,
            };
            
            return await saveFileRecord(enhancedArgs);
          }}
        />
        
        <div className="mt-6 border-t border-gray-100 pt-4">
          <button
            type="button"
            className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {showAdvanced ? "Hide" : "Show"} Advanced Options
          </button>
          
          {showAdvanced && (
            <div className="mt-4 space-y-4 animate-fadeDown">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add additional context or notes about this lecture"
                  className="min-h-24"
                  variant="premium"
                  autoExpand
                />
              </div>
              
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (Optional)
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Tag className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add tags like 'anatomy', 'cardiology'"
                      className="pl-9"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    variant="outline"
                  >
                    Add
                  </Button>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((tag) => (
                      <div 
                        key={tag} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group hover:bg-blue-200 transition-colors"
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-1 text-blue-600 hover:text-blue-800 invisible group-hover:visible"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 flex items-start">
                <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <p>
                  Adding a description and tags will make it easier to find and organize
                  your lecture materials later. Tags can also help AI analyze and connect
                  related content.
                </p>
              </div>
              
              <div className="bg-gradient-secondary p-4 rounded-md border border-blue-100">
                <div className="flex items-start">
                  <div className="p-1.5 bg-white rounded-full mr-3 shadow-sm">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">AI Search & Analysis</h4>
                    <p className="text-sm text-gray-700">
                      Your lecture will be processed with AI, allowing you to:
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
                      <li className="flex items-center">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1.5" />
                        Search through lecture content with natural language
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1.5" />
                        Get AI-generated summaries and key points
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1.5" />
                        Ask questions about specific concepts in your lectures
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 border-t border-gray-100 text-xs text-gray-500 py-3">
        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          <span>Uploaded files are processed with AI to enable smart search and summarization</span>
        </div>
      </CardFooter>
    </Card>
  );
}