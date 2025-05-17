import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter // Added for consistency
} from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  Heart,
  Send,
  Smile,
  Frown,
  Meh,
  BatteryCharging, // Changed from Battery for more dynamic feel
  BatteryFull,    // New for low stress
  BatteryMedium as BatteryMediumIcon, // Renamed to avoid conflict
  BatteryLow as BatteryLowIcon,       // Renamed to avoid conflict
  MessageSquare, // For user message icon
  Sparkles,      // For AI response icon
  ChevronDown,   // For expanding history
  ChevronUp,     // For collapsing history
  BookOpen,      // For resources
  LifeBuoy,      // For crisis resources
  Users,         // For campus counseling
  Loader2,       // For loading state
  BarChart3,     // For wellness trends (future)
  Sun, Moon,     // For theme toggle
  Info,
  Clock,
  AlertCircle,          // For informational messages
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel"; // Ensure this path is correct
import { toast } from "sonner";
import { WellnessCheckin } from "../../../convex/types"; // Ensure this path is correct
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "../ui/badge"; // For mood/stress display

interface UserAwareProps {
  userId: Id<"users">;
}

// Helper function (can be moved to utils.ts)
const formatDate = (timestamp: number | Date | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (timestamp === undefined) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    };
    return new Date(timestamp).toLocaleDateString(undefined, options || defaultOptions);
};


