import { useState, useRef, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
// Update your imports at the top of the file
import { 
    Brain, 
    Send, 
    FileText, 
    BookOpen, 
    Bookmark, 
    X, 
    ThumbsUp, 
    ThumbsDown,
    Sparkles,
    Mic,
    Link2,
    PenLine,
    Copy,
    MessageSquare,
    ScanLine,
    Zap,
    MoreHorizontal,
    Save,
    Lightbulb,
    ChevronRight,
    Trash2,
    Plus,
    CheckCircle,
    Menu,
    Search,
    Moon,
    Sun,
    Settings,
    User,
    ArrowLeft,
    ChevronDown,
    Command,
    FileImage  // Add this import
  } from "lucide-react";
import { 
  Card, 
  CardContent 
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Avatar } from "../../components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "../../components/ui/dialog";

interface UserAwareProps {
  userId: Id<"users">;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    status?: "sending" | "sent" | "seen" | "error";
    thinking?: boolean;
    isPinned?: boolean;
    feedback?: "like" | "dislike" | null;
    references?: { text: string; url: string }[];
    imageUrl?: string | null; // Added for image support
  }

interface QuickPrompt {
  id: string;
  text: string;
  icon: React.ReactNode;
}

export function AskTab({ userId }: UserAwareProps) {
  // State
  const [inputValue, setInputValue] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome-message",
      role: "assistant",
      content: "Hi, I'm Dorathy, your medical AI assistant. How can I help you today?",
      timestamp: new Date(),
      status: "seen"
    }
  ]);

const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [messageToSave, setMessageToSave] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [currentSection, setCurrentSection] = useState<"chat" | "saved" | "topics">("chat");
  const [pinnedMessages, setPinnedMessages] = useState<string[]>([]);
  const [showContextPanel, setShowContextPanel] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [conversationContext, setConversationContext] = useState<string[]>([
    "User is a medical student preparing for USMLE Step 1",
    "Focus on explaining concepts clearly with examples",
    "Include relevant research when available"

  ]);
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // API connections
  const askQuestion = useAction(api.ai.askQuestion);
