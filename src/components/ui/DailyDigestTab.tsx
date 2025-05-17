import React, { useState, useEffect, useMemo } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "./card";
import { Button } from "./button";
import { Input } from "./input";
import {
  Sparkles, // Main icon for Daily Digest
  Calendar as CalendarIcon, // Keep original name
  Clock as ClockIcon,       // Keep original name
  BookOpen as BookOpenIcon, 
  Brain, 
  CheckCircle2,
  BarChart3, // For stats, if used
  PieChartIcon, // For stats, if used
  ListTodo, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Sun, 
  Moon,
  Loader2, 
  RotateCcw, 
  AlertCircle, 
  Info, 
  TrendingUp, 
  ClipboardCheck, 
  Palette,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { DailyDigest, ReviewTopic, SuggestedActivity } from "../../../convex/types";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "./badge";
import { Progress } from "./progress";

interface UserAwareProps {
  userId: Id<"users">;
}

const formatDateForDigest = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const formatDuration = (minutes: number): string => {
    if (minutes < 1) return "<1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h${remMinutes > 0 ? ` ${remMinutes}m` : ''}`;
};


const DailyDigestTab: React.FC<UserAwareProps> = ({ userId }) => {
  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [currentDigest, setCurrentDigest] = useState<DailyDigest | null>(null);
  const [availableTime, setAvailableTime] = useState<number>(120);
  const [timeInput, setTimeInput] = useState<string>(availableTime.toString());
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activityCompletions, setActivityCompletions] = useState<boolean[]>([]);
  
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false);

  const [previousDigests, setPreviousDigests] = useState<DailyDigest[]>([
     { _id: "1" as Id<"dailyDigests">, userId, date: Date.now() - 24 * 60 * 60 * 1000, summary: "Focused on cardiology and USMLE prep.", reviewTopics: [{ topic: "Cardiac Pharmacology", reason: "Low quiz score", priority: "high" }], suggestedActivities: [{ activity: "Review notes", topic: "Cardiac Pharmacology", duration: 45 }], completed: true, createdAt: Date.now() - 24 * 60 * 60 * 1000 },
  ]);

  useEffect(() => {
    if (darkMode && !useNotebookTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode, useNotebookTheme]);

  useEffect(() => { setTimeInput(availableTime.toString()); }, [availableTime]);

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setTimeInput(e.target.value); };
  const handleTimeInputBlur = () => {
    let numValue = parseInt(timeInput, 10);
    if (isNaN(numValue) || numValue < 15) {
        numValue = 15;
        if (timeInput !== "15") toast.info("Minimum study time is 15 minutes.", { duration: 2000 });
    }
    setAvailableTime(numValue); setTimeInput(numValue.toString());
  };

  const handleGenerateDigest = () => { 
    const finalAvailableTime = Math.max(15, availableTime);
    if (finalAvailableTime !== availableTime) { setAvailableTime(finalAvailableTime); setTimeInput(finalAvailableTime.toString()); }
    if (finalAvailableTime < 15) { toast.error("Min 15 minutes study time."); return; }
    setGeneratingDigest(true); setError(null); setCurrentDigest(null);
    setTimeout(() => { 
        const reviewTopicsData: ReviewTopic[] = [ { topic: "Renal Physiology", reason: "Upcoming exam", priority: "high" }, { topic: "Acid-Base Balance", reason: "Low confidence", priority: "high" }, { topic: "Electrolyte Disorders", reason: "Spaced repetition", priority: "medium" }, ];
        const baseDurationPerActivity = Math.floor(finalAvailableTime / reviewTopicsData.length) || 15;
        const suggestedActivitiesData: SuggestedActivity[] = reviewTopicsData.map((rt, i) => ({ activity: i % 2 === 0 ? "Focused Review" : "Practice Questions", topic: rt.topic, duration: baseDurationPerActivity, }));
        const newDigest: DailyDigest = { _id: `temp_${Date.now()}` as Id<"dailyDigests">, userId, date: Date.now(), summary: `Today's digest: ${reviewTopicsData.map(rt => rt.topic).join(', ')}, for your ${formatDuration(finalAvailableTime)} study time.`, reviewTopics: reviewTopicsData, suggestedActivities: suggestedActivitiesData, completed: false, createdAt: Date.now() };
        setCurrentDigest(newDigest); setActivityCompletions(new Array(suggestedActivitiesData.length).fill(false)); setGeneratingDigest(false); toast.success("Your Daily Digest is ready!");
    }, 1500);
  };

  const handleCompleteDigestActivities = () => { 
    if (!currentDigest) return;
    const updatedDigest = { ...currentDigest, completed: true }; setCurrentDigest(updatedDigest);
    setPreviousDigests(prev => [updatedDigest, ...prev.filter(d => d._id !== updatedDigest._id)]);
    toast.success("Great job completing your digest!");
  };
  const handleToggleActivity = (index: number) => { const newCompletions = [...activityCompletions]; newCompletions[index] = !newCompletions[index]; setActivityCompletions(newCompletions); };

  const getPriorityBadge = (priority: string) => { 
    const baseClass = "text-xs";
    const notebookHigh = "!bg-red-100 !text-red-700 !border-red-300";
    const notebookMed = "!bg-yellow-100 !text-yellow-700 !border-yellow-300";
    const notebookLow = "!bg-green-100 !text-green-700 !border-green-300";

    switch (priority.toLowerCase()) {
      case 'high': return <Badge className={`${baseClass} ${useNotebookTheme ? notebookHigh : (darkMode ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200')}`}>High</Badge>;
      case 'medium': return <Badge className={`${baseClass} ${useNotebookTheme ? notebookMed : (darkMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-200')}`}>Medium</Badge>;
      case 'low': return <Badge className={`${baseClass} ${useNotebookTheme ? notebookLow : (darkMode ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200')}`}>Low</Badge>;
      default: return <Badge variant="secondary" className={baseClass}>{priority}</Badge>;
    }
  };
  const getActivityIcon = (activity: string) => { 
    const actLower = activity.toLowerCase(); const iconClass = useNotebookTheme ? "h-5 w-5" : "h-4 w-4"; 
    if (actLower.includes('review') || actLower.includes('notes')) return <BookOpenIcon className={`${iconClass} ${useNotebookTheme ? 'text-orange-600' : 'text-blue-500 dark:text-blue-400'}`} />;
    if (actLower.includes('flashcard')) return <Sparkles className={`${iconClass} ${useNotebookTheme ? 'text-pink-500' : 'text-purple-500 dark:text-purple-400'}`} />;
    if (actLower.includes('quiz') || actLower.includes('question')) return <Brain className={`${iconClass} ${useNotebookTheme ? 'text-teal-600' : 'text-orange-500 dark:text-orange-400'}`} />;
    return <ListTodo className={`${iconClass} ${useNotebookTheme ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`} />;
  };
  
  const digestProgress = useMemo(() => { return (!currentDigest || activityCompletions.length === 0) ? 0 : Math.round((activityCompletions.filter(Boolean).length / activityCompletions.length) * 100); }, [activityCompletions, currentDigest]);
  
  const rootThemeClass = useNotebookTheme ? 'notebook-theme' : (darkMode ? 'dark' : '');

  const renderDigestGenerator = () => (
    <Card className={`digest-generator-card ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 shadow-xl' : 'bg-white border-gray-200 shadow-xl')}`}>
      <CardHeader className={`digest-card-header ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50')}`}>
        <div className="flex items-center gap-3 justify-center"> 
            <Sparkles className={`h-6 w-6 ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-sky-400' : 'text-sky-600')}`} />
            <CardTitle className={`card-title-text`}>Craft Your Daily Focus</CardTitle>
        </div>
        <CardDescription className={`card-description-text mt-1 ${useNotebookTheme ? 'text-center' : ''}`}>
          Tell Dorathy your available time, and get your AI-guided study plan for today!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div>
          <label htmlFor="availableTime" className={`block text-sm font-medium mb-1.5 text-center digest-time-label ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-300' : 'text-gray-700')}`}>
            How much time is in your scroll today?
          </label>
          <div className="digest-time-input-group">
            <Input id="availableTime" type="number" step="15" value={timeInput} onChange={handleTimeInputChange} onBlur={handleTimeInputBlur} className={`digest-time-input`}/>
            <span className={`digest-time-label`}>minutes ({formatDuration(availableTime)})</span>
          </div>
        </div>
        {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle className="h-4 w-4"/>{error}</p>}
      </CardContent>
      <CardFooter className={`border-t p-5 sm:p-6 ${useNotebookTheme ? 'border-none pt-0' : (darkMode ? 'border-neutral-700' : 'border-gray-100')}`}>
        <Button onClick={handleGenerateDigest} disabled={generatingDigest} className={`w-full rounded-lg shadow-md text-base py-3 generate-digest-button ${useNotebookTheme ? '' : (darkMode ? 'bg-sky-500 hover:bg-sky-400' : 'bg-sky-600 hover:bg-sky-700')}`}>
          {generatingDigest ? <Loader2 className="h-5 w-5 mr-2 animate-spin"/> : <Sparkles className="h-5 w-5 mr-2" />}
          {generatingDigest ? "Unfurling Your Scroll..." : "Reveal My Path for Today"}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderActiveDigest = () => {
    if (!currentDigest) return null;
    return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}>
      <Card className={`active-digest-card ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 shadow-2xl' : 'bg-white border-gray-200 shadow-2xl')}`}>
        <CardHeader className={`p-5 sm:p-6 active-digest-header ${useNotebookTheme ? '' : (darkMode ? 'bg-gradient-to-br from-sky-600/30 to-sky-700/30 border-b border-sky-500/30' : 'bg-gradient-to-br from-sky-50 to-blue-50 border-b border-sky-100')}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <Sparkles className={`h-6 w-6 ${useNotebookTheme ? 'text-orange-500' : (darkMode ? 'text-sky-300':'text-sky-500')}`} />
                        <CardTitle className={`card-title-text`}>{useNotebookTheme ? "Today's Sacred Scroll" : "Today's Study Focus"}</CardTitle>
                    </div>
                    <CardDescription className={`card-description-text`}>{formatDateForDigest(currentDigest.date)}</CardDescription>
                </div>
                {!currentDigest.completed && (
                    <Button size="sm" onClick={handleCompleteDigestActivities} disabled={digestProgress < 100} 
                            className={`rounded-md shadow complete-digest-button 
                                        ${useNotebookTheme ? '' : (digestProgress < 100 ? (darkMode ? 'bg-neutral-600 text-neutral-400' : 'bg-gray-300 text-gray-500') 
                                                                                        : (darkMode ? 'bg-green-500 hover:bg-green-400':'bg-green-600 hover:bg-green-700')) }`}>
                        <ClipboardCheck className="h-4 w-4 mr-1.5"/> {useNotebookTheme ? "Seal Today's Work" : "Mark Day as Complete"}
                    </Button>
                )}
            </div>
            <p className={`mt-3 text-sm leading-relaxed active-digest-summary ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-200' : 'text-gray-700')}`}>{currentDigest.summary}</p>
             {currentDigest.suggestedActivities.length > 0 && !currentDigest.completed && (
                <div className={`mt-3 ${useNotebookTheme ? 'digest-progress-bar' : ''}`}>
                    <div className="flex justify-between items-center text-xs mb-0.5">
                        <span className={`${useNotebookTheme ? 'text-amber-700 font-["Architect_Daughter"]' : (darkMode ? 'text-neutral-300' : 'text-gray-600')}`}>Scroll Progress</span>
                        <span className={`font-semibold ${useNotebookTheme ? 'text-orange-600 font-["Architect_Daughter"]' : (darkMode ? 'text-sky-300' : 'text-sky-600')}`}>{digestProgress}%</span>
                    </div>
                    <Progress value={digestProgress} className={`h-2 progress-bar-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700' : 'bg-sky-100')} [&>*]:bg-sky-500`} />
                </div>
            )}
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
            {currentDigest.completed ? ( 
                 <div className="text-center py-8">
                    <CheckCircle2 className={`h-16 w-16 mx-auto mb-4 ${useNotebookTheme ? 'text-green-600' : (darkMode ? 'text-green-400' : 'text-green-500')}`} />
                    <h3 className={`text-xl font-semibold ${useNotebookTheme ? 'font-["Caveat"] text-2xl text-green-700' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>Scroll Completed! Well Done!</h3>
                    <p className={`mt-1 text-sm ${useNotebookTheme ? 'text-green-800' : (darkMode ? 'text-neutral-400' : 'text-gray-600')}`}>You've completed all suggested activities.</p>
                    <Button onClick={() => setCurrentDigest(null)} className={`mt-6 rounded-lg study-action-button primary ${useNotebookTheme ? '' : ''}`}>
                        <RotateCcw className="h-4 w-4 mr-2"/> Get Fresh Scroll for Tomorrow
                    </Button>
                </div>
            ) : (
            <>
            <section>
                <h3 className={`digest-section-title`}><Target className="h-5 w-5"/>Focus Runes (Topics)</h3>
                <div className="space-y-3">
                {currentDigest.reviewTopics.map((topic, index) => (
                    <motion.div key={index} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: index * 0.1}}
                        className={`review-topic-item`}>
                        <div> <h4 className={`topic-title`}>{topic.topic}</h4> <p className={`topic-reason`}>{topic.reason}</p> </div>
                        {getPriorityBadge(topic.priority)}
                    </motion.div>
                ))}
                </div>
            </section>

            <section>
                <h3 className={`digest-section-title`}><ListTodo className="h-5 w-5"/>Quests for Today (Activities)</h3>
                <div className="space-y-3">
                {currentDigest.suggestedActivities.map((activity, index) => (
                    <motion.div key={index} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: (currentDigest.reviewTopics.length + index) * 0.1}}
                     className={`suggested-activity-item flex items-center gap-3 ${activityCompletions[index] ? 'opacity-60' : ''}`}>
                        <div className={`p-2 rounded-md ${useNotebookTheme ? (activityCompletions[index] ? 'bg-green-100' : 'bg-amber-50') : (activityCompletions[index] ? 'bg-green-100' : 'bg-gray-100') }`}>
                            {getActivityIcon(activity.activity)}
                        </div>
                        <div className="flex-grow">
                            <h4 className={`activity-title ${activityCompletions[index] ? (useNotebookTheme ? 'line-through decoration-amber-600 decoration-2' : 'line-through') : ''}`}>{activity.activity}: {activity.topic}</h4>
                            <div className={`text-xs flex items-center gap-1 activity-duration`}> <ClockIcon className="h-3 w-3"/> {formatDuration(activity.duration)} </div>
                        </div>
                        <Button onClick={() => handleToggleActivity(index)} className={`activity-toggle-button ${activityCompletions[index] ? 'done' : 'pending'}`} title={activityCompletions[index] ? "Undo" : "Mark Done"}>
                            {activityCompletions[index] ? <CheckCircle2 className="h-4 w-4"/> : <div className={`h-4 w-4 rounded-full border-2 ${useNotebookTheme ? 'border-amber-500' : 'border-gray-400'}`}></div>}
                        </Button>
                    </motion.div>
                ))}
                </div>
            </section>
            </>
            )}
        </CardContent>
      </Card>
    </motion.div>
    );
  };
  

  return (
    <div className={`dailydigest-tab-container space-y-8 ${rootThemeClass}`}>
      {/* Corrected Header Section */}
      <div className={`
        flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 pb-4 mb-6
        ${useNotebookTheme 
          ? 'dailydigest-header-bar' 
          : (darkMode ? 'border-b border-neutral-700' : 'border-b border-gray-200')
        }
      `}>
        <div className={`flex items-center ${useNotebookTheme ? 'dailydigest-title-group' : ''}`}>
          <div className={`
            p-2.5 mr-3 rounded-xl shadow-md
            ${useNotebookTheme 
              ? 'dailydigest-title-icon-bg' 
              : (darkMode ? 'bg-sky-700' : 'bg-sky-600') // Original theme icon bg
            }
          `}>
            {/* Sparkles icon for Daily Digest */}
            <Sparkles className={`h-6 w-6 text-white ${useNotebookTheme ? '' : ''}`} />
          </div>
          <div>
            <h1 className={`
              tracking-tight
              ${useNotebookTheme 
                ? 'dailydigest-title' 
                : `text-3xl font-bold ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`
              }
            `}>{useNotebookTheme ? "Today's Parchment" : "Daily Study Digest"}</h1>
            <p className={`
              ${useNotebookTheme 
                ? 'dailydigest-description' 
                : `text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`
              }
            `}>{useNotebookTheme ? "Your AI-scribed study guide for the day." : "Your AI-curated study plan for today."}</p>
          </div>
        </div>
         <div className={`flex items-center gap-2 ${useNotebookTheme ? 'dailydigest-header-controls' : ''}`}>
            <Button variant="outline" size="icon" onClick={() => setUseNotebookTheme(!useNotebookTheme)} className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''} ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'}`} title="Toggle Notebook Theme"><Palette className="h-5 w-5"/></Button>
            <Button variant="outline" size="icon" onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not for notebook theme.");}} className={`notetab-header-button ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'}`} title="Toggle Dark Mode">{darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
        </div>
      </div>

      {currentDigest ? renderActiveDigest() : renderDigestGenerator()}

      {previousDigests.length > 0 && (
        <Card className={`past-digests-card shadow-lg overflow-hidden ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200')}`}>
            <CardHeader className={`cursor-pointer p-4 sm:p-5 border-b ${useNotebookTheme ? 'border-amber-300' : (darkMode ? 'border-neutral-700' : 'border-gray-100')}`} onClick={() => setShowHistory(!showHistory)}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <ClockIcon className={`h-5 w-5 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-300' : 'text-gray-600')}`} />
                        <CardTitle className={`text-md font-semibold ${useNotebookTheme ? 'font-["Architect_Daughter"] text-amber-800' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>{useNotebookTheme ? "Ancient Scrolls (Past Digests)" : "Past Digests"}</CardTitle>
                    </div>
                    {showHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
            </CardHeader>
            <AnimatePresence>
            {showHistory && (
                <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <CardContent className="p-4 sm:p-5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {previousDigests.map((digest) => (
                        <Card key={digest._id.toString()} className={`past-digest-item p-3 rounded-lg border ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700/50 border-neutral-600' : 'bg-gray-50 border-gray-200')}`}>
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`font-medium text-sm ${useNotebookTheme ? 'text-amber-900' : (darkMode ? 'text-neutral-200' : 'text-gray-700')}`}>{formatDateForDigest(digest.date)}</h4>
                                <Badge className={`text-xs ${digest.completed ? (useNotebookTheme ? '!bg-green-100 !text-green-700 !border-green-300' : (darkMode ? 'bg-green-500/20 text-green-300 border-green-500/30':'bg-green-100 text-green-700 border-green-200')) : (useNotebookTheme ? '!bg-yellow-100 !text-yellow-700 !border-yellow-300' : (darkMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30':'bg-yellow-100 text-yellow-700 border-yellow-200'))}`}>
                                    {digest.completed ? <CheckCircle2 className="h-3 w-3 mr-1"/> : <ClockIcon className="h-3 w-3 mr-1"/>}{digest.completed ? 'Completed' : 'Incomplete'}
                                </Badge>
                            </div>
                            <p className={`text-xs line-clamp-2 ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-400' : 'text-gray-600')}`}>{digest.summary}</p>
                        </Card>
                    ))}
                </CardContent>
                </motion.section>
            )}
            </AnimatePresence>
        </Card>
      )}

      <Card className={`digest-stats-card shadow-xl overflow-hidden ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200')}`}>
        <CardHeader className={`border-b ${useNotebookTheme ? 'border-amber-300 bg-amber-50/30' : (darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50')}`}>
            <div className="flex items-center gap-3">
                <TrendingUp className={`h-6 w-6 ${useNotebookTheme ? 'text-green-700' : (darkMode ? 'text-emerald-400' : 'text-emerald-600')}`} />
                <CardTitle className={`text-xl font-semibold ${useNotebookTheme ? 'font-["Caveat"] text-green-800' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>{useNotebookTheme ? "Chronicler's Stats" : "Study Statistics"}</CardTitle>
            </div>
          <CardDescription className={`text-sm mt-1 ${useNotebookTheme ? 'font-["Architect_Daughter"] text-green-900' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>
            A peek at your study patterns and digest journeys.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
            {[
              { title: "Digest Completion", Icon: ClipboardCheck, value: `${previousDigests.length > 0 ? Math.round((previousDigests.filter(d => d.completed).length / previousDigests.length) * 100) : 0}%`, desc: `${previousDigests.filter(d => d.completed).length} of ${previousDigests.length} digests` },
              { title: "Total Study Time", Icon: ClockIcon, value: formatDuration(previousDigests.filter(d=>d.completed).reduce((total, d) => total + d.suggestedActivities.reduce((sum, act) => sum + act.duration, 0), 0)), desc: "From completed digests" },
              { title: "Top Focus Area", Icon: PieChartIcon, value: previousDigests.flatMap(d => d.reviewTopics).reduce((acc, topic) => { acc[topic.topic] = (acc[topic.topic] || 0) + 1; return acc; }, {} as Record<string, number>)[Object.keys(previousDigests.flatMap(d => d.reviewTopics).reduce((acc, topic) => { acc[topic.topic] = (acc[topic.topic] || 0) + 1; return acc; }, {} as Record<string, number>)).sort((a,b) => previousDigests.flatMap(d => d.reviewTopics).reduce((acc, topic) => { acc[topic.topic] = (acc[topic.topic] || 0) + 1; return acc; }, {} as Record<string, number>)[b] - previousDigests.flatMap(d => d.reviewTopics).reduce((acc, topic) => { acc[topic.topic] = (acc[topic.topic] || 0) + 1; return acc; }, {} as Record<string, number>)[a])[0]] || "N/A", desc: "Most frequent review topic" },
            ].map(stat => (
                <Card key={stat.title} className={`resource-item-card p-4 rounded-lg shadow ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700/70 border-neutral-600' : 'bg-white border-gray-200')}`}>
                    <div className="flex flex-col items-center md:items-start">
                        <div className={`resource-icon-bg p-2 rounded-full mb-2 ${useNotebookTheme ? '' : (darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100')}`}>
                            <stat.Icon className={`h-5 w-5 ${useNotebookTheme ? '' : (darkMode ? 'text-emerald-300' : 'text-emerald-600')}`} />
                        </div>
                        <p className={`stat-value text-2xl font-bold ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-50' : 'text-gray-800')}`}>{stat.value}</p>
                        <p className={`stat-title text-xs font-medium ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>{stat.title}</p>
                        <p className={`text-xs ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`}>{stat.desc}</p>
                    </div>
                </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyDigestTab;