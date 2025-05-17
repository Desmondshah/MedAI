import React, { useState, useEffect, useMemo } from "react"; // Added useMemo
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Calendar,
  Clock,
  BookOpen as BookOpenIcon,
  Brain,
  CheckCircle2,
  BarChart3,
  PieChartIcon,
  ListTodo,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sun, Moon,
  Loader2,
  RotateCcw,
  AlertCircle,
  Info,
  TrendingUp,
  ClipboardCheck
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { DailyDigest, ReviewTopic, SuggestedActivity } from "../../../convex/types";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

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
  const [timeInput, setTimeInput] = useState<string>(availableTime.toString()); // Temporary string state for input
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activityCompletions, setActivityCompletions] = useState<boolean[]>([]);
  const [darkMode, setDarkMode] = useState(false);

  const [previousDigests, setPreviousDigests] = useState<DailyDigest[]>([
     {
      _id: "1" as Id<"dailyDigests">, userId, date: Date.now() - 24 * 60 * 60 * 1000,
      summary: "Focus on cardiology and USMLE prep with targeted flashcards and practice questions.",
      reviewTopics: [{ topic: "Cardiac Pharmacology", reason: "Low quiz score", priority: "high" }, { topic: "ECG Interpretation", reason: "Upcoming exam", priority: "high" }],
      suggestedActivities: [{ activity: "Review notes", topic: "Cardiac Pharmacology", duration: 45 }, { activity: "Flashcards", topic: "ECG Interpretation", duration: 30 }],
      completed: true, createdAt: Date.now() - 24 * 60 * 60 * 1000
    },
  ]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Sync timeInput when availableTime changes from outside (e.g. initial load or programmatic change)
  useEffect(() => {
    setTimeInput(availableTime.toString());
  }, [availableTime]);

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeInput(e.target.value); // Allow user to type anything temporarily
  };

  const handleTimeInputBlur = () => {
    let numValue = parseInt(timeInput, 10);
    if (isNaN(numValue) || numValue < 15) {
        numValue = 15;
        if (timeInput !== "15") { // Only show toast if it was actually changed
            toast.info("Minimum study time is 15 minutes.", { duration: 2000 });
        }
    }
    setAvailableTime(numValue); // Update the actual numeric state
    setTimeInput(numValue.toString()); // Sync back the input field display
  };


  const handleGenerateDigest = () => {
    // Ensure availableTime (the numeric state) is used and validated
    const finalAvailableTime = Math.max(15, availableTime);
    if (finalAvailableTime !== availableTime) { // If it was adjusted from input blur state
        setAvailableTime(finalAvailableTime);
        setTimeInput(finalAvailableTime.toString()); // Ensure input also reflects this
    }

    if (finalAvailableTime < 15) {
        toast.error("Please allocate at least 15 minutes for the study digest.");
        return;
    }

    setGeneratingDigest(true);
    setError(null);
    setCurrentDigest(null);

    setTimeout(() => {
      const reviewTopics: ReviewTopic[] = [
        { topic: "Renal Physiology", reason: "Upcoming exam", priority: "high" },
        { topic: "Acid-Base Balance", reason: "Low confidence", priority: "high" },
        { topic: "Electrolyte Disorders", reason: "Spaced repetition", priority: "medium" },
      ];
      const baseDurationPerActivity = Math.floor(finalAvailableTime / reviewTopics.length) || 15;
      const suggestedActivities: SuggestedActivity[] = reviewTopics.map((rt, i) => ({
        activity: i % 2 === 0 ? "Focused Review" : "Practice Questions",
        topic: rt.topic,
        duration: baseDurationPerActivity,
      }));

      const newDigest: DailyDigest = {
        _id: `temp_${Date.now()}` as Id<"dailyDigests">, userId, date: Date.now(),
        summary: `Today's digest focuses on ${reviewTopics.map(rt => rt.topic).join(', ')}, tailored for your ${formatDuration(finalAvailableTime)} study time.`,
        reviewTopics, suggestedActivities, completed: false, createdAt: Date.now()
      };
      setCurrentDigest(newDigest);
      setActivityCompletions(new Array(suggestedActivities.length).fill(false));
      setGeneratingDigest(false);
      toast.success("Your Daily Digest is ready!");
    }, 2000);
  };

  const handleCompleteDigestActivities = () => {
    if (!currentDigest) return;
    const updatedDigest = { ...currentDigest, completed: true };
    setCurrentDigest(updatedDigest);
    setPreviousDigests(prev => [updatedDigest, ...prev.filter(d => d._id !== updatedDigest._id)]);
    toast.success("Great job completing your digest for today!");
  };

  const handleToggleActivity = (index: number) => {
    const newCompletions = [...activityCompletions];
    newCompletions[index] = !newCompletions[index];
    setActivityCompletions(newCompletions);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return <Badge className={`text-xs ${darkMode ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200'}`}>High</Badge>;
      case 'medium': return <Badge className={`text-xs ${darkMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>Medium</Badge>;
      case 'low': return <Badge className={`text-xs ${darkMode ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200'}`}>Low</Badge>;
      default: return <Badge variant="secondary" className="text-xs">{priority}</Badge>;
    }
  };

  const getActivityIcon = (activity: string) => {
    const actLower = activity.toLowerCase();
    if (actLower.includes('review') || actLower.includes('notes')) return <BookOpenIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
    if (actLower.includes('flashcard')) return <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400" />;
    if (actLower.includes('quiz') || actLower.includes('question')) return <Brain className="h-4 w-4 text-orange-500 dark:text-orange-400" />;
    return <ListTodo className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
  };
  
  const digestProgress = useMemo(() => {
    if (!currentDigest || activityCompletions.length === 0) return 0;
    const completedCount = activityCompletions.filter(Boolean).length;
    return Math.round((completedCount / activityCompletions.length) * 100);
  }, [activityCompletions, currentDigest]);

  const renderDigestGenerator = () => (
    <Card className={`shadow-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
      <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
        <div className="flex items-center gap-3">
            <Sparkles className={`h-6 w-6 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`} />
            <CardTitle className={`text-xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Generate Your Daily Digest</CardTitle>
        </div>
        <CardDescription className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
          Get AI-recommended topics and activities for today's study session.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div>
          <label htmlFor="availableTime" className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
            How much time can you study today?
          </label>
          <div className="flex items-center gap-3">
            <Input
              id="availableTime" type="number"
              // min="15" // HTML5 min can still provide some browser-level UX
              step="15"
              value={timeInput} // Bind to the string state
              onChange={handleTimeInputChange}
              onBlur={handleTimeInputBlur} // Validate and update numeric state on blur
              className={`w-32 h-10 rounded-md ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}
            />
            <span className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-600'}`}>
                minutes ({formatDuration(availableTime)}) {/* Display based on the actual numeric availableTime */}
            </span>
          </div>
        </div>
        {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle className="h-4 w-4"/>{error}</p>}
      </CardContent>
      <CardFooter className={`border-t p-5 sm:p-6 ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
        <Button onClick={handleGenerateDigest} disabled={generatingDigest} className={`w-full rounded-lg shadow-md text-base py-3 ${darkMode ? 'bg-sky-500 hover:bg-sky-400' : 'bg-sky-600 hover:bg-sky-700'}`}>
          {generatingDigest ? <Loader2 className="h-5 w-5 mr-2 animate-spin"/> : <Sparkles className="h-5 w-5 mr-2" />}
          {generatingDigest ? "Crafting Your Digest..." : "Generate My Digest"}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderActiveDigest = () => {
    if (!currentDigest) return null;
    return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}>
      <Card className={`shadow-2xl rounded-xl overflow-hidden mb-8 ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className={`p-5 sm:p-6 ${darkMode ? 'bg-gradient-to-br from-sky-600/30 to-sky-700/30 border-b border-sky-500/30' : 'bg-gradient-to-br from-sky-50 to-blue-50 border-b border-sky-100'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <Sparkles className={`h-6 w-6 ${darkMode ? 'text-sky-300':'text-sky-500'}`} />
                        <CardTitle className={`text-2xl font-bold ${darkMode ? 'text-neutral-50':'text-gray-800'}`}>Today's Study Focus</CardTitle>
                    </div>
                    <CardDescription className={`text-sm ${darkMode ? 'text-sky-200':'text-sky-700'}`}>{formatDateForDigest(currentDigest.date)}</CardDescription>
                </div>
                {!currentDigest.completed && (
                    <Button size="sm" onClick={handleCompleteDigestActivities} disabled={digestProgress < 100} className={`rounded-md shadow ${digestProgress < 100 ? (darkMode ? 'bg-neutral-600 text-neutral-400' : 'bg-gray-300 text-gray-500') : (darkMode ? 'bg-green-500 hover:bg-green-400':'bg-green-600 hover:bg-green-700') }`}>
                        <ClipboardCheck className="h-4 w-4 mr-1.5"/> Mark Day as Complete
                    </Button>
                )}
            </div>
            <p className={`mt-3 text-sm leading-relaxed ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>{currentDigest.summary}</p>
             {currentDigest.suggestedActivities.length > 0 && !currentDigest.completed && (
                <div className="mt-3">
                    <div className="flex justify-between items-center text-xs mb-0.5">
                        <span className={darkMode ? 'text-neutral-300' : 'text-gray-600'}>Daily Progress</span>
                        <span className={`font-semibold ${darkMode ? 'text-sky-300' : 'text-sky-600'}`}>{digestProgress}%</span>
                    </div>
                    <Progress value={digestProgress} className={`h-2 ${darkMode ? 'bg-neutral-700' : 'bg-sky-100'} [&>*]:bg-sky-500`} />
                </div>
            )}
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
            {currentDigest.completed ? (
                 <div className="text-center py-8">
                    <CheckCircle2 className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                    <h3 className={`text-xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Amazing Work Today!</h3>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-600'}`}>You've completed all suggested activities for this digest.</p>
                    <Button onClick={() => setCurrentDigest(null)} className="mt-6 rounded-lg">
                        <RotateCcw className="h-4 w-4 mr-2"/> Generate New Digest
                    </Button>
                </div>
            ) : (
            <>
            <section>
                <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}><Target className="h-5 w-5"/>Priority Review Topics</h3>
                <div className="space-y-3">
                {currentDigest.reviewTopics.map((topic, index) => (
                    <motion.div key={index} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: index * 0.1}}
                        className={`p-3.5 rounded-lg border ${darkMode ? 'bg-neutral-700/50 border-neutral-600' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className={`font-medium ${darkMode ? 'text-neutral-100' : 'text-gray-700'}`}>{topic.topic}</h4>
                                <p className={`text-xs italic ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>{topic.reason}</p>
                            </div>
                            {getPriorityBadge(topic.priority)}
                        </div>
                    </motion.div>
                ))}
                </div>
            </section>

            <section>
                <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}><ListTodo className="h-5 w-5"/>Suggested Activities</h3>
                <div className="space-y-3">
                {currentDigest.suggestedActivities.map((activity, index) => (
                    <motion.div key={index} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: (currentDigest.reviewTopics.length + index) * 0.1}}
                     className={`p-3.5 rounded-lg border flex items-center gap-3 transition-all duration-200
                                 ${activityCompletions[index] 
                                    ? (darkMode ? 'bg-green-500/10 border-green-500/40 opacity-70' : 'bg-green-50 border-green-300 opacity-70') 
                                    : (darkMode ? 'bg-neutral-700/50 border-neutral-600 hover:border-neutral-500' : 'bg-white border-gray-200 shadow-sm hover:shadow-md')}
                                `}>
                        <div className={`p-2 rounded-md ${darkMode ? (activityCompletions[index] ? 'bg-green-500/20' : 'bg-neutral-600') : (activityCompletions[index] ? 'bg-green-100' : 'bg-gray-100') }`}>
                            {getActivityIcon(activity.activity)}
                        </div>
                        <div className="flex-grow">
                            <h4 className={`font-medium ${darkMode ? 'text-neutral-100' : 'text-gray-800'} ${activityCompletions[index] ? 'line-through' : ''}`}>{activity.activity}: {activity.topic}</h4>
                            <div className={`text-xs flex items-center gap-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                                <Clock className="h-3 w-3"/> {formatDuration(activity.duration)}
                            </div>
                        </div>
                        <Button
                            size="icon" // Changed from sm to icon for consistency
                            variant={activityCompletions[index] ? "ghost" : "outline"}
                            onClick={() => handleToggleActivity(index)}
                            className={`rounded-full h-8 w-8 flex-shrink-0 ${activityCompletions[index] ? (darkMode ? 'bg-green-500/30 text-green-300 hover:bg-green-500/40' : 'bg-green-100 text-green-600 hover:bg-green-200') : (darkMode ? 'border-neutral-500 hover:bg-neutral-600' : 'border-gray-300 hover:bg-gray-100') }`}
                            title={activityCompletions[index] ? "Mark Incomplete" : "Mark Complete"}
                        >
                            {activityCompletions[index] ? <CheckCircle2 className="h-4 w-4"/> : <div className={`h-4 w-4 rounded-full border-2 ${darkMode ? 'border-neutral-500':'border-gray-400'}`}></div>}
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
    <div className={`space-y-8 ${darkMode ? 'text-neutral-200' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center">
            <div className={`p-2.5 mr-3 rounded-xl shadow-md ${darkMode ? 'bg-sky-500' : 'bg-sky-600'}`}>
                <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
                <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`}>Daily Study Digest</h1>
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Your AI-curated study plan for today.</p>
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

      {currentDigest ? renderActiveDigest() : renderDigestGenerator()}

      {previousDigests.length > 0 && (
        <Card className={`shadow-lg overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className={`cursor-pointer p-4 sm:p-5 border-b ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`} onClick={() => setShowHistory(!showHistory)}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <Clock className={`h-5 w-5 ${darkMode ? 'text-neutral-300' : 'text-gray-600'}`} />
                        <CardTitle className={`text-md font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Past Digests</CardTitle>
                    </div>
                    {showHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
            </CardHeader>
            <AnimatePresence>
            {showHistory && (
                <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <CardContent className="p-4 sm:p-5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {previousDigests.map((digest) => (
                        <Card key={digest._id} className={`p-3 rounded-lg border ${darkMode ? 'bg-neutral-700/50 border-neutral-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`font-medium text-sm ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>{formatDateForDigest(digest.date)}</h4>
                                <Badge className={`text-xs ${digest.completed ? (darkMode ? 'bg-green-500/20 text-green-300 border-green-500/30':'bg-green-100 text-green-700 border-green-200') : (darkMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30':'bg-yellow-100 text-yellow-700 border-yellow-200')}`}>
                                    {digest.completed ? <CheckCircle2 className="h-3 w-3 mr-1"/> : <Clock className="h-3 w-3 mr-1"/>}{digest.completed ? 'Completed' : 'Incomplete'}
                                </Badge>
                            </div>
                            <p className={`text-xs line-clamp-2 ${darkMode ? 'text-neutral-400' : 'text-gray-600'}`}>{digest.summary}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                {digest.reviewTopics.slice(0,2).map(rt => <Badge key={rt.topic} variant="secondary" className={`text-xs ${darkMode ? 'bg-neutral-600 text-neutral-300':'bg-gray-200 text-gray-500'}`}>{rt.topic}</Badge>)}
                                {digest.reviewTopics.length > 2 && <Badge variant="secondary" className={`text-xs ${darkMode ? 'bg-neutral-600 text-neutral-300':'bg-gray-200 text-gray-500'}`}>+{digest.reviewTopics.length-2} more</Badge>}
                            </div>
                        </Card>
                    ))}
                </CardContent>
                </motion.section>
            )}
            </AnimatePresence>
        </Card>
      )}

      <Card className={`shadow-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
            <div className="flex items-center gap-3">
                <TrendingUp className={`h-6 w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <CardTitle className={`text-xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Study Statistics</CardTitle>
            </div>
          <CardDescription className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
            Overview of your study patterns and digest completion.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
            {[
              { title: "Digest Completion", Icon: ClipboardCheck, value: `${previousDigests.length > 0 ? Math.round((previousDigests.filter(d => d.completed).length / previousDigests.length) * 100) : 0}%`, desc: `${previousDigests.filter(d => d.completed).length} of ${previousDigests.length} digests` },
              { title: "Total Study Time", Icon: Clock, value: formatDuration(previousDigests.filter(d=>d.completed).reduce((total, d) => total + d.suggestedActivities.reduce((sum, act) => sum + act.duration, 0), 0)), desc: "From completed digests" },
              { title: "Top Focus Area", Icon: PieChartIcon, value: previousDigests.flatMap(d => d.reviewTopics).reduce((acc, topic) => { acc[topic.topic] = (acc[topic.topic] || 0) + 1; return acc; }, {} as Record<string, number>)[Object.keys(previousDigests.flatMap(d => d.reviewTopics).reduce((acc, topic) => { acc[topic.topic] = (acc[topic.topic] || 0) + 1; return acc; }, {} as Record<string, number>)).sort((a,b) => previousDigests.flatMap(d => d.reviewTopics).reduce((acc, topic) => { acc[topic.topic] = (acc[topic.topic] || 0) + 1; return acc; }, {} as Record<string, number>)[b] - previousDigests.flatMap(d => d.reviewTopics).reduce((acc, topic) => { acc[topic.topic] = (acc[topic.topic] || 0) + 1; return acc; }, {} as Record<string, number>)[a])[0]] || "N/A", desc: "Most frequent review topic" },
            ].map(stat => (
                <Card key={stat.title} className={`p-4 rounded-lg shadow ${darkMode ? 'bg-neutral-700/70 border-neutral-600' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col items-center md:items-start">
                        <div className={`p-2 rounded-full mb-2 ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                            <stat.Icon className={`h-5 w-5 ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
                        </div>
                        <p className={`text-2xl font-bold ${darkMode ? 'text-neutral-50' : 'text-gray-800'}`}>{stat.value}</p>
                        <p className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>{stat.title}</p>
                        <p className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{stat.desc}</p>
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
