import { useState, useRef, useEffect, useCallback } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Brain,
  Send,
  FileText,
  BookOpen as BookOpenIcon,
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
  FileImage,
  Paperclip,
  Loader2,
  AlertTriangle,
  Archive,
  List,
  Palette,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
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

interface UserAwareProps {
  userId: Id<"users">;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "seen" | "error";
  thinking?: boolean;
  isPinned?: boolean;
  feedback?: "like" | "dislike" | null;
  references?: { text: string; url: string }[];
  imageUrl?: string | null;
  isError?: boolean;
}

interface QuickPrompt {
  id: string;
  text: string;
  icon: React.ReactNode;
  description?: string;
  fullPrompt?: string;
}

interface AIResponseObject {
    answer: string;
    citations?: Array<{ index: number; title: string; url: string }>;
}

const quickPromptsList: QuickPrompt[] = [
    { id: "explain_patho", text: "Explain Pathophysiology", description: "e.g., of Diabetes Mellitus Type 2", icon: <Brain className="h-5 w-5" />, fullPrompt: "Explain the pathophysiology of " },
    { id: "diff_diag", text: "Differential Diagnosis", description: "e.g., for chest pain", icon: <ScanLine className="h-5 w-5" />, fullPrompt: "What is the differential diagnosis for " },
    { id: "treatment_options", text: "Treatment Options", description: "e.g., for hypertension", icon: <Zap className="h-5 w-5" />, fullPrompt: "What are the first-line treatment options for " },
    { id: "summarize_topic", text: "Summarize Topic", description: "e.g., key points of Cardiac Cycle", icon: <FileText className="h-5 w-5" />, fullPrompt: "Summarize the key points of " },
    { id: "generate_mnemonics", text: "Generate Mnemonics", description: "e.g., for Cranial Nerves", icon: <Lightbulb className="h-5 w-5" />, fullPrompt: "Can you generate some mnemonics for " },
];

