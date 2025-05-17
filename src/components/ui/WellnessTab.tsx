import React, { useState, useRef, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "./card";
import { Button } from "./button";
import { Textarea } from "./textarea";
import {
  Heart, Send, Smile, Frown, Meh, BatteryCharging, BatteryFull, 
  BatteryMedium as BatteryMediumIcon, BatteryLow as BatteryLowIcon,
  MessageSquare, Sparkles, ChevronDown, ChevronUp, BookOpen, LifeBuoy, Users,
  Loader2, Sun, Moon, Info, Clock, AlertCircle, Palette,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { WellnessCheckin } from "../../../convex/types";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "./badge";

interface UserAwareProps {
  userId: Id<"users">;
}

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
  
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false); 

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (darkMode && !useNotebookTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode, useNotebookTheme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentCheckin]);

  const [previousCheckins, setPreviousCheckins] = useState<WellnessCheckin[]>([
    { _id: "1" as Id<"wellnessCheckins">, userId, mood: "okay", stressLevel: 5, message: "Feeling a bit stressed about my upcoming cardiology exam, but otherwise okay.", aiResponse: "It's completely normal to feel stressed about exams... Remember that some stress can actually help motivate you...", suggestions: ["Try breaking down topics", "Schedule short breaks", "Practice deep breathing"], createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, },
    { _id: "2" as Id<"wellnessCheckins">, userId, mood: "stressed", stressLevel: 7, message: "I didn't sleep well and have a full day of lectures. Feeling overwhelmed.", aiResponse: "I'm sorry to hear you didn't sleep well... Lack of sleep can amplify stress...", suggestions: ["Try power naps", "Stay hydrated", "Focus on active listening"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, }
  ]);

  const handleSubmitCheckin = () => { 
    if (!message.trim()) { toast.error("Please share how you're feeling."); return; }
    setIsSubmitting(true); setError(null); setCurrentCheckin(null);
    setTimeout(() => { 
        let mood = "okay"; let stressLevel = 5; const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes("stress") || lowerMessage.includes("overwhelm")) { mood = "stressed"; stressLevel = 7; }
        else if (lowerMessage.includes("exhaust") || lowerMessage.includes("tired")) { mood = "exhausted"; stressLevel = 8; }
        else if (lowerMessage.includes("good") || lowerMessage.includes("well")) { mood = "good"; stressLevel = 3; }
        let response = ""; let suggestions: string[] = [];
        if (mood === "stressed") { response = "Sensing stress... It's manageable."; suggestions = ["Mindfulness", "Task breakdown", "Short walk"]; }
        else if (mood === "exhausted") { response = "You sound exhausted. Prioritize rest."; suggestions = ["Sleep 7-8 hours", "Postpone tasks", "Relaxation techniques"]; }
        else { response = "Sounds like you're managing well. Keep it up!"; suggestions = ["Continue self-care", "Enjoy activities", "Reflect on positives"]; }
        const newCheckinData: WellnessCheckin = { _id: `temp_${Date.now()}` as Id<"wellnessCheckins">, userId, mood, stressLevel, message: message.trim(), aiResponse: response, suggestions, createdAt: Date.now() };
        setCurrentCheckin(newCheckinData); setPreviousCheckins(prev => [newCheckinData, ...prev]); setMessage(""); setIsSubmitting(false); toast.success("Check-in submitted!");
    }, 1800);
  };

  const getMoodVisual = (mood: string): { icon: React.ReactNode; themeClass: string; label: string } => {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('good') || moodLower.includes('great')) return { icon: <Smile />, themeClass: 'mood-good', label: 'Good' };
    if (moodLower.includes('okay') || moodLower.includes('meh')) return { icon: <Meh />, themeClass: 'mood-okay', label: 'Okay' };
    return { icon: <Frown />, themeClass: 'mood-stressed', label: mood.charAt(0).toUpperCase() + mood.slice(1) };
  };

  const getStressLevelVisual = (level: number): { icon: React.ReactNode; themeClass: string; label: string } => {
    if (level <= 3) return { icon: <BatteryFull />, themeClass: 'stress-low', label: `Low (${level}/10)` };
    if (level <= 7) return { icon: <BatteryMediumIcon />, themeClass: 'stress-medium', label: `Medium (${level}/10)` };
    return { icon: <BatteryLowIcon />, themeClass: 'stress-high', label: `High (${level}/10)` };
  };

  const resources = [
    { title: "Stress Relief", Icon: Heart, items: ["5-min breathing", "Muscle relaxation", "Guided meditation"], action: "View Techniques", iconClass: "resource-icon-stress" },
    { title: "Focus Boost", Icon: BookOpen, items: ["Pomodoro timer", "Study zone setup", "Mind declutter"], action: "Reset Now", iconClass: "resource-icon-productivity"},
    { title: "Self-Care Rituals", Icon: LifeBuoy, items: ["Sleep hygiene", "Mindful eating", "Joyful movement"], action: "Browse Ideas", iconClass: "resource-icon-selfcare" },
  ];

  const rootThemeClass = useNotebookTheme ? 'notebook-theme' : (darkMode ? 'dark' : '');

  return (
    <div className={`wellnesstab-container space-y-8 ${rootThemeClass}`}>
      {/* HEADER SECTION - Applying conditional classes for original and notebook themes */}
      <div className={`
        flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 pb-4 mb-6
        ${useNotebookTheme 
          ? 'wellnesstab-header-bar' // Notebook theme specific container class
          : (darkMode ? 'border-b border-neutral-700' : 'border-b border-gray-200') // Original theme border
        }
      `}>
        <div className={`flex items-center ${useNotebookTheme ? 'wellnesstab-title-group' : ''}`}>
          <div className={`
            p-2.5 mr-3 rounded-xl shadow-md
            ${useNotebookTheme 
              ? 'wellnesstab-title-icon-bg' // Notebook theme icon background
              : (darkMode ? 'bg-emerald-500' : 'bg-emerald-600') // Original theme icon background
            }
          `}>
            <Heart className={`h-6 w-6 text-white ${useNotebookTheme ? '' : ''}`} />
          </div>
          <div>
            <h1 className={`
              tracking-tight
              ${useNotebookTheme 
                ? 'wellnesstab-title' // Notebook theme title class
                : `text-3xl font-bold ${darkMode ? 'text-neutral-100' : 'text-gray-900'}` // Original theme title
              }
            `}>Wellness {useNotebookTheme ? 'Journal' : 'Hub'}</h1>
            <p className={`
              ${useNotebookTheme 
                ? 'wellnesstab-description' // Notebook theme description class
                : `text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}` // Original theme description
              }
            `}>Your space for reflection and well-being.</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 ${useNotebookTheme ? 'wellnesstab-header-controls' : ''}`}>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setUseNotebookTheme(!useNotebookTheme)} 
              className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''} ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'}`} 
              title="Toggle Notebook Theme"
            >
              <Palette className="h-5 w-5"/>
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not for notebook theme.");}} 
              className={`notetab-header-button ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'}`} 
              title="Toggle Dark Mode"
            >
              {darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
        </div>
      </div>

      <Card className={`wellness-checkin-card ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 shadow-xl')}`}>
        <CardHeader className={`wellness-checkin-card-header ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50')}`}>
            <div className="flex items-center gap-3">
                <MessageSquare className={`h-6 w-6 ${useNotebookTheme ? 'text-teal-600' : (darkMode ? 'text-emerald-400' : 'text-emerald-600')}`} />
                <CardTitle className={`card-title-text`}>Daily Reflection</CardTitle>
            </div>
          <CardDescription className={`card-description-text`}>
            How are you navigating your thoughts and feelings today?
          </CardDescription>
        </CardHeader>
        <CardContent className={`wellness-checkin-card-content space-y-5`}>
          <div className={`space-y-4 max-h-96 overflow-y-auto custom-scrollbar p-1 pr-2 -mr-2 wellness-chat-display`}>
            {!currentCheckin && previousCheckins.length === 0 && !isSubmitting && (
                 <div className={`text-center py-8 px-4 rounded-lg wellness-message-ai ${useNotebookTheme ? 'bg-amber-50 border border-dashed border-amber-200' : (darkMode ? 'bg-neutral-700/50' : 'bg-gray-50')}`}>
                    <Sparkles className={`h-10 w-10 mx-auto mb-3 ${useNotebookTheme ? 'text-amber-500' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} />
                    <p className={`font-medium ${useNotebookTheme ? 'font-["Architect_Daughter"] text-lg text-amber-700' : (darkMode ? 'text-neutral-200' : 'text-gray-700')}`}>Hello, dear journal!</p>
                    <p className={`text-sm mt-1 ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>Ready to jot down your reflections?</p>
                </div>
            )}
            
            {currentCheckin && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end mb-3 wellness-chat-message wellness-message-user">
                  <div className={`wellness-message-bubble`}>
                    <p className="text-sm">{currentCheckin.message}</p>
                    <p className={`text-xs text-right mt-1.5 opacity-80`}>{formatDate(currentCheckin.createdAt, {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{delay:0.3}} className="flex mb-3 wellness-chat-message wellness-message-ai">
                  <div className={`wellness-message-bubble`}>
                    <div className={`ai-insights-header`}>
                        <Sparkles className={`h-4 w-4 inline mr-1.5`} /> Dorathy's Gentle Thoughts
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs mb-2">
                        {(() => { const mv = getMoodVisual(currentCheckin.mood); return <span className={`mood-stress-badge ${mv.themeClass}`}>{mv.icon}{mv.label}</span>; })()}
                        {(() => { const sv = getStressLevelVisual(currentCheckin.stressLevel); return <span className={`mood-stress-badge ${sv.themeClass}`}>{sv.icon}{sv.label}</span>; })()}
                    </div>
                    <p className="text-sm whitespace-pre-wrap mb-2">{currentCheckin.aiResponse}</p>
                    {currentCheckin.suggestions.length > 0 && (
                      <div className={`mt-2 pt-2 border-t ${useNotebookTheme ? 'border-dashed border-amber-200' : (darkMode ? 'border-neutral-600' : 'border-gray-100')}`}>
                        <p className="font-medium text-xs mb-1.5">Little ideas for you:</p>
                        <ul className={`space-y-1 list-disc list-inside pl-1 ${useNotebookTheme ? 'list-none' : ''}`}>
                          {currentCheckin.suggestions.map((suggestion, index) => (
                            <li key={index} className={`text-xs ${useNotebookTheme ? 'before:content-["✧"] before:mr-1.5 before:text-amber-500':''}`}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className={`text-xs text-left mt-1.5 opacity-70`}>{formatDate(currentCheckin.createdAt, {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
             <div ref={messagesEndRef} />
          </div>

          {isSubmitting && (
            <div className={`
              flex items-center justify-center p-4 text-sm rounded-md my-3
              ${useNotebookTheme 
                ? 'bg-amber-50 text-amber-700 border border-dashed border-amber-200' 
                : (darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600')}
            `}>
                <Loader2 className={`h-5 w-5 mr-2 animate-spin ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-emerald-400' : 'text-emerald-600')}`} />
                Dorathy is reflecting on your entry...
            </div>
          )}

          {error && (
            <p className={`
              text-sm p-3 rounded-md flex items-center gap-1.5 my-3
              ${useNotebookTheme 
                ? 'bg-red-50 text-red-700 border border-dashed border-red-200' 
                : (darkMode ? 'bg-red-900/20 text-red-300 border border-red-700/50' : 'bg-red-50 text-red-600 border border-red-200')}
            `}>
              <AlertCircle className="h-4 w-4"/>
              {error}
            </p>
          )}

          <div className={`flex items-end gap-2 wellness-input-area`}>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How are you, truly? What's on your heart?"
              className={`flex-1 min-h-[60px] max-h-[150px] rounded-xl custom-scrollbar wellness-input-textarea`}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitCheckin(); }}}
              rows={2}
            />
            <Button onClick={handleSubmitCheckin} disabled={isSubmitting || !message.trim()} className={`wellness-send-button`}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <p className={`text-xs text-center mt-2 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>
            Your reflections are a safe space. Press Enter to share.
          </p>
        </CardContent>
      </Card>

      {previousCheckins.length > 0 && (
        <Card className={`wellness-history-card ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 shadow-lg' : 'bg-white border-gray-200 shadow-lg')}`}>
            <CardHeader className={`wellness-history-card-header cursor-pointer`} onClick={() => setShowHistory(!showHistory)}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <Clock className={`h-5 w-5`} />
                        <CardTitle className={`text-lg font-semibold card-title-text`}>My Journal Entries</CardTitle>
                    </div>
                    {showHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
            </CardHeader>
            <AnimatePresence>
            {showHistory && (
                <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <CardContent className="p-5 sm:p-6 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {previousCheckins.slice(currentCheckin ? 1 : 0).map((checkin) => { 
                        const moodInfo = getMoodVisual(checkin.mood);
                        const stressInfo = getStressLevelVisual(checkin.stressLevel);
                        return (
                        <div key={checkin._id.toString()} className={`wellness-history-item`}>
                            <div className="flex justify-between items-start mb-1.5">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                    <span className={`mood-stress-badge ${moodInfo.themeClass}`}>{moodInfo.icon}{moodInfo.label}</span>
                                    <span className={`mood-stress-badge ${stressInfo.themeClass}`}>{stressInfo.icon}{stressInfo.label}</span>
                                </div>
                                <span className={`history-date`}>{formatDate(checkin.createdAt, {month:'short', day:'numeric'})}</span>
                            </div>
                            <p className={`text-sm italic line-clamp-2 my-1 p-2 rounded ${useNotebookTheme ? 'bg-amber-50 text-amber-800' : (darkMode ? 'text-neutral-300 bg-neutral-700' : 'text-gray-700 bg-gray-100')}`}>"{checkin.message}"</p>
                            <p className={`text-xs line-clamp-1 ${useNotebookTheme ? 'text-gray-600' : (darkMode ? 'text-neutral-400' : 'text-gray-600')}`}>Dorathy: {checkin.aiResponse}</p>
                        </div>
                    )})}
                </CardContent>
                </motion.section>
            )}
            </AnimatePresence>
        </Card>
      )}

      <Card className={`wellness-resources-section-card ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 shadow-xl' : 'bg-white border-gray-200 shadow-xl')}`}>
        <CardHeader className={`wellness-checkin-card-header ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50')}`}>
            <div className="flex items-center gap-3">
                <BookOpen className={`h-6 w-6 ${useNotebookTheme ? 'text-green-700' : (darkMode ? 'text-emerald-400' : 'text-emerald-600')}`} />
                <CardTitle className={`card-title-text`}>Wellness Toolkit</CardTitle>
            </div>
          <CardDescription className={`card-description-text`}>Quick access to tools for your well-being journey.</CardDescription>
        </CardHeader>
        <CardContent className={`wellness-checkin-card-content`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map(resource => (
                <Card key={resource.title} className={`wellness-resource-item-card ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700/70 border-neutral-600 hover:border-neutral-500' : 'bg-white border-gray-200 hover:border-gray-300')}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`p-1.5 rounded-full resource-icon-bg ${resource.iconClass}`}><resource.Icon className={`h-5 w-5`} /></span>
                            <h3 className={`resource-title`}>{resource.title}</h3>
                        </div>
                        <ul className="space-y-1 list-disc list-inside pl-1 resource-item-list">
                        {resource.items.map(item => <li key={item}>{item}</li>)}
                        </ul>
                    </CardContent>
                    <CardFooter className={`p-3 border-t ${useNotebookTheme ? 'border-dashed border-amber-200' : (darkMode ? 'border-neutral-600' : 'border-gray-100')}`}>
                        <Button variant="outline" size="sm" className={`w-full rounded-md text-xs resource-action-button`}>{resource.action}</Button>
                    </CardFooter>
                </Card>
            ))}
          </div>
          <div className={`mt-6 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-3 wellness-support-box ${useNotebookTheme ? '' : (darkMode ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100')}`}>
            <Info className={`h-8 w-8 sm:h-6 sm:w-6 flex-shrink-0 ${useNotebookTheme ? 'text-red-500' : (darkMode ? 'text-indigo-300' : 'text-indigo-600')}`} />
            <div className="flex-grow text-center sm:text-left">
                <h3 className={`font-semibold mb-1 support-title`}>Need More Support?</h3>
                <p className={`text-sm support-text`}>If you're facing persistent challenges, please reach out for professional help.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
              <Button variant="outline" className={`w-full sm:w-auto rounded-md support-button`}><Users className="h-4 w-4 mr-1.5"/> Campus Counseling</Button>
              <Button variant="outline" className={`w-full sm:w-auto rounded-md support-button`}><LifeBuoy className="h-4 w-4 mr-1.5"/> Crisis Resources</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WellnessTab;