const WellnessTab: React.FC<UserAwareProps> = ({ userId }) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCheckin, setCurrentCheckin] = useState<WellnessCheckin | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false); // Local theme toggle

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentCheckin]);


  // Mock previous check-ins (replace with actual data fetching)
  const [previousCheckins, setPreviousCheckins] = useState<WellnessCheckin[]>([
    {
      _id: "1" as Id<"wellnessCheckins">, userId, mood: "okay", stressLevel: 5,
      message: "Feeling a bit stressed about my upcoming cardiology exam, but otherwise okay.",
      aiResponse: "It's completely normal to feel stressed about exams... Remember that some stress can actually help motivate you...",
      suggestions: ["Try breaking down topics", "Schedule short breaks", "Practice deep breathing"],
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    {
      _id: "2" as Id<"wellnessCheckins">, userId, mood: "stressed", stressLevel: 7,
      message: "I didn't sleep well and have a full day of lectures. Feeling overwhelmed.",
      aiResponse: "I'm sorry to hear you didn't sleep well... Lack of sleep can amplify stress...",
      suggestions: ["Try power naps", "Stay hydrated", "Focus on active listening"],
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    }
  ]);

  const handleSubmitCheckin = () => {
    if (!message.trim()) {
      toast.error("Please share how you're feeling.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setCurrentCheckin(null); // Clear previous current check-in for cleaner UI update

    // Simulate AI processing
    setTimeout(() => {
      let mood = "okay"; let stressLevel = 5;
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("stress") || lowerMessage.includes("overwhelm")) { mood = "stressed"; stressLevel = 7; }
      else if (lowerMessage.includes("exhaust") || lowerMessage.includes("tired")) { mood = "exhausted"; stressLevel = 8; }
      else if (lowerMessage.includes("good") || lowerMessage.includes("well")) { mood = "good"; stressLevel = 3; }

      let response = ""; let suggestions: string[] = [];
      if (mood === "stressed") { response = "Sensing stress... It's manageable."; suggestions = ["Mindfulness", "Task breakdown", "Short walk"]; }
      else if (mood === "exhausted") { response = "You sound exhausted. Prioritize rest."; suggestions = ["Sleep 7-8 hours", "Postpone tasks", "Relaxation techniques"]; }
      else { response = "Sounds like you're managing well. Keep it up!"; suggestions = ["Continue self-care", "Enjoy activities", "Reflect on positives"]; }

      const newCheckinData: WellnessCheckin = {
        _id: `temp_${Date.now()}` as Id<"wellnessCheckins">, userId, mood, stressLevel,
        message: message.trim(), aiResponse: response, suggestions, createdAt: Date.now(),
      };
      setCurrentCheckin(newCheckinData);
      setPreviousCheckins(prev => [newCheckinData, ...prev]); // Add to history
      setMessage("");
      setIsSubmitting(false);
      toast.success("Check-in submitted and analyzed!");
    }, 1800);
  };

  const getMoodVisual = (mood: string): { icon: React.ReactNode; color: string; darkColor: string; label: string } => {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('good') || moodLower.includes('great')) return { icon: <Smile className="h-5 w-5" />, color: 'text-green-500', darkColor: 'dark:text-green-400', label: 'Good' };
    if (moodLower.includes('okay') || moodLower.includes('meh')) return { icon: <Meh className="h-5 w-5" />, color: 'text-yellow-500', darkColor: 'dark:text-yellow-400', label: 'Okay' };
    return { icon: <Frown className="h-5 w-5" />, color: 'text-red-500', darkColor: 'dark:text-red-400', label: mood.charAt(0).toUpperCase() + mood.slice(1) };
  };

  const getStressLevelVisual = (level: number): { icon: React.ReactNode; color: string; darkColor: string; label: string } => {
    if (level <= 3) return { icon: <BatteryFull className="h-5 w-5" />, color: 'text-green-500', darkColor: 'dark:text-green-400', label: `Low (${level}/10)` };
    if (level <= 7) return { icon: <BatteryMediumIcon className="h-5 w-5" />, color: 'text-yellow-500', darkColor: 'dark:text-yellow-400', label: `Medium (${level}/10)` };
    return { icon: <BatteryLowIcon className="h-5 w-5" />, color: 'text-red-500', darkColor: 'dark:text-red-400', label: `High (${level}/10)` };
  };

  const resources = [
    { title: "Stress Management", Icon: Heart, items: ["5-min breathing exercises", "Progressive muscle relaxation", "Guided meditation"], action: "View Techniques" },
    { title: "Productivity Reset", Icon: BookOpen, items: ["Pomodoro technique", "Study environment optimization", "Focus enhancement tips"], action: "Reset Now" },
    { title: "Self-Care Essentials", Icon: LifeBuoy, items: ["Sleep improvement guides", "Nutrition for brain health", "Physical activity suggestions"], action: "Browse Resources" },
  ];

  return (
    <div className={`space-y-8 ${darkMode ? 'text-neutral-200' : ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center">
            <div className={`p-2.5 mr-3 rounded-xl shadow-md ${darkMode ? 'bg-emerald-500' : 'bg-emerald-600'}`}>
                <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
                <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`}>Wellness Hub</h1>
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Your space for mental well-being and support.</p>
            </div>
        </div>
        <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className={`rounded-full ${darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
            title="Toggle Theme"
        >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mental Health Check-In Card */}
      <Card className={`shadow-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
            <div className="flex items-center gap-3">
                <MessageSquare className={`h-6 w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <CardTitle className={`text-xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Mental Health Check-In</CardTitle>
            </div>
          <CardDescription className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
            Take a moment to reflect. How are you truly feeling today?
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Chat Display Area */}
          <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar p-1 pr-2 -mr-2">
            {!currentCheckin && previousCheckins.length === 0 && !isSubmitting && (
                 <div className={`text-center py-8 px-4 rounded-lg ${darkMode ? 'bg-neutral-700/50' : 'bg-gray-50'}`}>
                    <Heart className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
                    <p className={`font-medium ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>Welcome to Your Wellness Space!</p>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Share your thoughts or feelings below to get started.</p>
                </div>
            )}
            
            {currentCheckin && (
              <AnimatePresence>
                {/* User's Message */}
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end mb-3">
                  <div className={`px-4 py-3 rounded-xl rounded-br-none shadow-md max-w-[80%] ${darkMode ? "bg-blue-600 text-white" : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"}`}>
                    <p className="text-sm">{currentCheckin.message}</p>
                    <p className={`text-xs text-right mt-1.5 ${darkMode ? 'text-blue-200':'text-blue-100'} opacity-80`}>{formatDate(currentCheckin.createdAt, {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </motion.div>

                {/* AI's Response */}
                <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{delay:0.3}} className="flex mb-3">
                  <div className={`px-4 py-3 rounded-xl rounded-bl-none shadow-md max-w-[80%] border ${darkMode ? "bg-neutral-700 border-neutral-600 text-neutral-200" : "bg-white border-gray-200 text-gray-800"}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-full ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                            <Sparkles className={`h-4 w-4 ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
                        </div>
                        <p className="font-semibold text-sm">Dorathy's Insights</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2">
                        <div className="flex items-center gap-1"> {getMoodVisual(currentCheckin.mood).icon} <span className={`${getMoodVisual(currentCheckin.mood).color} ${getMoodVisual(currentCheckin.mood).darkColor}`}>{getMoodVisual(currentCheckin.mood).label}</span></div>
                        <div className="flex items-center gap-1"> {getStressLevelVisual(currentCheckin.stressLevel).icon} <span className={`${getStressLevelVisual(currentCheckin.stressLevel).color} ${getStressLevelVisual(currentCheckin.stressLevel).darkColor}`}>{getStressLevelVisual(currentCheckin.stressLevel).label}</span></div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap mb-2">{currentCheckin.aiResponse}</p>
                    {currentCheckin.suggestions.length > 0 && (
                      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-neutral-600' : 'border-gray-100'}`}>
                        <p className="font-medium text-xs mb-1.5">Suggestions for you:</p>
                        <ul className="space-y-1 list-disc list-inside pl-1">
                          {currentCheckin.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-xs">{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className={`text-xs text-left mt-1.5 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{formatDate(currentCheckin.createdAt, {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
             <div ref={messagesEndRef} />
          </div>

          {isSubmitting && (
            <div className="flex items-center justify-center p-4 text-sm">
                <Loader2 className={`h-5 w-5 mr-2 animate-spin ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                Dorathy is analyzing your check-in...
            </div>
          )}

          {error && <p className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-500/10 rounded-md flex items-center gap-1.5"><AlertCircle className="h-4 w-4"/>{error}</p>}

          {/* Input Area */}
          <div className="flex items-end gap-2 pt-3 border-t_dark:border-neutral-700">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How are you feeling today? What's on your mind?"
              className={`flex-1 min-h-[60px] max-h-[150px] rounded-xl custom-scrollbar ${darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:ring-emerald-500/50 focus:border-emerald-500' : 'bg-white border-gray-300 placeholder:text-gray-400 focus:ring-emerald-500/50 focus:border-emerald-500'}`}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitCheckin(); }}}
              rows={2}
            />
            <Button onClick={handleSubmitCheckin} disabled={isSubmitting || !message.trim()} className={`h-12 w-12 rounded-full p-0 shadow-md ${darkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <p className={`text-xs text-center mt-2 ${darkMode ? 'text-neutral-500' : 'text-gray-500'}`}>
            Your check-ins are private. Press Enter to send.
          </p>
        </CardContent>
      </Card>

      {/* Previous Check-ins Section */}
      {previousCheckins.length > 0 && (
        <Card className={`shadow-lg overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className="cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <Clock className={`h-5 w-5 ${darkMode ? 'text-neutral-300' : 'text-gray-600'}`} />
                        <CardTitle className={`text-lg font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Check-In History</CardTitle>
                    </div>
                    {showHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
            </CardHeader>
            <AnimatePresence>
            {showHistory && (
                <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <CardContent className="p-5 sm:p-6 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {previousCheckins.slice(currentCheckin ? 1 : 0).map((checkin) => { // Skip current if it's in history already
                         const moodInfo = getMoodVisual(checkin.mood);
                         const stressInfo = getStressLevelVisual(checkin.stressLevel);
                        return (
                        <Card key={checkin._id} className={`p-3 rounded-lg border ${darkMode ? 'bg-neutral-700/50 border-neutral-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-1.5">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                    <Badge variant="outline" className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${darkMode ? moodInfo.darkColor : moodInfo.color} ${darkMode ? 'border-current/30 bg-current/10' : 'border-current/30 bg-current/10'}`}>
    <span className="h-3.5 w-3.5">{moodInfo.icon}</span> {/* Apply size to wrapper */}
    {moodInfo.label}
</Badge>
<Badge variant="outline" className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${darkMode ? stressInfo.darkColor : stressInfo.color} ${darkMode ? 'border-current/30 bg-current/10' : 'border-current/30 bg-current/10'}`}>
    <span className="h-3.5 w-3.5">{stressInfo.icon}</span> {/* Apply size to wrapper */}
    {stressInfo.label}
</Badge>
                                </div>
                                <span className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{formatDate(checkin.createdAt, {month:'short', day:'numeric'})}</span>
                            </div>
                            <p className={`text-sm italic line-clamp-2 my-1 p-2 rounded ${darkMode ? 'text-neutral-300 bg-neutral-700' : 'text-gray-700 bg-gray-100'}`}>"{checkin.message}"</p>
                            <p className={`text-xs line-clamp-1 ${darkMode ? 'text-neutral-400' : 'text-gray-600'}`}>Dorathy: {checkin.aiResponse}</p>
                        </Card>
                    )})}
                </CardContent>
                </motion.section>
            )}
            </AnimatePresence>
        </Card>
      )}

      {/* Wellness Resources Section */}
      <Card className={`shadow-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
            <div className="flex items-center gap-3">
                <BookOpen className={`h-6 w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <CardTitle className={`text-xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Wellness Resources</CardTitle>
            </div>
          <CardDescription className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
            Quick access to tools and information for your well-being.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map(resource => (
                <Card key={resource.title} className={`flex flex-col justify-between rounded-lg shadow-md hover:shadow-lg transition-shadow ${darkMode ? 'bg-neutral-700/70 border-neutral-600 hover:border-neutral-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <resource.Icon className={`h-5 w-5 ${darkMode ? 'text-emerald-300' : 'text-emerald-500'}`} />
                            <h3 className={`font-semibold text-md ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{resource.title}</h3>
                        </div>
                        <ul className="space-y-1 text-xs list-disc list-inside pl-1">
                        {resource.items.map(item => <li key={item} className={`${darkMode ? 'text-neutral-300' : 'text-gray-600'}`}>{item}</li>)}
                        </ul>
                    </CardContent>
                    <CardFooter className={`p-3 border-t ${darkMode ? 'border-neutral-600' : 'border-gray-100'}`}>
                        <Button variant="outline" size="sm" className={`w-full rounded-md text-xs ${darkMode ? 'border-neutral-500 hover:bg-neutral-600' : 'border-gray-300 hover:bg-gray-100'}`}>{resource.action}</Button>
                    </CardFooter>
                </Card>
            ))}
          </div>
          <div className={`mt-6 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-3 ${darkMode ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100'}`}>
            <Info className={`h-8 w-8 sm:h-6 sm:w-6 flex-shrink-0 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
            <div className="flex-grow text-center sm:text-left">
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-indigo-200' : 'text-indigo-800'}`}>Need More Support?</h3>
                <p className={`text-sm ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                If you're facing persistent challenges, please reach out for professional help.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
              <Button variant="outline" className={`w-full sm:w-auto rounded-md ${darkMode ? 'border-indigo-400/50 text-indigo-300 hover:bg-indigo-500/20' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-100'}`}><Users className="h-4 w-4 mr-1.5"/> Campus Counseling</Button>
              <Button variant="outline" className={`w-full sm:w-auto rounded-md ${darkMode ? 'border-indigo-400/50 text-indigo-300 hover:bg-indigo-500/20' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-100'}`}><LifeBuoy className="h-4 w-4 mr-1.5"/> Crisis Resources</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WellnessTab;