const askQuestionWithImage = useAction(api.ai.askQuestionWithImage); // Add this
const generateFlashcards = useAction(api.ai.generateFlashcards);
  const createNote = useMutation(api.notes.create);
  const createBookmark = useMutation(api.bookmarks.create);
  const createFlashcardBatch = useMutation(api.flashcards.createBatch);

  // Quick prompts
  const quickPrompts: QuickPrompt[] = [
    { id: "explain", text: "Explain the pathophysiology of...", icon: <Brain className="h-4 w-4" /> },
    { id: "differential", text: "What's the differential diagnosis for...", icon: <ScanLine className="h-4 w-4" /> },
    { id: "treatment", text: "What's the first-line treatment for...", icon: <Zap className="h-4 w-4" /> },
    { id: "board-prep", text: "Key points for USMLE about...", icon: <BookOpen className="h-4 w-4" /> },
  ];

  // Recent topics
  const recentTopics = [
    "Cardiac physiology", 
    "Respiratory pathology", 
    "Neurotransmitters", 
    "Pharmacokinetics",
    "Immunology"
  ];

  // Effects
  useEffect(() => {
    if (inputRef.current && !isListening) {
      inputRef.current.focus();
    }
    
    if (isLoading) {
      setIsThinking(true);
      const timer = setTimeout(() => setIsThinking(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isListening]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    // Update document body class for dark mode
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Handlers
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  // Add a file upload handler
const handleFileUpload = (file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      toast.error("Please upload an image file");
    }
  };
  
  // Add a function to clear the image
  const clearImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
  };
  
  // Replace the two handleSubmit functions with this single one:

const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Generate a unique ID for this message
    const messageId = Date.now().toString();
    
    // Add user message to chat with "sending" status
    setChatHistory(prev => [...prev, { 
      id: messageId,
      role: "user", 
      content: inputValue.trim(),
      timestamp: new Date(),
      status: "sending",
      imageUrl: imagePreviewUrl
    }]);
    
    const userQuestion = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    
    try {
        // Update status to "sent"
        setChatHistory(prev => 
          prev.map(msg => 
            msg.id === messageId ? { ...msg, status: "sent" } : msg
          )
        );
      
        // Simulate thinking time (this could be actual AI processing visualization)
        setIsThinking(true);
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsThinking(false);
        
        let response: any; // Use 'any' to accommodate different response types
        
        // Use the appropriate function based on whether an image is present
        if (selectedImage && imagePreviewUrl) {
          // Use askQuestionWithImage for image analysis
          response = await askQuestionWithImage({ 
            question: userQuestion,
            imageUrl: imagePreviewUrl
          });
          
          // Clear the image after sending
          clearImage();
        } else {
          // Regular text question
          response = await askQuestion({ question: userQuestion });
        }
        
        if (response) {
          // Type-safe check for object response
          const hasStructuredResponse = response !== null && typeof response === 'object';
          
          // Make sure answerContent is always a string
          const answerContent = hasStructuredResponse && 'answer' in response 
            ? String(response.answer)
            : String(response);
          
          // Get citations if available and format them to match ChatMessage.references type
          const references = hasStructuredResponse && 'citations' in response && 
            Array.isArray(response.citations) 
            ? response.citations.map((c: any) => ({
                // Map to the expected "text" and "url" format from ChatMessage interface
                text: c.title || "Medical Reference",
                // Ensure we have a valid PubMed URL
                url: c.url && c.url !== "#" ? c.url : `https://pubmed.ncbi.nlm.nih.gov/${c.index || ''}/`
              }))
            : undefined;
          
          // Add AI response to chat with properly formatted references
          setChatHistory(prev => [...prev, { 
            id: `response-${messageId}`,
            role: "assistant", 
            content: answerContent,
            timestamp: new Date(),
            references: references
          }]);
        } else {
          toast.error("No response received. Please try again.");
        }

    } catch (error: unknown) {
      console.error("Error asking question:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Update status to "error"
      setChatHistory(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, status: "error" } : msg
        )
      );
      
      toast.error(`Failed to get answer: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto resize textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleListen = () => {
    setIsListening(!isListening);
    setInputMode(inputMode === "text" ? "voice" : "text");
    
    // In a real app, this would use the Web Speech API
    if (!isListening) {
      toast.info("Listening... (speech recognition would be implemented here)");
    } else {
      toast.success("Voice input captured!");
      setInputValue(inputValue + " (voice input simulation)");
    }
  };

  const handleTogglePin = (messageId: string) => {
    if (pinnedMessages.includes(messageId)) {
      setPinnedMessages(pinnedMessages.filter(id => id !== messageId));
      toast.success("Message unpinned");
    } else {
      setPinnedMessages([...pinnedMessages, messageId]);
      toast.success("Message pinned for easy reference");
    }
    setActiveMessage(null);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
    setActiveMessage(null);
  };

  const handleFeedback = (messageId: string, feedback: "like" | "dislike") => {
    setChatHistory(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
    toast.success(`Thank you for your ${feedback === "like" ? "positive" : "negative"} feedback!`);
    setActiveMessage(null);
  };

  const handleGenerateFlashcards = async (messageId: string) => {
    const message = chatHistory.find(msg => msg.id === messageId);
    if (!message || message.role !== "assistant") return;
    
    setIsLoading(true);
    
    try {
      // Get the previous user question if available
      const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
      const prevQuestion = messageIndex > 0 && chatHistory[messageIndex - 1].role === "user" 
        ? chatHistory[messageIndex - 1].content 
        : "Medical Concept";
      
      toast.info("Generating flashcards...");
      
      // Extract a title from the first sentence or use a default
      const title = prevQuestion.split('.')[0].trim() || "Medical Concept";
      
      const flashcards = await generateFlashcards({ 
        topic: title,
        content: message.content
      });
      
      if (flashcards && Array.isArray(flashcards) && flashcards.length > 0) {
        // Save flashcards to the database
        await createFlashcardBatch({ 
          userId,
          cards: flashcards.map(card => ({
            front: card.front,
            back: card.back,
            category: title
          }))
        });
        
        toast.success(`${flashcards.length} flashcards created successfully!`);
        
        // Show confirmation in chat
        setChatHistory(prev => [...prev, { 
          id: `system-${Date.now()}`,
          role: "assistant", 
          content: `✅ I've created ${flashcards.length} flashcards about "${title}". You can access them in the Flashcards tab.`,
          timestamp: new Date()
        }]);
      } else {
        toast.error("No flashcards could be generated from this content.");
      }
    } catch (error: unknown) {
      console.error("Error generating flashcards:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to generate flashcards: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setActiveMessage(null);
    }
  };

  const handleSaveNote = (messageId: string) => {
    const message = chatHistory.find(msg => msg.id === messageId);
    if (!message) return;
    
    setMessageToSave(messageId);
    
    // Get the previous user question if available
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    const prevQuestion = messageIndex > 0 && chatHistory[messageIndex - 1].role === "user" 
      ? chatHistory[messageIndex - 1].content 
      : "Dorathy Response";
    
    setNoteTitle(prevQuestion.substring(0, 50));
    setShowSaveDialog(true);
    setActiveMessage(null);
  };

  const confirmSaveNote = async () => {
    if (!noteTitle.trim() || !messageToSave) return;
    
    const message = chatHistory.find(msg => msg.id === messageToSave);
    if (!message) return;
    
    try {
      const noteId = await createNote({
        userId,
        title: noteTitle,
        content: message.content,
        tags: ["ai-answer"]
      });
      
      toast.success("Saved to notes successfully!");
      
      // Show confirmation in chat
      setChatHistory(prev => [...prev, { 
        id: `system-${Date.now()}`,
        role: "assistant", 
        content: `✅ I've saved this response to your notes as "${noteTitle}".`,
        timestamp: new Date()
      }]);
      
      setShowSaveDialog(false);
      setMessageToSave(null);
    } catch (error: unknown) {
      console.error("Error saving note:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to save note: ${errorMessage}`);
    }
  };

  const clearChat = () => {
    setChatHistory([{
      id: "welcome-message-new",
      role: "assistant",
      content: "I've cleared our conversation. How can I help you today?",
      timestamp: new Date(),
      status: "seen"
    }]);
    setPinnedMessages([]);
    toast.success("Chat history cleared");
  };

  const renderMessageActions = (message: ChatMessage) => {
    if (message.role !== "assistant") return null;
    
    const isPinned = pinnedMessages.includes(message.id);
    
    return (
      <div className="message-actions">
        {activeMessage === message.id ? (
          <div 
            className={`flex items-center gap-1 ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-100'} p-1 rounded-full shadow-lg border transition-all duration-300 animate-in zoom-in-95`}
          >
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-blue-900/20 hover:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-600'} transition-all duration-200`}
              onClick={() => handleSaveNote(message.id)}
              title="Save to Notes"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-blue-900/20 hover:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-600'} transition-all duration-200`}
              onClick={() => handleGenerateFlashcards(message.id)}
              disabled={isLoading}
              title="Generate Flashcards"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-blue-900/20 hover:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-600'} transition-all duration-200`}
              onClick={() => handleCopyMessage(message.content)}
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-8 w-8 rounded-full ${
                isPinned 
                  ? darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
                  : darkMode ? 'hover:bg-blue-900/20 hover:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-600'
              } transition-all duration-200`}
              onClick={() => handleTogglePin(message.id)}
              title={isPinned ? "Unpin" : "Pin"}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            <div className={`w-px h-5 ${darkMode ? 'bg-neutral-700' : 'bg-gray-200'} mx-1`}></div>
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-green-900/20 hover:text-green-400' : 'hover:bg-green-50 hover:text-green-600'} transition-all duration-200`}
              onClick={() => handleFeedback(message.id, "like")}
              title="Helpful"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-red-900/20 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-600'} transition-all duration-200`}
              onClick={() => handleFeedback(message.id, "dislike")}
              title="Not Helpful"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-8 w-8 rounded-full ${darkMode ? 'hover:bg-neutral-700' : 'hover:bg-gray-100'} transition-all duration-200`}
              onClick={() => setActiveMessage(null)}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {isPinned && (
              <Badge variant="outline" className={`${darkMode ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-800/30 border-blue-800' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'} transition-all duration-200`}>
                <Bookmark className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
            {message.feedback === "like" && (
              <Badge variant="outline" className={`${darkMode ? 'bg-green-900/20 text-green-400 hover:bg-green-800/30 border-green-800' : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'} transition-all duration-200`}>
                <ThumbsUp className="h-3 w-3 mr-1" />
                Helpful
              </Badge>
            )}
            {message.feedback === "dislike" && (
              <Badge variant="outline" className={`${darkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-800/30 border-red-800' : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'} transition-all duration-200`}>
                <ThumbsDown className="h-3 w-3 mr-1" />
                Not Helpful
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              className={`h-7 px-2 py-1 rounded-full ${darkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'} transition-all duration-200`}
              onClick={() => setActiveMessage(message.id)}
            >
              <MoreHorizontal className="h-4 w-4 mr-1" />
              <span className="text-xs">Actions</span>
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderMessageStatus = (message: ChatMessage) => {
    if (message.role !== "user") return null;
    
    switch (message.status) {
      case "sending":
        return (
          <div className={`${darkMode ? 'text-neutral-500' : 'text-gray-400'} text-xs flex items-center mt-1 transition-colors duration-300`}>
            <div className="animate-pulse h-2 w-2 bg-current rounded-full mr-1"></div>
            Sending...
          </div>
        );
      case "sent":
        return (
          <div className={`${darkMode ? 'text-neutral-500' : 'text-gray-400'} text-xs flex items-center mt-1 transition-colors duration-300`}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </div>
        );
      case "seen":
        return (
          <div className="text-blue-500 text-xs flex items-center mt-1">
            <CheckCircle className="h-3 w-3 mr-1 text-blue-500" />
            Seen
          </div>
        );
      case "error":
        return (
          <div className="text-red-500 text-xs flex items-center mt-1">
            <X className="h-3 w-3 mr-1" />
            Error - Tap to retry
          </div>
        );
      default:
        return null;
    }
  };

  // Main layout components
  const renderHeader = () => (
    <div className={`w-full px-6 py-3 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} border-b backdrop-blur-xl z-10 transition-colors duration-300 flex justify-between items-center`}>
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon"
          className={`lg:hidden h-9 w-9 mr-3 ${darkMode ? 'text-white hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100'} rounded-full transition-colors duration-200`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center">
          <div className={`h-8 w-8 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-blue-600'} flex items-center justify-center mr-3 transition-colors duration-300`}>
            <Brain className="h-4 w-4 text-white" />
          </div>
          <h1 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>Dorathy</h1>
          <Badge className={`ml-2 ${darkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-100 text-gray-700'} transition-colors duration-300`}>Medical AI</Badge>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          className={`h-9 w-9 ${darkMode ? 'text-white hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100'} rounded-full transition-colors duration-200`}
          onClick={() => setShowContextPanel(!showContextPanel)}
        >
          <Settings className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className={`h-9 w-9 ${darkMode ? 'text-white hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100'} rounded-full transition-colors duration-200`}
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <div className={`h-9 w-9 rounded-full ${darkMode ? 'bg-neutral-700' : 'bg-gray-200'} flex items-center justify-center transition-colors duration-300`}>
          <User className="h-5 w-5 text-gray-500" />
        </div>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <div 
      className={`${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed lg:relative top-0 left-0 h-full w-64 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} border-r z-50 lg:z-0 transition-all duration-300 ease-in-out`}
    >
      <div className="h-full flex flex-col">
        {/* Sidebar Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-neutral-800' : 'border-gray-200'} flex items-center justify-between transition-colors duration-300`}>
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-blue-600'} flex items-center justify-center transition-colors duration-300`}>
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>MedAssist</h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className={`lg:hidden h-8 w-8 ${darkMode ? 'text-white hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100'} rounded-full transition-colors duration-200`}
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <Button
            variant={currentSection === "chat" ? "default" : "ghost"}
            className={`w-full justify-start text-sm ${
              currentSection === "chat" 
                ? "" 
                : darkMode ? "text-neutral-300 hover:text-white hover:bg-neutral-800" : "text-gray-700 hover:bg-gray-100"
            } rounded-lg py-2 px-3 transition-all duration-200`}
            onClick={() => {
              setCurrentSection("chat");
              setMenuOpen(false);
            }}
          >
            <MessageSquare className="h-4 w-4 mr-3" />
            Conversation
          </Button>
          <Button
            variant={currentSection === "saved" ? "default" : "ghost"}
            className={`w-full justify-start text-sm ${
              currentSection === "saved" 
                ? "" 
                : darkMode ? "text-neutral-300 hover:text-white hover:bg-neutral-800" : "text-gray-700 hover:bg-gray-100"
            } rounded-lg py-2 px-3 transition-all duration-200`}
            onClick={() => {
              setCurrentSection("saved");
              setMenuOpen(false);
            }}
          >
            <Bookmark className="h-4 w-4 mr-3" />
            Saved Messages
            {pinnedMessages.length > 0 && (
              <Badge className={`ml-auto ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'} transition-colors duration-300`}>
                {pinnedMessages.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={currentSection === "topics" ? "default" : "ghost"}
            className={`w-full justify-start text-sm ${
              currentSection === "topics" 
                ? "" 
                : darkMode ? "text-neutral-300 hover:text-white hover:bg-neutral-800" : "text-gray-700 hover:bg-gray-100"
            } rounded-lg py-2 px-3 transition-all duration-200`}
            onClick={() => {
              setCurrentSection("topics");
              setMenuOpen(false);
            }}
          >
            <BookOpen className="h-4 w-4 mr-3" />
            Topics
          </Button>
          <div className={`py-2 my-2 border-t ${darkMode ? 'border-neutral-800' : 'border-gray-200'} transition-colors duration-300`}></div>
          <h3 className={`px-3 py-1 text-xs font-semibold ${darkMode ? 'text-neutral-500' : 'text-gray-500'} uppercase tracking-wider transition-colors duration-300`}>
            Recent Topics
          </h3>
          {recentTopics.slice(0, 3).map((topic, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`w-full justify-start text-sm ${darkMode ? "text-neutral-300 hover:text-white hover:bg-neutral-800" : "text-gray-700 hover:bg-gray-100"} rounded-lg py-2 px-3 transition-all duration-200`}
              onClick={() => {
                setInputValue(`Tell me about ${topic}`);
                setCurrentSection("chat");
                setMenuOpen(false);
              }}
            >
              <BookOpen className="h-4 w-4 mr-3 text-blue-500" />
              {topic}
            </Button>
          ))}
        </nav>
        
        {/* Footer */}
        <div className={`p-3 border-t ${darkMode ? 'border-neutral-800' : 'border-gray-200'} transition-colors duration-300`}>
          <Button
            variant="outline"
            className={`w-full justify-start text-sm ${darkMode ? "border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800" : "border-gray-200 text-gray-700 hover:bg-gray-100"} rounded-lg py-2 px-3 transition-all duration-200`}
            onClick={clearChat}
          >
            <Trash2 className="h-4 w-4 mr-3" />
            Clear conversation
          </Button>
        </div>
      </div>
    </div>
  );

  // Render sections
  const renderChatSection = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Message History */}
      <div 
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto py-6 px-4 md:px-8 space-y-6 custom-scrollbar ${darkMode ? 'bg-neutral-950' : 'bg-gray-50'} transition-colors duration-300`}
      >
        {chatHistory.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} fade-in-up`}>
            <div className={`max-w-[85%] md:max-w-[75%] group ${message.isPinned ? "pinned-message" : ""}`}>
              {/* Message Bubble */}
              <div 
                className={`px-4 py-3 rounded-2xl shadow-sm message-bubble transition-all duration-300 ${
                  message.role === "user" 
                    ? `${darkMode ? "bg-blue-600" : "bg-gradient-to-br from-blue-500 to-blue-600"} text-white ml-auto` 
                    : `${darkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border border-gray-100"} ${darkMode ? "text-white" : "text-gray-800"}`
                }`}
              >
                {message.thinking ? (
                  <div className="flex items-center h-10">
                    <div className="loader space-x-1 flex">
                      <div className={`h-2 w-2 ${darkMode ? "bg-blue-400" : "bg-blue-200"} rounded-full animate-bounce transition-colors duration-300`}></div>
                      <div className={`h-2 w-2 ${darkMode ? "bg-blue-500" : "bg-blue-400"} rounded-full animate-bounce animation-delay-100 transition-colors duration-300`}></div>
                      <div className={`h-2 w-2 ${darkMode ? "bg-blue-600" : "bg-blue-600"} rounded-full animate-bounce animation-delay-200 transition-colors duration-300`}></div>
                    </div>
                    <span className={`ml-3 ${darkMode ? "text-neutral-400" : "text-gray-500"} transition-colors duration-300`}>Thinking about your question...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {message.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} className={`mb-2 last:mb-0 ${darkMode ? "text-neutral-200" : "text-gray-800"} transition-colors duration-300`}>{paragraph}</p>
                    ))}
                    
                    {message.references && message.references.length > 0 && (
                      <div className={`mt-3 pt-3 border-t ${darkMode ? "border-neutral-700 text-neutral-400" : "border-gray-100 text-gray-500"} text-xs transition-colors duration-300`}>
                        <div className="font-medium mb-1">References:</div>
                        <ul className="space-y-1">
                          {message.references.map((ref, i) => (
                            <li key={i} className="flex items-center">
                              <Link2 className="h-3 w-3 mr-1 text-blue-500" />
                              <a href={ref.url} className={`${darkMode ? "text-blue-400" : "text-blue-600"} hover:underline transition-colors duration-300`}>{ref.text}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Message Actions */}
              <div className="mt-1">
                {renderMessageActions(message)}
                {renderMessageStatus(message)}
              </div>
            </div>
          </div>
        ))}
        
        {/* Enhanced AI Processing Visualization */}
        {isThinking && (
          <div className="flex justify-start fade-in-up">
            <div 
              className={`px-6 py-4 rounded-2xl shadow-sm ${
                darkMode 
                  ? "bg-neutral-800 border-neutral-700" 
                  : "bg-white border border-gray-100"
              } transition-colors duration-300 flex items-center`}
            >
              <div className={`relative mr-4 h-10 w-10 rounded-full ${
                darkMode ? "bg-blue-900/30" : "bg-blue-100"
              } flex items-center justify-center overflow-hidden transition-colors duration-300`}>
                {/* Brain pulse animation */}
                <Brain className="h-5 w-5 text-blue-500 z-10 relative" />
                <div className={`absolute inset-0 ${
                  darkMode ? "bg-blue-500/10" : "bg-blue-200/50"
                } rounded-full animate-ping opacity-75`}></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 animate-pulse"></div>
              </div>
              <div>
                <div className={`font-medium mb-1 ${
                  darkMode ? "text-neutral-200" : "text-gray-800"
                } transition-colors duration-300`}>
                  Dorathy is thinking...
                </div>
                <div className={`text-sm ${
                  darkMode ? "text-neutral-400" : "text-gray-600"
                } transition-colors duration-300`}>
                  Processing your question and retrieving relevant medical information
                </div>
                <div className="mt-2 w-full h-1.5 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden transition-colors duration-300">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-progress-indeterminate"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className={`p-4 border-t ${darkMode ? 'border-neutral-800 bg-neutral-900' : 'border-gray-100 bg-white'} transition-colors duration-300`}>
        {showSuggestions && (
          <div className="mb-4 animate-in slide-in-right">
            <p className={`text-sm font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-700'} mb-2 transition-colors duration-300`}>Quick prompts:</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt.id}
                  variant="outline"
                  size="sm"
                  className={`rounded-full ${
                    darkMode 
                      ? 'bg-neutral-800 border-neutral-700 hover:border-blue-500 hover:bg-blue-900/20 text-neutral-300' 
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                  } transition-all duration-200`}
                  onClick={() => setInputValue(prompt.text)}
                >
                  <div className="mr-1.5 text-blue-500">{prompt.icon}</div>
                  <span className="truncate">{prompt.text.length > 25 ? prompt.text.substring(0, 25) + '...' : prompt.text}</span>
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full border-dashed ${
                  darkMode 
                    ? 'bg-neutral-800 border-neutral-700 hover:border-blue-500 hover:bg-blue-900/20 text-neutral-300' 
                    : 'bg-white border-gray-300 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                } transition-all duration-200`}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                <span>Add custom</span>
              </Button>
            </div>
          </div>
        )}
        
        {/* Chat Input */}
        <div className="relative">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={inputMode === "text" ? 
                  "Ask about symptoms, treatments, or medical concepts..." : 
                  "Listening... (tap microphone when done)"
                }
                className={`min-h-[52px] max-h-[200px] p-3 pr-12 rounded-2xl ${
                  darkMode 
                    ? 'bg-neutral-800 border-neutral-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder:text-neutral-500' 
                    : 'bg-white border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder:text-gray-400'
                } shadow-sm resize-none transition-all duration-200 ${
                  inputMode === "voice" ? `${darkMode ? "text-blue-400" : "text-blue-600"} font-medium` : ""
                }`}
                disabled={inputMode === "voice" || isLoading}
              />
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`absolute right-3 bottom-2.5 h-8 w-8 rounded-full ${
                  isListening 
                    ? "text-red-500 bg-red-50 animate-pulse" 
                    : darkMode 
                      ? "text-neutral-400 hover:text-blue-400 hover:bg-blue-900/20" 
                      : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                } transition-all duration-200`}
                onClick={handleToggleListen}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-2">
  <label 
    htmlFor="image-upload" 
    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer ${
      darkMode 
        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300' 
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
    } transition-all duration-200`}
  >
    <FileImage className="h-4 w-4" />
    <span className="text-sm">Upload image</span>
  </label>
  <input
    id="image-upload"
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
      }
    }}
  />
  
  {imagePreviewUrl && (
    <div className="relative">
      <img 
        src={imagePreviewUrl} 
        alt="Preview" 
        className="h-10 w-10 object-cover rounded-md"
      />
      <button
        onClick={clearImage}
        className={`absolute -top-1 -right-1 h-4 w-4 rounded-full ${
          darkMode ? 'bg-neutral-700' : 'bg-gray-200'
        } flex items-center justify-center`}
      >
        <X className="h-2 w-2" />
      </button>
    </div>
  )}
</div>
            
            <Button
              type="button"
              disabled={isLoading || inputValue.trim() === ""}
              className={`h-[52px] w-[52px] rounded-full shadow-md transition-all duration-300 ${
                isLoading || inputValue.trim() === "" 
                  ? darkMode 
                    ? "bg-neutral-800 text-neutral-600" 
                    : "bg-gray-200 text-gray-400" 
                  : darkMode 
                    ? "bg-blue-600 text-white hover:bg-blue-500" 
                    : "bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg hover:from-blue-600 hover:to-blue-700"
              }`}
              onClick={handleSubmit}
            >
              {isLoading ? (
                <div className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin border-current"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-7 px-2 rounded-md text-xs ${
                  darkMode 
                    ? "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                } transition-colors duration-200`}
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                {showSuggestions ? "Hide suggestions" : "Show suggestions"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-7 px-2 rounded-md text-xs ${
                  darkMode 
                    ? "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                } transition-colors duration-200`}
                onClick={() => setShowContextPanel(!showContextPanel)}
              >
                <Lightbulb className="h-3.5 w-3.5 mr-1" />
                Context
              </Button>
              <div className="hidden sm:flex items-center">
                <div className={`mx-2 text-xs ${darkMode ? "text-neutral-600" : "text-gray-400"} transition-colors duration-300`}>|</div>
                <div className={`text-xs ${darkMode ? "text-neutral-500" : "text-gray-500"} flex items-center transition-colors duration-300`}>
                  <Command className="h-3 w-3 mr-1" /> + Enter to send
                </div>
              </div>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 px-2 rounded-md text-xs ${
                darkMode 
                  ? "text-neutral-500 hover:text-red-400 hover:bg-red-900/20" 
                  : "text-gray-500 hover:text-red-600 hover:bg-red-50"
              } transition-colors duration-200`}
              onClick={clearChat}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSavedSection = () => (
    <div className={`flex-1 overflow-hidden flex flex-col ${darkMode ? 'bg-neutral-950' : 'bg-gray-50'} transition-colors duration-300`}>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="text-center py-20 animate-in slide-in-right">
          <div className={`mx-auto w-16 h-16 rounded-full ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} flex items-center justify-center mb-4 transition-colors duration-300`}>
            <Bookmark className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-500'} transition-colors duration-300`} />
          </div>
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-300`}>Saved Messages</h3>
          
          {pinnedMessages.length === 0 ? (
            <div>
              <p className={`${darkMode ? 'text-neutral-400' : 'text-gray-600'} max-w-md mx-auto mb-6 transition-colors duration-300`}>
                No messages are pinned yet. When you pin important messages from your conversations, they'll appear here for quick reference.
              </p>
              
              <div className={`max-w-md mx-auto p-5 rounded-xl ${
                darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-blue-50/50 border-blue-100'
              } border transition-colors duration-300 flex items-center text-left`}>
                <div className={`mr-4 p-3 rounded-full ${
                  darkMode ? 'bg-blue-900/20' : 'bg-white'
                } transition-colors duration-300`}>
                  <Lightbulb className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium text-base mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quick Tip</h4>
                  <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-600'}`}>
                    To pin a message, hover over an AI response and click the "Actions" button, then select the bookmark icon.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className={`${darkMode ? 'text-neutral-400' : 'text-gray-600'} max-w-md mx-auto mb-6 transition-colors duration-300`}>
              Quickly access important messages you've pinned from your conversations.
            </p>
          )}
          
          {pinnedMessages.length > 0 && (
            <div className="mt-8 space-y-4 text-left">
              {pinnedMessages.map(id => {
                const message = chatHistory.find(msg => msg.id === id);
                if (!message) return null;
                
                return (
                  <div 
                    key={id} 
                    className={`${
                      darkMode 
                        ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    } border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover-lift`}
                  >
                    <p className={`${darkMode ? 'text-neutral-300' : 'text-gray-900'} mb-3 text-base transition-colors duration-300`}>
                      {message.content.substring(0, 150)}{message.content.length > 150 ? "..." : ""}
                    </p>
                    <div className="flex justify-between items-center border-t pt-3 mt-1">
                      <div className={`text-sm flex items-center ${darkMode ? 'text-neutral-500' : 'text-gray-500'} transition-colors duration-300`}>
                        <Bookmark className="h-4 w-4 mr-2 text-blue-500" />
                        {message.timestamp.toLocaleString(undefined, { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-9 px-3 ${
                            darkMode 
                              ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-blue-900/20 hover:text-blue-400 hover:border-blue-800' 
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                          } rounded-lg transition-all duration-200 flex items-center gap-1`}
                          onClick={() => handleCopyMessage(message.content)}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="text-xs">Copy</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-9 px-3 ${
                            darkMode 
                              ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800' 
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                          } rounded-lg transition-all duration-200 flex items-center gap-1`}
                          onClick={() => handleTogglePin(id)}
                        >
                          <X className="h-4 w-4" />
                          <span className="text-xs">Remove</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTopicsSection = () => (
    <div className={`flex-1 overflow-hidden flex flex-col ${darkMode ? 'bg-neutral-950' : 'bg-gray-50'} transition-colors duration-300`}>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="animate-in slide-in-right">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}>Recent Topics</h3>
          <div className="space-y-2">
            {recentTopics.map((topic, index) => (
              <Button
                key={index}
                variant="outline"
                className={`w-full justify-start ${
                  darkMode 
                    ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700 hover:text-white hover:border-neutral-600' 
                    : 'bg-white text-gray-800 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                } transition-all duration-200 group`}
                onClick={() => {
                  setInputValue(`Tell me about ${topic}`);
                  setCurrentSection("chat");
                }}
              >
                <div className={`mr-3 p-2 rounded-full ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} transition-colors duration-300`}>
                  <BookOpen className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{topic}</div>
                  <div className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-gray-500'} transition-colors duration-300`}>Last studied 2 days ago</div>
                </div>
                <ChevronRight className={`h-4 w-4 ${darkMode ? 'text-neutral-600' : 'text-gray-400'} transition-colors duration-300 opacity-0 group-hover:opacity-100`} />
              </Button>
            ))}
          </div>
          
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 mt-8 transition-colors duration-300`}>Suggested Topics</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className={`w-full justify-start ${
                darkMode 
                  ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700 hover:text-white hover:border-neutral-600' 
                  : 'bg-white text-gray-800 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
              } transition-all duration-200 group`}
              onClick={() => {
                setInputValue("Explain the pathophysiology of heart failure");
                setCurrentSection("chat");
              }}
            >
              <div className={`mr-3 p-2 rounded-full ${darkMode ? 'bg-green-900/20' : 'bg-green-50'} transition-colors duration-300`}>
                <Sparkles className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Heart Failure</div>
                <div className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-gray-500'} transition-colors duration-300`}>Recommended for your USMLE prep</div>
              </div>
              <ChevronRight className={`h-4 w-4 ${darkMode ? 'text-neutral-600' : 'text-gray-400'} transition-colors duration-300 opacity-0 group-hover:opacity-100`} />
            </Button>
            
            <Button
              variant="outline"
              className={`w-full justify-start ${
                darkMode 
                  ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700 hover:text-white hover:border-neutral-600' 
                  : 'bg-white text-gray-800 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
              } transition-all duration-200 group`}
              onClick={() => {
                setInputValue("What are the key features of autoimmune disorders?");
                setCurrentSection("chat");
              }}
            >
              <div className={`mr-3 p-2 rounded-full ${darkMode ? 'bg-green-900/20' : 'bg-green-50'} transition-colors duration-300`}>
                <Sparkles className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Autoimmune Disorders</div>
                <div className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-gray-500'} transition-colors duration-300`}>Based on your recent study patterns</div>
              </div>
              <ChevronRight className={`h-4 w-4 ${darkMode ? 'text-neutral-600' : 'text-gray-400'} transition-colors duration-300 opacity-0 group-hover:opacity-100`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContextPanel = () => (
    <div 
      className={`w-80 border-l ${darkMode ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-gray-50'} p-4 h-full overflow-y-auto animate-in slide-in-right transition-colors duration-300`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>Conversation Context</h3>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 rounded-full ${darkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600'} transition-colors duration-200`}
          onClick={() => setShowContextPanel(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-600'} mb-4 transition-colors duration-300`}>
        I use this context to tailor my responses to your needs. Feel free to modify it.
      </p>
      
      <div className="space-y-3">
        {conversationContext.map((item, index) => (
          <div 
            key={index} 
            className={`flex gap-2 items-start ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'} p-3 rounded-lg border shadow-sm transition-colors duration-300`}
          >
            <div className="mt-0.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className={`flex-1 text-sm ${darkMode ? 'text-neutral-300' : 'text-gray-800'} transition-colors duration-300`}>{item}</div>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 rounded-full ${darkMode ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition-colors duration-200`}
              onClick={() => {
                setConversationContext(conversationContext.filter((_, i) => i !== index));
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        
        <div className="pt-2">
          <Button
            variant="outline" 
            className={`w-full ${darkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-600' : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'} transition-colors duration-200`}
            onClick={() => {
              setConversationContext([...conversationContext, "New context item"]);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Context Item
          </Button>
        </div>
      </div>
      
      <div className="mt-8">
        <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-300`}>Document Context</h4>
        <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-600'} mb-4 transition-colors duration-300`}>
          You can also add reference documents to provide context for our conversation.
        </p>
        
        <Button 
          variant="outline" 
          className={`w-full mb-3 ${darkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-600' : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'} transition-colors duration-200`}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Add Study Notes
        </Button>
        
        <Button 
          variant="outline" 
          className={`w-full ${darkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-600' : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'} transition-colors duration-200`}
        >
          <FileText className="h-4 w-4 mr-2" />
          Upload Lecture Notes
        </Button>
      </div>
    </div>
  );

  // Save Dialog
  const renderSaveDialog = () => (
    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
      <DialogContent className={`max-w-md rounded-xl shadow-lg border-0 overflow-hidden animate-in zoom-in-95 ${darkMode ? 'bg-neutral-900' : 'bg-white'} transition-colors duration-300`}>
        <div className={`bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white relative`}>
          <div className="absolute top-3 right-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-white hover:bg-white/20 transition-colors duration-200"
              onClick={() => setShowSaveDialog(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Save className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-semibold m-0 p-0">Save to Notes</DialogTitle>
          </div>
          <DialogDescription className="text-white/80 m-0 p-0">
            Save this response to your notes for easy reference later.
          </DialogDescription>
        </div>
        
        <div className={`space-y-5 p-6 ${darkMode ? 'bg-neutral-900' : 'bg-white'} transition-colors duration-300`}>
          <div className="space-y-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-700'} flex items-center transition-colors duration-300`}>
              <PenLine className="h-4 w-4 mr-2 text-blue-500" />
              Note Title
            </label>
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Enter a title for your note"
              className={`w-full ${
                darkMode 
                  ? 'bg-neutral-800 border-neutral-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder:text-neutral-500' 
                  : 'border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder:text-gray-400'
              } rounded-lg transition-colors duration-300`}
            />
          </div>
          
          <div className="space-y-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-700'} flex items-center transition-colors duration-300`}>
              <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
              Tags
            </label>
            <div className={`flex flex-wrap gap-2 p-3 ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200'} rounded-lg border transition-colors duration-300`}>
              <Badge className={`${darkMode ? 'bg-blue-500/20 text-blue-400 border-blue-800 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'} px-3 py-1 transition-colors duration-300`}>
                <CheckCircle className="h-3 w-3 mr-1.5" />
                ai-answer
              </Badge>
              <Badge className={`${darkMode ? 'bg-blue-500/20 text-blue-400 border-blue-800 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'} px-3 py-1 transition-colors duration-300`}>
                <Brain className="h-3 w-3 mr-1.5" />
                medical
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                className={`rounded-full h-7 px-3 text-xs ${
                  darkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                } transition-colors duration-200`}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Add tag
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-700'} flex items-center transition-colors duration-300`}>
              <FileText className="h-4 w-4 mr-2 text-blue-500" />
              Preview
            </label>
            <div className={`p-4 ${
              darkMode 
                ? 'bg-neutral-800 border-neutral-700 text-neutral-300' 
                : 'bg-white border-gray-200 text-gray-700'
            } rounded-lg border text-sm max-h-32 overflow-y-auto shadow-sm transition-colors duration-300`}>
              {messageToSave && 
              chatHistory.find(msg => msg.id === messageToSave)?.content?.substring(0, 200) || "No content available"}
              {messageToSave && 
              (chatHistory.find(msg => msg.id === messageToSave)?.content?.length || 0) > 200 ? "..." : ""}
            </div>
          </div>
        </div>
        
        <div className={`p-4 border-t ${darkMode ? 'border-neutral-800 bg-neutral-950' : 'border-gray-100 bg-gray-50'} flex justify-end space-x-2 transition-colors duration-300`}>
          <Button 
            variant="outline" 
            onClick={() => setShowSaveDialog(false)}
            className={`${
              darkMode 
                ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                : 'border-gray-200 hover:bg-white text-gray-700'
            } transition-colors duration-200`}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmSaveNote}
            className={`${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
            } transition-colors duration-200`}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // CSS Animation for progress bar
  useEffect(() => {
    // Add CSS for the progress animation if it doesn't already exist
    if (!document.getElementById('progress-animation-style')) {
      const style = document.createElement('style');
      style.id = 'progress-animation-style';
      style.innerHTML = `
        @keyframes progress-indeterminate {
          0% {
            transform: translateX(-100%);
            width: 50%;
          }
          50% {
            width: 70%;
          }
          100% {
            transform: translateX(100%);
            width: 50%;
          }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Main render
  return (
    <div className={`w-full h-[calc(100vh-140px)] max-h-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-neutral-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Render overlay when mobile menu is open */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}
      
      {renderHeader()}
      
      <div className="flex h-[calc(100%-64px)]">
        {renderSidebar()}
        
        <div className="flex-1 flex overflow-hidden">
          {currentSection === "chat" && renderChatSection()}
          {currentSection === "saved" && renderSavedSection()}
          {currentSection === "topics" && renderTopicsSection()}
          
          {/* Context Panel (shown/hidden) */}
          {showContextPanel && renderContextPanel()}
        </div>
      </div>
      
      {/* Save Dialog */}
      {renderSaveDialog()}
      
      {/* Hidden audio element for text-to-speech */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