export function AskTab({ userId }: UserAwareProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome-message",
      role: "assistant",
      content: "Hi, I'm Dorathy, your medical AI assistant. How can I help you explore medical topics today? Try the palette icon to switch themes!",
      timestamp: new Date(),
      status: "seen",
    },
  ]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [messageToSave, setMessageToSave] = useState<ChatMessage | null>(null);
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [currentSection, setCurrentSection] = useState<"chat" | "saved" | "topics">("chat");
  const [pinnedMessages, setPinnedMessages] = useState<string[]>([]);
  const [showContextPanel, setShowContextPanel] = useState<boolean>(false);
  
  const [darkMode, setDarkMode] = useState<boolean>(false); 
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const [conversationContext, setConversationContext] = useState<string[]>([
    "User is a medical student preparing for USMLE Step 1.",
    "Focus on explaining concepts clearly with examples and analogies.",
    "Include relevant research and cite sources when available.",
    "Maintain a supportive and encouraging tone.",
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const askQuestion = useAction(api.ai.askQuestion);
  const askQuestionWithImage = useAction(api.ai.askQuestionWithImage);
  const generateFlashcardsAI = useAction(api.ai.generateFlashcards);
  const createNote = useMutation(api.notes.create);
  const createFlashcardBatch = useMutation(api.flashcards.createBatch);

  const recentTopics = [
    { id: "topic1", name: "Cardiac Physiology", lastAccessed: "2 days ago", icon: <Sparkles className="h-4 w-4 text-purple-500"/> },
    { id: "topic2", name: "Respiratory Pathology", lastAccessed: "5 days ago", icon: <Sparkles className="h-4 w-4 text-green-500"/> },
    { id: "topic3", name: "Neurotransmitters", lastAccessed: "1 week ago", icon: <Sparkles className="h-4 w-4 text-yellow-500"/> },
  ];

  useEffect(() => {
    if (inputRef.current && !isListening) {
      inputRef.current.focus();
    }
  }, [isLoading, isListening]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    if (darkMode && !useNotebookTheme) { 
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, useNotebookTheme]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreviewUrl(null);
      if (file) toast.error("Please select an image file.");
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e?: React.FormEvent, promptText?: string) => {
    if (e) e.preventDefault();
    let currentInput = (promptText || inputValue).trim();

    if (promptText && quickPromptsList.find(p => p.text === promptText)?.fullPrompt) {
        const quickPromptData = quickPromptsList.find(p => p.text === promptText);
        if (quickPromptData?.fullPrompt && inputValue.trim() === "") {
            currentInput = quickPromptData.fullPrompt;
            setInputValue(currentInput);
        } else if (quickPromptData?.fullPrompt && inputValue.trim() !== "") {
            currentInput = quickPromptData.fullPrompt + inputValue.trim();
        }
    }
    
    if (!currentInput && !selectedImage) return;

    const messageId = `user-${Date.now()}`;
    const tempImagePreviewUrl = imagePreviewUrl; 

    const newUserMessage: ChatMessage = {
      id: messageId,
      role: "user",
      content: currentInput,
      timestamp: new Date(),
      status: "sending",
      imageUrl: tempImagePreviewUrl,
    };
    setChatHistory((prev) => [...prev, newUserMessage]);

    if (!promptText) setInputValue(""); 
    else if (promptText && quickPromptsList.find(p => p.text === promptText)?.fullPrompt && inputValue.trim() === currentInput) {
    } else {
      setInputValue(""); 
    }
    
    if (selectedImage) {
        removeImage();
    }

    setIsLoading(true);
    setShowSuggestions(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setChatHistory(prev => prev.map(msg => msg.id === messageId ? { ...msg, status: "sent" } : msg));

      const thinkingMessageId = `assistant-thinking-${Date.now()}`;
      setChatHistory(prev => [...prev, {
        id: thinkingMessageId,
        role: "assistant",
        content: "",
        thinking: true,
        timestamp: new Date(),
      }]);
      scrollToBottom();

      let response: AIResponseObject | string | null | undefined;
      if (selectedImage && tempImagePreviewUrl) {
        response = await askQuestionWithImage({
          question: currentInput,
          imageUrl: tempImagePreviewUrl,
        });
      } else {
        response = await askQuestion({ question: currentInput });
      }
      
      setChatHistory(prev => prev.filter(msg => msg.id !== thinkingMessageId));

      let answerContent: string;
      let citationsContent: ChatMessage['references'] = [];

      if (typeof response === 'string') {
        answerContent = response;
      } else if (response && typeof response === 'object' && 'answer' in response) {
        answerContent = response.answer;
        if (response.citations && Array.isArray(response.citations)) {
          citationsContent = response.citations.map(citation => ({
            text: citation.title,
            url: citation.url,
          }));
        }
      } else {
        answerContent = "I encountered an issue processing that request. Please try rephrasing or ask something else.";
        setChatHistory(prev => [...prev, {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: answerContent,
          timestamp: new Date(),
          isError: true,
        }]);
        toast.error("Unexpected response format from AI.");
        setIsLoading(false);
        return;
      }

      setChatHistory(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: answerContent,
        timestamp: new Date(),
        references: citationsContent,
      }]);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Error: ${errorMessage}`);
      setChatHistory(prev => prev.map(msg => msg.id === messageId ? { ...msg, status: "error", isError: true, content: `${msg.content}\n\n(Failed to send)` } : msg));
      setChatHistory(prev => prev.filter(msg => msg.thinking !== true));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleListen = () => {
    setIsListening(!isListening);
    if (!isListening) toast.info("Listening... (tap microphone when done)");
    else {
      setInputValue(prev => prev + " (Voice input example) ");
      toast.success("Voice input added!");
    }
  };
  
  const handleTogglePin = (messageId: string) => {
    const isCurrentlyPinned = pinnedMessages.includes(messageId);
    setPinnedMessages(prev =>
      isCurrentlyPinned
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
    setChatHistory(prev => prev.map(msg => msg.id === messageId ? {...msg, isPinned: !isCurrentlyPinned} : msg));
    toast.success(isCurrentlyPinned ? "Message unpinned!" : "Message pinned!");
    setActiveMessageMenu(null);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
    setActiveMessageMenu(null);
  };

  const handleFeedback = (messageId: string, feedbackType: "like" | "dislike") => {
    setChatHistory(prev => prev.map(msg => msg.id === messageId ? { ...msg, feedback: feedbackType } : msg));
    toast.success("Thanks for your feedback!");
    setActiveMessageMenu(null);
  };

  const handleSaveNoteRequest = (message: ChatMessage) => {
    setMessageToSave(message);
    const firstSentence = message.content.split(/[.!?]/)[0];
    setNoteTitle(firstSentence.length > 50 ? firstSentence.substring(0,47) + "..." : firstSentence || "AI Response");
    setNoteTags([]);
    setTagInput("");
    setShowSaveDialog(true);
    setActiveMessageMenu(null);
  };

  const handleConfirmSaveNote = async () => {
    if (!messageToSave || !noteTitle.trim()) {
      toast.error("Note title cannot be empty.");
      return;
    }
    try {
      await createNote({
        userId,
        title: noteTitle.trim(),
        content: messageToSave.content,
        tags: noteTags,
      });
      toast.success(`Note "${noteTitle.trim()}" saved!`);
      setChatHistory(prev => [...prev, {
        id: `system-note-${Date.now()}`,
        role: "system",
        content: `📝 Response saved to notes as "${noteTitle.trim()}".`,
        timestamp: new Date(),
      }]);
      setShowSaveDialog(false);
      setMessageToSave(null);
      setNoteTitle("");
      setNoteTags([]);
    } catch (error) {
      toast.error("Failed to save note.");
      console.error("Save note error:", error);
    }
  };

  const handleAddTagToNote = () => {
    if (tagInput.trim() && !noteTags.includes(tagInput.trim())) {
      setNoteTags(prev => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  };
  const handleRemoveTagFromNote = (tagToRemove: string) => {
    setNoteTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleGenerateFlashcards = async (messageId: string) => {
    const message = chatHistory.find(msg => msg.id === messageId);
    if (!message || message.role !== "assistant") return;

    setIsLoading(true);
    toast.info("Generating flashcards from response...");

    try {
      const userQuestionMessage = chatHistory.slice().reverse().find(msg => msg.role === 'user' && msg.timestamp < message.timestamp);
      const topic = userQuestionMessage ? userQuestionMessage.content.substring(0,40) + "..." : message.content.substring(0,40) + "...";
      
      const flashcardsData = await generateFlashcardsAI({
        topic: topic,
        content: message.content,
      });

      if (flashcardsData && flashcardsData.length > 0) {
        await createFlashcardBatch({ userId, cards: flashcardsData.map(fc => ({...fc, category: topic})) });
        toast.success(`${flashcardsData.length} flashcards created!`);
        setChatHistory(prev => [...prev, {
          id: `system-flashcards-${Date.now()}`,
          role: "system",
          content: `🃏 Flashcards created for "${topic}". Check the Study Tab!`,
          timestamp: new Date(),
        }]);
      } else {
        toast.error("Could not generate flashcards from this content.");
      }
    } catch (error) {
      toast.error("Error generating flashcards.");
      console.error("Flashcard generation error:", error);
    } finally {
      setIsLoading(false);
      setActiveMessageMenu(null);
    }
  };
  
  const clearChat = () => {
    setChatHistory([
      {
        id: "welcome-message-cleared",
        role: "assistant",
        content: "Chat cleared. Ready for new questions!",
        timestamp: new Date(),
        status: "seen"
      }
    ]);
    setPinnedMessages([]);
    toast.success("Chat history cleared.");
  };

  const MessageMenu = ({ message }: { message: ChatMessage }) => (
    <AnimatePresence>
      {activeMessageMenu === message.id && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`absolute z-20 mt-1 flex items-center gap-0.5 p-1 rounded-full shadow-xl border message-menu
                      ${message.role === 'user' ? 'right-0' : 'left-0'}`}
        >
          <Button title="Copy" variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleCopyMessage(message.content)}><Copy className="h-3.5 w-3.5" /></Button>
          {message.role === 'assistant' && (
            <>
              <Button title="Save to Notes" variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleSaveNoteRequest(message)}><Save className="h-3.5 w-3.5" /></Button>
              <Button title="Generate Flashcards" variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleGenerateFlashcards(message.id)}><BookOpenIcon className="h-3.5 w-3.5" /></Button>
              <Button title={message.isPinned ? "Unpin" : "Pin"} variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${message.isPinned ? (useNotebookTheme ? 'text-orange-600 bg-orange-100' : (darkMode ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50')) : ''}`} onClick={() => handleTogglePin(message.id)}><Bookmark className="h-3.5 w-3.5" /></Button>
              <div className={`w-px h-4 separator ${useNotebookTheme ? 'bg_orange-300' : (darkMode ? 'bg-neutral-600' : 'bg-gray-300')} mx-1`}></div>
              <Button title="Helpful" variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${message.feedback === 'like' ? (useNotebookTheme ? 'text-green-700 bg-green-100' : (darkMode ? 'text-green-400 bg-green-500/10' : 'text-green-500 bg-green-50')) : ''}`} onClick={() => handleFeedback(message.id, "like")}><ThumbsUp className="h-3.5 w-3.5" /></Button>
              <Button title="Not Helpful" variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${message.feedback === 'dislike' ? (useNotebookTheme ? 'text-red-700 bg-red-100' : (darkMode ? 'text-red-400 bg-red-500/10' : 'text-red-500 bg-red-50')) : ''}`} onClick={() => handleFeedback(message.id, "dislike")}><ThumbsDown className="h-3.5 w-3.5" /></Button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const rootContainerClass = useNotebookTheme 
    ? 'notebook-theme' 
    : (darkMode ? 'dark' : ''); 

  const renderHeader = () => (
    <div className={`sticky top-0 w-full px-4 sm:px-6 py-3 border-b backdrop-blur-md z-30 transition-colors duration-300 flex justify-between items-center ${useNotebookTheme ? 'asktab-header' : (darkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white/80 border-gray-200')}`}>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className={`lg:hidden h-9 w-9 mr-2 rounded-full ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-200 hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100')}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2.5 shadow-sm ${useNotebookTheme ? 'bg-blue-600' : (darkMode ? 'bg-blue-500' : 'bg-blue-600')}`}>
            <Brain className="h-4 w-4 text-white" />
          </div>
          <h1 className={`text-lg font-semibold ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-100' : 'text-gray-900')}`}>Dorathy</h1>
          <Badge variant="outline" className={`ml-2 text-xs px-2 py-0.5 rounded-full badge-ai ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-gray-100 text-gray-600 border-gray-200')}`}>Medical AI</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full ${useNotebookTheme ? (darkMode ? 'text-yellow-400 bg-yellow-800/30' : 'text-yellow-600 bg-yellow-100') : (darkMode ? 'text-neutral-200 hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100')}`}
          onClick={() => setUseNotebookTheme(!useNotebookTheme)}
          title={useNotebookTheme ? "Switch to Original Theme" : "Switch to Notebook Theme"}
        >
          <Palette className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full ${darkMode ? 'text-neutral-200 hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100'}`}
          onClick={() => {
            if (!useNotebookTheme) { 
                setDarkMode(!darkMode);
            } else {
                toast.info("Dark mode is not applicable to the Notebook theme.", { duration: 2000});
            }
          }}
          title={useNotebookTheme ? "Notebook theme active (Light)" : "Toggle Dark/Light Mode (Original Theme)"}
          disabled={false} 
        >
          {darkMode && !useNotebookTheme ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button 
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full ${darkMode ? 'text-neutral-200 hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100'}`}
          onClick={() => setShowContextPanel(!showContextPanel)}
          title="Conversation Context"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

const renderSidebar = () => (
    <div
      className={`${menuOpen || currentSection !== "chat" ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                  fixed lg:static top-0 left-0 h-full w-72 shrink-0 border-r z-40 lg:z-auto transition-transform duration-300 ease-in-out flex flex-col asktab-sidebar
                  ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100')}`}
    >
      <div className={`p-4 border-b flex items-center justify-between lg:hidden ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-800' : 'border-gray-200')}`}>
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${useNotebookTheme ? 'bg-blue-600' : (darkMode ? 'bg-blue-500' : 'bg-blue-600')}`}>
            <Brain className="h-4 w-4 text-white" />
          </div>
          <h2 className={`text-lg font-semibold ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-100' : 'text-gray-900')}`}>MedAI</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-200 hover:bg-neutral-800' : 'text-gray-700 hover:bg-gray-100')}`}
          onClick={() => setMenuOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        <Button
          variant="ghost"
          className={`w-full justify-start text-sm font-medium rounded-lg py-2.5 px-3 transition-all duration-150 asktab-sidebar-button ${currentSection === "chat" ? 'active' : ''}
                      ${useNotebookTheme ? '' : (currentSection === "chat" ? (darkMode ? 'bg-neutral-700 text-white' : 'bg-blue-50 text-blue-600') : (darkMode ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'))}`}
          onClick={() => { setCurrentSection("chat"); if (menuOpen) setMenuOpen(false); }}
        >
          <MessageSquare className="h-4 w-4 mr-4" /> 
          Conversation
        </Button>
        <Button
          variant="ghost"
           className={`w-full justify-start text-sm font-medium rounded-lg py-2.5 px-3 transition-all duration-150 asktab-sidebar-button ${currentSection === "saved" ? 'active' : ''}
                      ${useNotebookTheme ? '' : (currentSection === "saved" ? (darkMode ? 'bg-neutral-700 text-white' : 'bg-blue-50 text-blue-600') : (darkMode ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'))}`}
          onClick={() => { setCurrentSection("saved"); if (menuOpen) setMenuOpen(false); }}
        >
          <Archive className="h-4 w-4 mr-4" />
          Pinned Items
          {pinnedMessages.length > 0 && (
            <Badge className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${useNotebookTheme ? 'bg-amber-100 text-amber-700 border border-amber-200' : (darkMode ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-700')}`}>
              {pinnedMessages.length}
            </Badge>
          )}
        </Button>
        <Button
           variant="ghost"
           className={`w-full justify-start text-sm font-medium rounded-lg py-2.5 px-3 transition-all duration-150 asktab-sidebar-button ${currentSection === "topics" ? 'active' : ''}
                      ${useNotebookTheme ? '' : (currentSection === "topics" ? (darkMode ? 'bg-neutral-700 text-white' : 'bg-blue-50 text-blue-600') : (darkMode ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'))}`}
           onClick={() => { setCurrentSection("topics"); if (menuOpen) setMenuOpen(false); }}
        >
          <List className="h-4 w-4 mr-4" />
          Recent Topics
        </Button>

        <div className={`pt-2 mt-2 mb-1 border-t ${useNotebookTheme ? 'border-amber-300' : (darkMode ? 'border-neutral-800' : 'border-gray-200')}`}></div>
        <h3 className={`px-3 py-1.5 text-xs font-semibold tracking-wider uppercase ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`}>
          Quick Actions
        </h3>
        <Button
          variant="ghost"
          className={`w-full justify-start text-sm font-medium rounded-lg py-2.5 px-3 transition-all duration-150 asktab-sidebar-button
                      ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}`}
          onClick={clearChat}
        >
          <Trash2 className="h-4 w-4 mr-4" />
          Clear Conversation
        </Button>
         <Button
          variant="ghost"
          className={`w-full justify-start text-sm font-medium rounded-lg py-2.5 px-3 transition-all duration-150 asktab-sidebar-button
                      ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}`}
          onClick={() => toast.info("Help & Feedback: Not implemented yet.")}
        >
          <Lightbulb className="h-4 w-4 mr-4" />
          Help & Feedback
        </Button>
      </nav>

      <div className={`p-3 border-t ${useNotebookTheme ? 'border-amber-300' : (darkMode ? 'border-neutral-800' : 'border-gray-200')}`}>
        <Button variant="ghost" className={`w-full justify-start items-center p-2 rounded-lg asktab-sidebar-button ${useNotebookTheme ? '' : (darkMode ? 'hover:bg-neutral-800' : 'hover:bg-gray-100')}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2.5 ${useNotebookTheme ? 'bg-neutral-700' : (darkMode ? 'bg-neutral-700' : 'bg-gray-200')}`}>
                <User className={`h-4 w-4 ${useNotebookTheme ? 'text-neutral-400' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`} />
            </div>
            <div className="text-left">
                <div className={`text-sm font-medium ${useNotebookTheme ? 'text-neutral-100' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>Medical Student</div>
                <div className={`text-xs ${useNotebookTheme ? 'text-neutral-500' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>example@medschool.edu</div>
            </div>
            <MoreHorizontal className={`h-4 w-4 ml-auto ${useNotebookTheme ? 'text-neutral-500' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} />
        </Button>
      </div>
    </div>
  );

  const renderChatSection = () => (
    <div className={`flex-1 overflow-hidden flex flex-col asktab-main-content ${useNotebookTheme ? '' : ''}`}>
        <div ref={chatContainerRef} className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar chat-section-container ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-950' : 'bg-gray-50')} transition-colors duration-300`}>
        {chatHistory.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`flex flex-col group chat-message ${msg.role === "user" ? "items-end chat-message-user" : "items-start chat-message-assistant"} ${msg.role === "system" ? "chat-message-system" : ""}`}
          >
            <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${useNotebookTheme ? 'bg-blue-600' : (darkMode ? 'bg-blue-500' : 'bg-blue-600')}`}>
                  <Brain className="h-4 w-4 text-white" />
                </div>
              )}
               {msg.role === 'user' && (
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${useNotebookTheme ? 'bg-gray-200' : (darkMode ? 'bg-neutral-700' : 'bg-gray-200')}`}>
                  <User className={`h-4 w-4 ${useNotebookTheme ? 'text-gray-500' : (darkMode ? 'text-neutral-300':'text-gray-500')}`} />
                </div>
              )}
              <div className={`relative px-4 py-3 rounded-xl shadow-md transition-all duration-300 message-content-wrapper
                ${useNotebookTheme 
                  ? '' 
                  : (msg.role === "user"
                      ? `ml-auto rounded-br-none ${darkMode ? "bg-blue-600 text-white" : "bg-gradient-to-r from-blue-500 to-blue-600 text-white"}`
                      : `rounded-bl-none ${darkMode ? "bg-neutral-800 text-neutral-100 border border-neutral-700" : "bg-white text-gray-800 border border-gray-200"}`)
                }
                ${msg.isError ? (useNotebookTheme ? 'border-red-500 bg-red-100' : (darkMode ? 'border-red-500 bg-red-900/30' : 'border-red-300 bg-red-50')) : ''}
              `}>
                {msg.thinking ? (
                  <div className="flex items-center gap-2 p-2">
                    <Loader2 className={`h-4 w-4 animate-spin ${useNotebookTheme ? 'text-blue-600': (darkMode ? 'text-blue-400' : 'text-blue-500')}`} />
                    <span className={`text-sm ${useNotebookTheme ? 'text-gray-600' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>Dorathy is thinking...</span>
                  </div>
                ) : (
                  <>
                    {msg.imageUrl && <img src={msg.imageUrl} alt="Uploaded content" className="rounded-lg mb-2 max-h-60 object-contain" />}
                    <div className={`prose prose-sm max-w-none ${useNotebookTheme ? '' : (darkMode ? 'prose-invert' : '')} ${msg.isError ? (useNotebookTheme ? 'text-red-700' : (darkMode ? 'text-red-300':'text-red-700')) : ''}`}>
                      {msg.content.split('\n').map((line, i) => <p key={i} className="my-0.5">{line}</p>)}
                    </div>
                    {msg.references && msg.references.length > 0 && (
                      <div className={`mt-2 pt-2 border-t text-xs message-references ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700 text-neutral-400' : 'border-gray-200 text-gray-500')}`}>
                        <strong className="font-medium">References:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {msg.references.map((ref, i) => (
                            <li key={i}>
                              <a href={ref.url} target="_blank" rel="noopener noreferrer" className={`${useNotebookTheme ? '' : (darkMode ? 'text-blue-400' : 'text-blue-600')}`}>
                                {ref.text || new URL(ref.url).hostname}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className={`text-xs mt-1.5 px-1 flex items-center gap-2 relative ${msg.role === "user" ? "justify-end mr-10" : "justify-start ml-10"}`}>
              <span className={`${useNotebookTheme ? 'text-gray-500' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {msg.status && msg.role === 'user' && (
                 <span className={`
                    ${msg.status === 'error' ? (useNotebookTheme ? 'text-red-600' : (darkMode ? 'text-red-400':'text-red-500')) : (useNotebookTheme ? 'text-gray-500' : (darkMode ? 'text-neutral-500':'text-gray-400'))}
                 `}>
                    {msg.status === "sending" && <Loader2 className="h-3 w-3 animate-spin" />}
                    {msg.status === "sent" && <CheckCircle className="h-3 w-3" />}
                    {msg.status === "error" && <AlertTriangle className="h-3 w-3" />}
                 </span>
              )}
              {(msg.role === 'assistant' || msg.role === 'user') && !msg.thinking && (
                <>
                  <button onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)} className={`p-0.5 rounded-full message-menu-trigger ${useNotebookTheme ? 'text-gray-500 hover:bg-gray-200' : (darkMode ? 'hover:bg-neutral-700 text-neutral-500' : 'hover:bg-gray-200 text-gray-400')}`}>
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  <MessageMenu message={msg} />
                </>
              )}
            </div>
          </motion.div>
        ))}
        </div>

        <div className={`p-3 md:p-4 border-t chat-input-area ${useNotebookTheme ? '' : (darkMode ? "border-neutral-800 bg-neutral-900" : "border-gray-200 bg-gray-100")}`}>
        {imagePreviewUrl && (
          <div className={`mb-2 p-2 border rounded-lg relative w-fit max-w-xs max-h-xs animate-in fade-in zoom-in-90
                          ${useNotebookTheme ? 'border-gray-300 bg-white' : (darkMode ? 'border-neutral-700 bg-neutral-800' : 'border-gray-300 bg-white')}
          `}>
            <img src={imagePreviewUrl} alt="Preview" className="max-h-28 rounded object-contain" />
            <Button
              variant="ghost"
              size="icon"
              className={`absolute -top-2 -right-2 h-6 w-6 rounded-full ${useNotebookTheme ? 'bg-gray-300 hover:bg-gray-400 text-gray-700' : (darkMode ? 'bg-neutral-600 hover:bg-neutral-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700')}`}
              onClick={removeImage}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        
        {showSuggestions && chatHistory.length <= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {quickPromptsList.slice(0,3).map((prompt) => (
                <Button
                  key={prompt.id}
                  variant="outline"
                  className={`justify-start text-left h-auto py-2.5 px-3 rounded-lg shadow-sm quick-prompt-button
                    ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 hover:border-blue-500 hover:bg-neutral-700 text-neutral-300'
                                              : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700')} `}
                  onClick={() => handleSubmit(undefined, prompt.text)}
                >
                  <div className={`mr-2.5 p-1.5 rounded-md quick-prompt-icon-bg ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700' : 'bg-blue-50')}`}>{prompt.icon}</div>
                  <div>
                    <div className="font-medium text-sm">{prompt.text}</div>
                    {prompt.description && <div className={`text-xs quick-prompt-description ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>{prompt.description}</div>}
                  </div>
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`flex-shrink-0 h-12 w-12 chat-button ${useNotebookTheme ? '' : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-200 text-gray-500')}`}
            onClick={() => fileInputRef.current?.click()}
            title="Upload Image or File"
          >
            <Paperclip className={useNotebookTheme ? "h-4 w-4" : "h-5 w-5"} />
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

          {useNotebookTheme ? (
            <div className="relative flex-grow input-area-wrapper">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Scribble your thoughts..."}
                className={`flex-1 min-h-[48px] max-h-[120px] p-3 rounded-xl resize-none chat-input-textarea notebook-textarea-mic-inside`}
                disabled={isLoading || isListening}
                rows={1}
              />
              <Button
                variant="ghost"
                size="icon"
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 chat-button mic-button ${isListening ? 'active' : ''}`}
                onClick={handleToggleListen}
                disabled={isLoading}
                title={isListening ? "Stop Listening" : "Voice Input"}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask Dorathy anything..."}
                className={`flex-1 min-h-[48px] max-h-[120px] p-3 pr-10 rounded-xl resize-none
                            ${darkMode ? 'bg-neutral-800 border-neutral-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-white placeholder:text-neutral-500'
                                      : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-gray-900 placeholder:text-gray-400'}`}
                disabled={isLoading || isListening}
                rows={1}
              />
              <Button
                variant="ghost"
                size="icon"
                className={`flex-shrink-0 h-12 w-12 rounded-full -ml-12 z-10 ${isListening ? (darkMode ? 'text-red-400 bg-red-900/20':'text-red-500 bg-red-100') : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-200 text-gray-500')}`}
                onClick={handleToggleListen}
                disabled={isLoading}
                title={isListening ? "Stop Listening" : "Voice Input"}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </>
          )}
          
          <Button
            type="submit"
            disabled={isLoading || (!inputValue.trim() && !selectedImage)}
            className={`flex-shrink-0 h-12 w-12 chat-button send-button
                        ${useNotebookTheme ? '' : ((!inputValue.trim() && !selectedImage && !isLoading)
                            ? (darkMode ? "bg-neutral-700 text-neutral-500 cursor-not-allowed" : "bg-gray-300 text-gray-400 cursor-not-allowed")
                            : (darkMode ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white")
                        )}`}
            onClick={(e) => handleSubmit(e)}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className={useNotebookTheme ? "h-4 w-4" : "h-5 w-5"} />}
          </Button>
        </div>
        <div className="mt-2 flex justify-between items-center">
            <p className={`text-xs ${useNotebookTheme ? 'text-gray-600' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>
              <Command className="inline h-3 w-3 mr-1" />+ Enter to send. Shift + Enter for new line.
            </p>
            <Button
                variant="ghost"
                size="sm"
                className={`text-xs h-7 px-2 ${useNotebookTheme ? 'text-gray-600 hover:bg-gray-200' : (darkMode ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200')}`}
                onClick={() => setShowSuggestions(prev => !prev)}
            >
                {showSuggestions ? "Hide Prompts" : "Show Prompts"}
                <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showSuggestions ? 'rotate-180':''}`}/>
            </Button>
        </div>
        </div>
    </div>
  );

 const renderSavedSection = () => (
    <div className={`flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar ${useNotebookTheme ? 'chat-section-container' : (darkMode ? 'bg-neutral-950' : 'bg-gray-50')}`}>
       <AnimatePresence>
        {pinnedMessages.length === 0 ? (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center py-10"
            >
                <div className={`p-5 rounded-full mb-5 ${useNotebookTheme ? 'bg-yellow-100 border-2 border-dashed border-yellow-300' : (darkMode ? 'bg-neutral-800' : 'bg-blue-50')}`}>
                    <Archive className={`h-12 w-12 ${useNotebookTheme ? 'text-yellow-700' : (darkMode ? 'text-blue-400' : 'text-blue-500')}`} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${useNotebookTheme ? 'text-gray-700' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>No Pinned Items Yet</h3>
                <p className={`max-w-sm ${useNotebookTheme ? 'text-gray-600' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>
                    Important messages you pin will appear here. Use the <Bookmark className="inline h-3 w-3"/> icon in chat.
                </p>
            </motion.div>
        ) : (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
            >
            {pinnedMessages.map(id => {
              const message = chatHistory.find(msg => msg.id === id);
              if (!message) return null;

              return (
                <motion.div
                  key={id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`p-4 rounded-xl shadow-md border transition-all duration-200
                    ${useNotebookTheme 
                      ? 'chat-message-assistant message-content-wrapper' 
                      : (darkMode ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg')
                    }`}
                >
                  <div className={`prose prose-sm max-w-none mb-2 line-clamp-4 ${useNotebookTheme ? '' : (darkMode ? 'prose-invert' : '')}`}>
                    {message.content.split('\n').map((line, i) => <p key={i} className="my-0.5">{line}</p>)}
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t">
                    <span className={`${useNotebookTheme ? 'text-gray-500' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>
                      Pinned on: {message.timestamp.toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="xs" className={`h-7 w-7 p-0 rounded-full ${useNotebookTheme ? 'text-gray-600 hover:bg-gray-200' : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500')}`} onClick={() => handleCopyMessage(message.content)} title="Copy"><Copy className="h-3.5 w-3.5"/></Button>
                        <Button variant="ghost" size="xs" className={`h-7 w-7 p-0 rounded-full ${useNotebookTheme ? 'text-gray-600 hover:bg-gray-200' : (darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-gray-100 text-gray-500')}`} onClick={() => handleTogglePin(id)} title="Unpin"><X className="h-3.5 w-3.5"/></Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderTopicsSection = () => (
    <div className={`flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar ${useNotebookTheme ? 'chat-section-container' : (darkMode ? 'bg-neutral-950' : 'bg-gray-50')}`}>
      <div className="space-y-6">
        <div>
            <h3 className={`text-lg font-semibold mb-3 ${useNotebookTheme ? 'text-gray-700' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>Recent Topics</h3>
            {recentTopics.length > 0 ? (
                <div className="space-y-2">
                {recentTopics.map((topic) => (
                    <Button
                    key={topic.id}
                    variant="outline"
                    className={`w-full justify-between items-center p-3 rounded-lg shadow-sm transition-all duration-150 group quick-prompt-button
                                ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-700 text-neutral-200'
                                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700')}`}
                    onClick={() => {
                        setInputValue(`Tell me more about ${topic.name}.`);
                        setCurrentSection("chat");
                        if(menuOpen) setMenuOpen(false);
                    }}
                    >
                    <div className="flex items-center">
                        <div className={`p-1.5 rounded-md mr-3 quick-prompt-icon-bg ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700' : 'bg-gray-100')}`}>
                            {topic.icon}
                        </div>
                        <div>
                            <div className="font-medium text-sm">{topic.name}</div>
                            <div className={`text-xs quick-prompt-description ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-500':'text-gray-500')}`}>Last accessed: {topic.lastAccessed}</div>
                        </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform duration-150 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 ${useNotebookTheme ? 'text-gray-500' : (darkMode ? 'text-neutral-500':'text-gray-400')}`} />
                    </Button>
                ))}
                </div>
            ) : (
                <p className={`text-sm ${useNotebookTheme ? 'text-gray-600' : (darkMode ? 'text-neutral-400':'text-gray-500')}`}>No recent topics. Start a conversation to see topics here.</p>
            )}
        </div>

        <div>
            <h3 className={`text-lg font-semibold mb-3 ${useNotebookTheme ? 'text-gray-700' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>Suggested Topics</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                    {name: "Pharmacokinetics Basics", icon: <Zap className="h-5 w-5 text-orange-500"/>},
                    {name: "Interpreting ECGs", icon: <Sparkles className="h-5 w-5 text-teal-500"/>},
                    {name: "Common Pediatric Illnesses", icon: <Sparkles className="h-5 w-5 text-pink-500"/>},
                    {name: "Antibiotic Mechanisms", icon: <Sparkles className="h-5 w-5 text-indigo-500"/>},
                ].map(topic => (
                    <Button
                        key={topic.name}
                        variant="outline"
                        className={`w-full justify-start items-center p-3 rounded-lg shadow-sm transition-all duration-150 group quick-prompt-button
                                    ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-700 text-neutral-200'
                                                : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700')}`}
                        onClick={() => {
                            setInputValue(`Explain ${topic.name}.`);
                            setCurrentSection("chat");
                            if(menuOpen) setMenuOpen(false);
                        }}
                    >
                        <div className={`p-1.5 rounded-md mr-3 quick-prompt-icon-bg ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700' : 'bg-purple-50')}`}>
                           {topic.icon}
                        </div>
                        <div className="font-medium text-sm">{topic.name}</div>
                    </Button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );

const renderContextPanel = () => (
    <AnimatePresence>
    {showContextPanel && (
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-0 right-0 h-full w-80 shadow-2xl z-50 flex flex-col context-panel-notebook
                    ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-l border-neutral-700 text-neutral-200'
                                : 'bg-white border-l border-gray-200 text-gray-800')}`}
      >
        <div className={`p-4 flex justify-between items-center border-b context-panel-header-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700' : 'border-gray-200')}`}>
          <h3 className="text-lg font-semibold">Conversation Context</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowContextPanel(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <p className={`text-sm ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-400' : 'text-gray-600')}`}>
            Dorathy uses this context to tailor responses. You can add or remove items.
          </p>
          {conversationContext.map((item, index) => (
            <div key={index} className={`p-3 rounded-lg border flex items-start gap-2 context-panel-item-notebook
                                       ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-50 border-gray-200')}`}>
              <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${useNotebookTheme ? 'text-yellow-600' : (darkMode ? 'text-yellow-400' : 'text-yellow-500')}`} />
              <Textarea
                value={item}
                onChange={(e) => {
                    const newContext = [...conversationContext];
                    newContext[index] = e.target.value;
                    setConversationContext(newContext);
                }}
                className={`text-sm flex-1 p-0 border-none bg-transparent resize-none focus:ring-0 min-h-[20px] ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-200':'text-gray-700')}`}
                rows={1}
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setConversationContext(prev => prev.filter((_, i) => i !== index))}>
                <Trash2 className={`h-3.5 w-3.5 ${useNotebookTheme ? 'text-gray-500 hover:text-red-600' : (darkMode ? 'text-neutral-500 hover:text-red-400':'text-gray-400 hover:text-red-500')}`} />
              </Button>
            </div>
          ))}
           <Button variant="outline" className={`w-full mt-2 context-panel-button-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-100')}`} onClick={() => setConversationContext(prev => [...prev, "New context item..."])}>
            <Plus className="h-4 w-4 mr-2" /> Add Context
          </Button>
        </div>
         <div className={`p-4 border-t dialog-footer-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700' : 'border-gray-200')}`}>
            <Button className={`w-full dialog-button-notebook primary ${useNotebookTheme ? '' : (darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700')}`} >
                Apply Context Changes
            </Button>
        </div>
      </motion.div>
    )}
    </AnimatePresence>
  );


  const renderSaveDialog = () => (
    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
      <DialogContent className={`sm:max-w-lg rounded-xl shadow-2xl border-0 overflow-hidden animate-in zoom-in-95 dialog-content-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white')}`}>
        <DialogHeader className={`p-6 pb-4 border-b dialog-header-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700' : 'border-gray-100')}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${useNotebookTheme ? 'bg-blue-100' : (darkMode ? 'bg-blue-500/20' : 'bg-blue-100')}`}>
              <Save className={`h-5 w-5 ${useNotebookTheme ? 'text-blue-600' : (darkMode ? 'text-blue-400' : 'text-blue-600')}`} />
            </div>
            <DialogTitle className="text-xl font-semibold dialog-title-notebook">Save Response to Notes</DialogTitle>
          </div>
        </DialogHeader>
        <div className="p-6 space-y-5">
          <div>
            <label htmlFor="noteTitle" className={`block text-sm font-medium mb-1.5 ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-300':'text-gray-700')}`}>Note Title</label>
            <Input
              id="noteTitle"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Enter a title for this note"
              className={`rounded-lg dialog-input-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30')}`}
            />
          </div>
          <div>
            <label htmlFor="noteTags" className={`block text-sm font-medium mb-1.5 ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-300':'text-gray-700')}`}>Tags (Optional)</label>
            <div className="flex gap-2">
              <Input
                id="noteTagInput"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag and press Enter"
                className={`flex-grow rounded-lg dialog-input-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30')}`}
                onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddTagToNote();}}}
              />
              <Button variant="outline" onClick={handleAddTagToNote} className={`rounded-lg dialog-button-notebook outline ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-600 hover:bg-neutral-700':'border-gray-300 hover:bg-gray-50')}`}>Add</Button>
            </div>
            {noteTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {noteTags.map(tag => (
                  <Badge key={tag} variant="secondary" className={`rounded-full py-1 px-2.5 dialog-tag-badge ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700 text-neutral-300 border-neutral-600' : 'bg-gray-100 text-gray-700 border-gray-200')}`}>
                    {tag}
                    <button onClick={() => handleRemoveTagFromNote(tag)} className={`ml-1.5 p-0.5 rounded-full ${useNotebookTheme ? 'hover:bg-gray-300' : (darkMode ? 'hover:bg-neutral-600':'hover:bg-gray-300')}`}>
                      <X className="h-3 w-3"/>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className={`text-sm font-medium mb-1.5 ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-300':'text-gray-700')}`}>Content Preview</p>
            <div className={`max-h-28 overflow-y-auto p-3 border rounded-lg text-sm custom-scrollbar dialog-input-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700/50 border-neutral-600 text-neutral-300':'bg-gray-50 border-gray-200 text-gray-600')}`}>
              {messageToSave?.content.substring(0, 300)}{messageToSave && messageToSave.content.length > 300 ? "..." : ""}
            </div>
          </div>
        </div>
        <DialogFooter className={`p-4 pt-4 border-t rounded-b-xl flex justify-end space-x-2 dialog-footer-notebook ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700 bg-neutral-800/50':'border-gray-100 bg-gray-50/50')}`}>
          <DialogClose asChild>
            <Button variant="outline" className={`rounded-lg dialog-button-notebook outline ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-600 hover:bg-neutral-700':'border-gray-300 hover:bg-gray-100')}`}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirmSaveNote} className={`text-white rounded-lg dialog-button-notebook primary ${useNotebookTheme ? '' : (darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700')}`}>
            <Save className="h-4 w-4 mr-2"/> Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );


  return (
    <div className={`flex flex-col h-full max-h-screen overflow-hidden transition-colors duration-300 ${rootContainerClass}`}>
      {renderHeader()}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {renderSidebar()}
        <main className="flex-1 flex flex-col overflow-hidden">
          {currentSection === "chat" && renderChatSection()}
          {currentSection === "saved" && renderSavedSection()}
          {currentSection === "topics" && renderTopicsSection()}
        </main>
        {renderContextPanel()}
      </div>
      {renderSaveDialog()}
    </div>
  );
}