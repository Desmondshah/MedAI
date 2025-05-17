import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card"; // Assuming path is correct
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  CalendarDays,
  CalendarCheck2, // Changed from Calendar for active plan
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Edit3,
  Trash2,
  ListChecks, // For tasks/sessions
  Target,     // For goals
  Award,      // For exams
  Sparkles,   // For AI generation
  Loader2,    // For loading
  Settings2,  // For plan settings
  AlertCircle, // For errors
  CheckCircle2, // For completion
  XCircle,    // For incomplete
  Sun, Moon,   // For theme toggle
  ArrowRight, // For next step or view
  RotateCcw,  // For regenerate/reset
  Info,
  Clock,       // For info messages
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { StudyPlan, StudyGoal, Exam, DailyPlan, StudySession } from "../../../convex/types"; // Assuming types are correctly imported
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "./progress";
// You might want a date picker component eventually. For now, using Input type="date".

interface UserAwareProps {
  userId: Id<"users">;
}

// Helper to format date ranges
const formatDateRange = (startDate: number, endDate: number) => {
    const start = new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const end = new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
};

const StudyPlanTab: React.FC<UserAwareProps> = ({ userId }) => {
  // --- Plan Creation State ---
  const [planStartDate, setPlanStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0] // Tomorrow
  );
  const [planEndDate, setPlanEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] // 7 days from now
  );
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  // --- Goal Form State ---
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudyGoal | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTopics, setGoalTopics] = useState("");
  const [goalPriority, setGoalPriority] = useState("medium");
  const [goalDate, setGoalDate] = useState("");

  // --- Exam Form State ---
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [examTopics, setExamTopics] = useState("");
  const [examImportance, setExamImportance] = useState("major");
  const [examDate, setExamDate] = useState("");

  // --- Active Plan State ---
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<StudyPlan | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null); // Store index instead of object for easier updates

  // --- UI State ---
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false); // Local theme toggle for this tab

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);


  // --- CRUD for Goals (Local State) ---
  const resetGoalForm = () => {
    setGoalTitle(""); setGoalTopics(""); setGoalPriority("medium"); setGoalDate(""); setEditingGoal(null); setShowGoalForm(false);
  };

  const handleSaveGoal = () => {
    if (!goalTitle.trim() || !goalTopics.trim() || !goalDate) {
      toast.error("Please fill in all goal fields.");
      return;
    }
    const newGoal: StudyGoal = {
      _id: editingGoal ? editingGoal._id : (`temp_goal_${Date.now()}` as Id<"studyGoals">),
      userId, title: goalTitle.trim(), topics: goalTopics.split(",").map(t => t.trim()).filter(Boolean),
      priority: goalPriority, targetDate: new Date(goalDate).getTime(), completed: editingGoal?.completed || false,
      createdAt: editingGoal?.createdAt || Date.now(), description: "" // Add description if needed
    };
    if (editingGoal) {
      setGoals(goals.map(g => g._id === newGoal._id ? newGoal : g));
      toast.success("Goal updated!");
    } else {
      setGoals([...goals, newGoal]);
      toast.success("Goal added!");
    }
    resetGoalForm();
  };

  const handleEditGoal = (goal: StudyGoal) => {
    setEditingGoal(goal); setGoalTitle(goal.title); setGoalTopics(goal.topics.join(", "));
    setGoalPriority(goal.priority); setGoalDate(new Date(goal.targetDate).toISOString().split("T")[0]);
    setShowGoalForm(true);
  };

  const handleDeleteGoal = (goalId: Id<"studyGoals">) => {
    setGoals(goals.filter(g => g._id !== goalId));
    toast.info("Goal removed.");
  };

  // --- CRUD for Exams (Local State) ---
    const resetExamForm = () => {
    setExamTitle(""); setExamTopics(""); setExamImportance("major"); setExamDate(""); setEditingExam(null); setShowExamForm(false);
  };

  const handleSaveExam = () => {
    if (!examTitle.trim() || !examTopics.trim() || !examDate) {
      toast.error("Please fill in all exam fields.");
      return;
    }
    const newExam: Exam = {
      _id: editingExam ? editingExam._id : (`temp_exam_${Date.now()}` as Id<"examDates">),
      userId, title: examTitle.trim(), topics: examTopics.split(",").map(t => t.trim()).filter(Boolean),
      importance: examImportance, date: new Date(examDate).getTime(),
      createdAt: editingExam?.createdAt || Date.now(), description: ""
    };
    if (editingExam) {
      setExams(exams.map(e => e._id === newExam._id ? newExam : e));
      toast.success("Exam updated!");
    } else {
      setExams([...exams, newExam]);
      toast.success("Exam added!");
    }
    resetExamForm();
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam); setExamTitle(exam.title); setExamTopics(exam.topics.join(", "));
    setExamImportance(exam.importance); setExamDate(new Date(exam.date).toISOString().split("T")[0]);
    setShowExamForm(true);
  };

  const handleDeleteExam = (examId: Id<"examDates">) => {
    setExams(exams.filter(e => e._id !== examId));
    toast.info("Exam removed.");
  };


  const handleGeneratePlan = () => {
    setGeneratingPlan(true);
    setError(null);
    const startTimestamp = new Date(planStartDate).getTime();
    const endTimestamp = new Date(planEndDate).getTime();

    if (endTimestamp < startTimestamp) {
      setError("End date must be after start date.");
      setGeneratingPlan(false);
      return;
    }
    if(goals.length === 0 && exams.length === 0) {
        toast.error("Please add at least one goal or exam to generate a plan.");
        setGeneratingPlan(false);
        return;
    }

    // TODO: Replace MOCK with actual AI call to api.ai.generateStudyPlan
    // const aiPlan = await generateStudyPlanAction({ userId, startDate: startTimestamp, endDate: endTimestamp, goals, exams, progressData: [], preferences: {...} });
    // For now, using enhanced mock generation:
    setTimeout(() => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dailyPlans: DailyPlan[] = [];
      const numDays = Math.max(1, Math.min(Math.floor((endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000)) + 1, 14)); // Limit to 14 days for mock

      for (let i = 0; i < numDays; i++) {
        const currentDate = new Date(startTimestamp + i * 24 * 60 * 60 * 1000);
        const dayName = days[currentDate.getDay()];
        const sessions: StudySession[] = [];

        // Mock sessions based on goals/exams
        const relevantGoal = goals[i % goals.length] || { title: "General Review", topics: ["Topic A"] };
        const relevantExam = exams[i % exams.length] || { title: "Upcoming Assessment", topics: ["Topic B"] };

        sessions.push({
          startTime: "09:00", endTime: "10:30", topic: relevantGoal.topics[0] || relevantGoal.title,
          activity: "Focused Study", description: `Work on goal: ${relevantGoal.title}`, completed: false,
        });
        sessions.push({
          startTime: "11:00", endTime: "12:00", topic: relevantExam.topics[0] || relevantExam.title,
          activity: "Practice Questions", description: `Prepare for: ${relevantExam.title}`, completed: false,
        });
         if (i % 2 === 0) { // Add more sessions on some days
            sessions.push({
              startTime: "14:00", endTime: "15:30", topic: "Consolidation",
              activity: "Flashcard Review", description: `Review key concepts from morning.`, completed: false,
            });
        }

        dailyPlans.push({ day: dayName, date: currentDate.getTime(), sessions });
      }

      const newPlan: StudyPlan = {
        _id: `plan_${Date.now()}` as Id<"studyPlans">, userId,
        title: `Study Plan: ${formatDateRange(startTimestamp, endTimestamp)}`,
        startDate: startTimestamp, endDate: endTimestamp, dailyPlans, createdAt: Date.now(),
      };
      setCurrentPlan(newPlan);
      setSelectedDayIndex(0); // Select the first day by default
      setGeneratingPlan(false);
      toast.success("Study plan generated successfully!");
    }, 2000);
  };

  const calculateDayCompletion = (day: DailyPlan): number => {
    if (!day.sessions || day.sessions.length === 0) return 0;
    const completedSessions = day.sessions.filter(s => s.completed).length;
    return Math.round((completedSessions / day.sessions.length) * 100);
  };

  const handleToggleSession = (dayIdx: number, sessionIdx: number) => {
    if (!currentPlan) return;
    const updatedPlan = { ...currentPlan };
    const updatedDailyPlans = [...updatedPlan.dailyPlans];
    const dayToUpdate = { ...updatedDailyPlans[dayIdx] };
    const updatedSessions = [...dayToUpdate.sessions];
    updatedSessions[sessionIdx] = { ...updatedSessions[sessionIdx], completed: !updatedSessions[sessionIdx].completed };
    dayToUpdate.sessions = updatedSessions;
    updatedDailyPlans[dayIdx] = dayToUpdate;
    updatedPlan.dailyPlans = updatedDailyPlans;
    setCurrentPlan(updatedPlan);
    // If backend is used, call mutation here:
    // updateSessionCompletionMutation({ planId: currentPlan._id, dayIndex: dayIdx, sessionIndex: sessionIdx, completed: updatedSessions[sessionIdx].completed });
    toast.success(updatedSessions[sessionIdx].completed ? "Session marked complete!" : "Session marked incomplete.");
  };
  
  const selectedDayPlan = currentPlan && selectedDayIndex !== null ? currentPlan.dailyPlans[selectedDayIndex] : null;

  // Render logic
  const renderPlanSetup = () => (
    <Card className={`shadow-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
      <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
        <div className="flex items-center gap-3">
            <Sparkles className={`h-6 w-6 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`} />
            <CardTitle className={`text-xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Create Your Personalized Study Plan</CardTitle>
        </div>
        <CardDescription className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
          Define your goals, exams, and schedule to generate a tailored plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Plan Duration */}
        <div className="space-y-3 p-4 rounded-lg border_dark:border-neutral-700_bg-opacity-50 dark:bg-neutral-700/30">
            <h3 className={`text-md font-semibold flex items-center gap-2 ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}><CalendarDays className="h-5 w-5"/>Plan Duration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="planStartDate" className={`block text-xs font-medium mb-1 ${darkMode ? 'text-neutral-400' : 'text-gray-600'}`}>Start Date</label>
                    <Input id="planStartDate" type="date" value={planStartDate} onChange={(e) => setPlanStartDate(e.target.value)} className={`rounded-md h-10 ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}/>
                </div>
                <div>
                    <label htmlFor="planEndDate" className={`block text-xs font-medium mb-1 ${darkMode ? 'text-neutral-400' : 'text-gray-600'}`}>End Date</label>
                    <Input id="planEndDate" type="date" value={planEndDate} onChange={(e) => setPlanEndDate(e.target.value)} className={`rounded-md h-10 ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}/>
                </div>
            </div>
        </div>

        {/* Study Goals Section */}
        <RenderItemsSection
            title="Study Goals" Icon={Target} items={goals} onAddItem={() => { resetGoalForm(); setShowGoalForm(true);}}
            onEditItem={handleEditGoal as any} onDeleteItem={handleDeleteGoal as any} darkMode={darkMode}
            renderItem={(goal: StudyGoal) => (
                <>
                    <div className="font-medium">{goal.title}</div>
                    <div className="text-xs text-gray-500 dark:text-neutral-400">Target: {new Date(goal.targetDate).toLocaleDateString()} | Priority: <span className={`capitalize font-semibold ${goal.priority === 'high' ? 'text-red-500' : goal.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>{goal.priority}</span></div>
                    <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1 truncate">Topics: {goal.topics.join(', ')}</div>
                </>
            )}
        />

        {/* Exams Section */}
         <RenderItemsSection
            title="Upcoming Exams" Icon={Award} items={exams} onAddItem={() => { resetExamForm(); setShowExamForm(true);}}
            onEditItem={handleEditExam as any} onDeleteItem={handleDeleteExam as any} darkMode={darkMode}
            renderItem={(exam: Exam) => (
                <>
                    <div className="font-medium">{exam.title}</div>
                    <div className="text-xs text-gray-500 dark:text-neutral-400">Date: {new Date(exam.date).toLocaleDateString()} | Importance: <span className={`capitalize font-semibold ${exam.importance === 'major' ? 'text-red-500' : 'text-yellow-500'}`}>{exam.importance}</span></div>
                    <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1 truncate">Topics: {exam.topics.join(', ')}</div>
                </>
            )}
        />

        {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle className="h-4 w-4"/>{error}</p>}
      </CardContent>
      <CardFooter className={`border-t p-5 sm:p-6 ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
        <Button onClick={handleGeneratePlan} disabled={generatingPlan} className={`w-full rounded-lg shadow-md text-base py-3 ${darkMode ? 'bg-sky-500 hover:bg-sky-400' : 'bg-sky-600 hover:bg-sky-700'}`}>
          {generatingPlan ? <Loader2 className="h-5 w-5 mr-2 animate-spin"/> : <Sparkles className="h-5 w-5 mr-2" />}
          {generatingPlan ? "Generating Your Plan..." : "Generate Smart Study Plan"}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderActivePlan = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Weekly Overview Column */}
        <Card className={`lg:col-span-1 shadow-xl rounded-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className="flex items-center gap-3">
                    <CalendarCheck2 className={`h-6 w-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                    <CardTitle className={`text-lg font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Plan: {currentPlan?.title}</CardTitle>
                </div>
                <CardDescription className={`text-xs mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                    {currentPlan ? formatDateRange(currentPlan.startDate, currentPlan.endDate) : ''}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {currentPlan?.dailyPlans.map((day, index) => {
                const completion = calculateDayCompletion(day);
                return (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
                                ${selectedDayIndex === index 
                                    ? (darkMode ? 'bg-green-500/20 border-green-500 shadow-green-500/20' : 'bg-green-50 border-green-400 shadow-green-500/10')
                                    : (darkMode ? 'bg-neutral-700/50 border-neutral-600 hover:border-neutral-500' : 'bg-white border-gray-200 hover:border-gray-300')}
                              `}
                    onClick={() => setSelectedDayIndex(index)}
                >
                    <div className="flex justify-between items-center mb-1">
                    <div className={`font-semibold text-sm ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{day.day} <span className={`text-xs font-normal ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>({new Date(day.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})})</span></div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${completion === 100 ? (darkMode ? 'bg-green-500/80 text-white' : 'bg-green-500 text-white') : (darkMode ? 'bg-neutral-600 text-neutral-300' : 'bg-gray-200 text-gray-600')}`}>
                        {day.sessions.length} session{day.sessions.length !== 1 && 's'}
                    </span>
                    </div>
                    <Progress value={completion} className={`h-1.5 ${completion === 100 ? 'progress-bar-green' : ''}`} />
                    <div className="text-xs text-right mt-1 text-gray-500 dark:text-neutral-400">{completion}% done</div>
                </motion.div>
                );
            })}
            </CardContent>
             <CardFooter className={`border-t p-4 ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                <Button variant="outline" className="w-full rounded-lg" onClick={() => { setCurrentPlan(null); setSelectedDayIndex(null); toast.info("Current plan cleared. Set up a new one!"); }}>
                    <RotateCcw className="h-4 w-4 mr-2"/> Create New Plan
                </Button>
            </CardFooter>
        </Card>

        {/* Daily Schedule Column */}
        <Card className={`lg:col-span-2 shadow-xl rounded-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                 <div className="flex items-center gap-3">
                    <ListChecks className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <CardTitle className={`text-lg font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>
                        {selectedDayPlan ? `${selectedDayPlan.day}'s Schedule` : "Select a Day"}
                    </CardTitle>
                </div>
                <CardDescription className={`text-xs mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                    {selectedDayPlan ? new Date(selectedDayPlan.date).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : "Click a day on the left to see its schedule."}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {selectedDayPlan && selectedDayPlan.sessions.length > 0 ? (
                selectedDayPlan.sessions.map((session, sIndex) => (
                <motion.div
                    key={sIndex}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: sIndex * 0.05 }}
                    className={`p-3.5 rounded-lg border relative overflow-hidden transition-all duration-200
                                ${session.completed 
                                    ? (darkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-300')
                                    : (darkMode ? 'bg-neutral-700/50 border-neutral-600' : 'bg-white border-gray-200 shadow-sm hover:shadow-md')}
                              `}
                >
                    {session.completed && <div className={`absolute top-0 right-0 h-full w-1 ${darkMode ? 'bg-green-500/50':'bg-green-400'}`}></div>}
                    <div className="flex justify-between items-start gap-3">
                    <div className="flex-grow">
                        <div className="flex items-center mb-0.5">
                            <Clock className={`h-3.5 w-3.5 mr-1.5 flex-shrink-0 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`} />
                            <span className={`font-semibold text-sm ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{session.startTime} - {session.endTime}</span>
                        </div>
                        <h4 className={`text-md font-medium mt-1 ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>{session.topic}</h4>
                        <p className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Activity: {session.activity}</p>
                        {session.description && <p className={`text-xs mt-1 italic ${darkMode ? 'text-neutral-500' : 'text-gray-500'}`}>{session.description}</p>}
                    </div>
                    <Button
                        size="sm"
                        variant={session.completed ? "outline" : "default"}
                        onClick={() => handleToggleSession(selectedDayIndex!, sIndex)}
                        className={`rounded-md text-xs h-8 px-3 whitespace-nowrap shadow ${session.completed ? (darkMode ? 'border-green-500/50 text-green-300 bg-transparent hover:bg-green-500/20' : 'border-green-300 text-green-600 bg-white hover:bg-green-50') : (darkMode ? 'bg-blue-600 hover:bg-blue-500':'bg-blue-500 hover:bg-blue-600') }`}
                    >
                        {session.completed ? <CheckCircle2 className="h-3.5 w-3.5 mr-1.5"/> : <XCircle className="h-3.5 w-3.5 mr-1.5 opacity-70"/>}
                        {session.completed ? "Completed" : "Mark Done"}
                    </Button>
                    </div>
                </motion.div>
                ))
            ) : selectedDayPlan && selectedDayPlan.sessions.length === 0 ? (
                <div className={`text-center py-10 rounded-lg ${darkMode ? 'bg-neutral-700/30' : 'bg-gray-50'}`}>
                    <CalendarDays className={`h-10 w-10 mx-auto mb-2 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
                    <p className={`${darkMode ? 'text-neutral-300' : 'text-gray-600'}`}>No study sessions scheduled for this day.</p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>Enjoy your break or add some tasks!</p>
                </div>
            ) : (
                 <div className={`text-center py-10 rounded-lg ${darkMode ? 'bg-neutral-700/30' : 'bg-gray-50'}`}>
                    <Info className={`h-10 w-10 mx-auto mb-2 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
                    <p className={`${darkMode ? 'text-neutral-300' : 'text-gray-600'}`}>Select a day from the overview to see its schedule.</p>
                </div>
            )}
            </CardContent>
        </Card>
    </div>
  );

  return (
    <div className={`space-y-8 ${darkMode ? 'text-neutral-200' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
                <div className={`p-2.5 mr-3 rounded-xl shadow-md ${darkMode ? 'bg-sky-500' : 'bg-sky-600'}`}>
                    <CalendarDays className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`}>Study Planner</h1>
                    <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Organize your study sessions, goals, and exams effectively.</p>
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

      {currentPlan ? renderActivePlan() : renderPlanSetup()}

      {/* Modals for Goal and Exam Forms */}
      <AnimatePresence>
        {(showGoalForm || showExamForm) && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => {setShowGoalForm(false); setShowExamForm(false);}} // Close on backdrop click
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                    className={`rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}
                >
                    {showGoalForm && (
                        <>
                        <CardHeader className={`border-b ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-green-500"/>{editingGoal ? "Edit Study Goal" : "Add New Study Goal"}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <Input placeholder="Goal title (e.g., Master Cardiac Physiology)" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} className={`rounded-md ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}/>
                            <Textarea placeholder="Topics involved (comma-separated, e.g., ECG, Heart Sounds, Cardiac Cycle)" value={goalTopics} onChange={(e) => setGoalTopics(e.target.value)} className={`rounded-md min-h-[80px] ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}/>
                            <div className="grid grid-cols-2 gap-4">
                                <select value={goalPriority} onChange={(e) => setGoalPriority(e.target.value)} className={`rounded-md h-10 px-3 border w-full ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-gray-300'}`}>
                                    <option value="high">High Priority</option> <option value="medium">Medium Priority</option> <option value="low">Low Priority</option>
                                </select>
                                <Input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} className={`rounded-md ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}/>
                            </div>
                        </CardContent>
                        <CardFooter className={`border-t flex justify-end gap-2 p-4 ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                            <Button variant="ghost" onClick={resetGoalForm}>Cancel</Button>
                            <Button onClick={handleSaveGoal}>{editingGoal ? "Update Goal" : "Save Goal"}</Button>
                        </CardFooter>
                        </>
                    )}
                     {showExamForm && (
                        <>
                        <CardHeader className={`border-b ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-red-500"/>{editingExam ? "Edit Exam" : "Add New Exam"}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <Input placeholder="Exam title (e.g., USMLE Step 1, Cardiology Block Exam)" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className={`rounded-md ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}/>
                            <Textarea placeholder="Topics covered (comma-separated)" value={examTopics} onChange={(e) => setExamTopics(e.target.value)} className={`rounded-md min-h-[80px] ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}/>
                             <div className="grid grid-cols-2 gap-4">
                                <select value={examImportance} onChange={(e) => setExamImportance(e.target.value)} className={`rounded-md h-10 px-3 border w-full ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-gray-300'}`}>
                                    <option value="major">Major Exam</option> <option value="minor">Minor Quiz/Exam</option>
                                </select>
                                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={`rounded-md ${darkMode ? 'bg-neutral-700 border-neutral-600' : ''}`}/>
                            </div>
                        </CardContent>
                        <CardFooter className={`border-t flex justify-end gap-2 p-4 ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                            <Button variant="ghost" onClick={resetExamForm}>Cancel</Button>
                            <Button onClick={handleSaveExam}>{editingExam ? "Update Exam" : "Save Exam"}</Button>
                        </CardFooter>
                        </>
                    )}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Generic component for rendering lists of items (goals/exams) in the setup phase
interface RenderItemsSectionProps<T extends { _id: Id<any>, title: string }> {
    title: string;
    Icon: React.ElementType;
    items: T[];
    onAddItem: () => void;
    onEditItem: (item: T) => void;
    onDeleteItem: (itemId: Id<any>) => void;
    renderItem: (item: T) => React.ReactNode;
    darkMode: boolean;
}

const RenderItemsSection = <T extends { _id: Id<any>, title: string }>({ title, Icon, items, onAddItem, onEditItem, onDeleteItem, renderItem, darkMode }: RenderItemsSectionProps<T>) => (
    <div className="space-y-3 p-4 rounded-lg border_dark:border-neutral-700_bg-opacity-50 dark:bg-neutral-700/30">
        <div className="flex justify-between items-center mb-2">
            <h3 className={`text-md font-semibold flex items-center gap-2 ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}><Icon className="h-5 w-5"/>{title} ({items.length})</h3>
            <Button variant="outline" size="sm" onClick={onAddItem} className={`rounded-md text-xs ${darkMode ? 'border-neutral-600 hover:bg-neutral-600' : 'border-gray-300 hover:bg-gray-100'}`}>
                <PlusCircle className="h-3.5 w-3.5 mr-1.5"/> Add New
            </Button>
        </div>
        {items.length === 0 ? (
            <p className={`text-xs text-center py-3 rounded-md ${darkMode ? 'text-neutral-500 bg-neutral-700/40':'text-gray-400 bg-gray-50'}`}>No {title.toLowerCase()} added yet.</p>
        ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {items.map(item => (
                <div key={item._id.toString()} className={`p-2.5 rounded-md border flex justify-between items-center group ${darkMode ? 'bg-neutral-700 border-neutral-600 hover:border-neutral-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex-grow min-w-0">{renderItem(item)}</div>
                    <div className="flex-shrink-0 ml-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${darkMode ? 'hover:bg-neutral-600 text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`} onClick={() => onEditItem(item)}><Edit3 className="h-3.5 w-3.5"/></Button>
                        <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`} onClick={() => onDeleteItem(item._id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                    </div>
                </div>
            ))}
            </div>
        )}
    </div>
);


export default StudyPlanTab;
