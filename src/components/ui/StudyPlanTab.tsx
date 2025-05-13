import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button"; 
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { CalendarDays, Calendar, BookOpen, GraduationCap } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { StudyPlan, StudyGoal, Exam, DailyPlan } from "../../../convex/types";

interface UserAwareProps {
  userId: Id<"users">;
}

const StudyPlanTab: React.FC<UserAwareProps> = ({ userId }) => {
  // State for study goals
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTopics, setGoalTopics] = useState("");
  const [goalPriority, setGoalPriority] = useState("medium");
  const [goalDate, setGoalDate] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);
  
  // State for exams
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTitle, setExamTitle] = useState("");
  const [examTopics, setExamTopics] = useState("");
  const [examImportance, setExamImportance] = useState("major");
  const [examDate, setExamDate] = useState("");
  const [showExamForm, setShowExamForm] = useState(false);
  
  // State for generated plan
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<StudyPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyPlan | null>(null);
  const [planStartDate, setPlanStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
  );
  const [planEndDate, setPlanEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] // 7 days from now
  );
  const [error, setError] = useState<string | null>(null);

  // Handle creating a goal
  const handleCreateGoal = () => {
    if (!goalTitle.trim() || !goalTopics.trim() || !goalDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // For demo purposes, just add to local state
    const newGoal: StudyGoal = {
      _id: `temp_${Date.now()}` as Id<"studyGoals">,
      userId,
      title: goalTitle.trim(),
      description: "",
      topics: goalTopics.split(",").map(t => t.trim()).filter(t => t),
      priority: goalPriority,
      targetDate: new Date(goalDate).getTime(),
      completed: false,
      createdAt: Date.now(),
    };
    
    setGoals([...goals, newGoal]);
    setGoalTitle("");
    setGoalTopics("");
    setGoalDate("");
    setShowGoalForm(false);
    toast.success("Study goal created successfully");
  };
  
  // Handle creating an exam
  const handleCreateExam = () => {
    if (!examTitle.trim() || !examTopics.trim() || !examDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // For demo purposes, just add to local state
    const newExam: Exam = {
      _id: `temp_${Date.now()}` as Id<"examDates">,
      userId,
      title: examTitle.trim(),
      description: "",
      topics: examTopics.split(",").map(t => t.trim()).filter(t => t),
      importance: examImportance,
      date: new Date(examDate).getTime(),
      createdAt: Date.now(),
    };
    
    setExams([...exams, newExam]);
    setExamTitle("");
    setExamTopics("");
    setExamDate("");
    setShowExamForm(false);
    toast.success("Exam added successfully");
  };
  
  // Generate a study plan (demo version)
  const handleGeneratePlan = () => {
    setGeneratingPlan(true);
    setError(null);
    
    // Validate dates
    const startTimestamp = new Date(planStartDate).getTime();
    const endTimestamp = new Date(planEndDate).getTime();
    
    if (endTimestamp < startTimestamp) {
      setError("End date must be after start date");
      setGeneratingPlan(false);
      return;
    }
    
    // Simulate AI-generated plan
    setTimeout(() => {
      // Create a basic 7-day plan
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const dailyPlans: DailyPlan[] = [];
      
      const startDate = new Date(planStartDate);
      const daysInPlan = Math.min(
        Math.floor((endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000)) + 1,
        7
      );
      
      for (let i = 0; i < daysInPlan; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dayName = dayNames[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1].toLowerCase();
        
        // Create sessions based on goals and exams
        const sessions = [];
        
        // Morning session based on exam topics
        if (exams.length > 0 && i < exams.length) {
          sessions.push({
            startTime: "09:00",
            endTime: "10:30",
            topic: exams[i].topics[0] || exams[i].title,
            activity: "Review notes",
            description: `Prepare for ${exams[i].title}`,
            completed: false,
          });
        } else {
          sessions.push({
            startTime: "09:00",
            endTime: "10:30",
            topic: "General review",
            activity: "Read textbook",
            description: "Cover fundamentals",
            completed: false,
          });
        }
        
        // Afternoon session based on goals
        if (goals.length > 0 && i < goals.length) {
          sessions.push({
            startTime: "14:00",
            endTime: "15:30",
            topic: goals[i].topics[0] || goals[i].title,
            activity: "Flashcards",
            description: `Work on ${goals[i].title}`,
            completed: false,
          });
        } else {
          sessions.push({
            startTime: "14:00",
            endTime: "15:30",
            topic: "Knowledge consolidation",
            activity: "Practice quiz",
            description: "Test understanding of key concepts",
            completed: false,
          });
        }
        
        dailyPlans.push({
          day: dayName,
          date: currentDate.getTime(),
          sessions,
        });
      }
      
      const newPlan: StudyPlan = {
        _id: `temp_${Date.now()}` as Id<"studyPlans">,
        userId,
        title: `Study Plan (${planStartDate} to ${planEndDate})`,
        startDate: startTimestamp,
        endDate: endTimestamp,
        dailyPlans,
        createdAt: Date.now(),
      };
      
      setCurrentPlan(newPlan);
      if (dailyPlans.length > 0) {
        setSelectedDay(dailyPlans[0]);
      }
      
      setGeneratingPlan(false);
      toast.success("Study plan generated successfully!");
    }, 2000);
  };
  
  // Calculate completion percentage for a day
  const calculateDayCompletion = (day: DailyPlan) => {
    if (!day.sessions || day.sessions.length === 0) return 0;
    const completedSessions = day.sessions.filter(s => s.completed).length;
    return Math.round((completedSessions / day.sessions.length) * 100);
  };
  
  // Toggle session completion
  const handleToggleSession = (dayIndex: number, sessionIndex: number) => {
    if (!currentPlan) return;
    
    const updatedPlan = {...currentPlan};
    const session = updatedPlan.dailyPlans[dayIndex].sessions[sessionIndex];
    session.completed = !session.completed;
    
    setCurrentPlan(updatedPlan);
    
    // Update selected day if needed
    if (selectedDay === currentPlan.dailyPlans[dayIndex]) {
      setSelectedDay({...updatedPlan.dailyPlans[dayIndex]});
    }
    
    toast.success(session.completed ? "Session marked as completed" : "Session marked as incomplete");
  };
  
  return (
    <div className="space-y-6">
      {/* Current Study Plan Section */}
      {currentPlan ? (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Weekly Overview</CardTitle>
              <CardDescription>{currentPlan.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-500">
                <CalendarDays className="inline-block mr-2 h-4 w-4" />
                {new Date(currentPlan.startDate).toLocaleDateString()} - {new Date(currentPlan.endDate).toLocaleDateString()}
              </div>
              
              <div className="space-y-2">
                {currentPlan.dailyPlans.map((day, i) => (
                  <div 
                    key={i}
                    className={`p-2 border rounded-md cursor-pointer ${selectedDay === day ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium">
                        {day.day.charAt(0).toUpperCase() + day.day.slice(1)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {calculateDayCompletion(day)}% Complete
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {day.sessions.length} study sessions
                    </div>
                    
                    <div className="w-full bg-gray-200 h-1 mt-2 rounded-full">
                      <div 
                        className="bg-blue-500 h-1 rounded-full" 
                        style={{ width: `${calculateDayCompletion(day)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => {
                  setCurrentPlan(null);
                  setSelectedDay(null);
                }}
              >
                Create New Plan
              </Button>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedDay ? (
                  <>{selectedDay.day.charAt(0).toUpperCase() + selectedDay.day.slice(1)}'s Schedule</>
                ) : (
                  "Daily Schedule"
                )}
              </CardTitle>
              <CardDescription>
                {selectedDay ? (
                  new Date(selectedDay.date).toLocaleDateString()
                ) : (
                  "Select a day to view its schedule"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDay ? (
                selectedDay.sessions.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDay.sessions.map((session, sessionIndex) => {
                      // Find the day index
                      const dayIndex = currentPlan.dailyPlans.findIndex(d => d === selectedDay);
                      
                      return (
                        <div 
                          key={sessionIndex} 
                          className={`p-4 border rounded-md ${session.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{session.topic}</h4>
                              <div className="text-sm text-gray-500 mt-1">
                                <Calendar className="inline-block mr-1 h-3 w-3" />
                                {session.startTime} - {session.endTime}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                <BookOpen className="inline-block mr-1 h-3 w-3" />
                                {session.activity}
                              </div>
                              {session.description && (
                                <p className="text-sm mt-2">{session.description}</p>
                              )}
                            </div>
                            <div>
                              <Button 
                                variant={session.completed ? "outline" : "default"}
                                size="sm"
                                className={session.completed ? "border-green-500 text-green-500" : ""}
                                onClick={() => handleToggleSession(dayIndex, sessionIndex)}
                              >
                                {session.completed ? "Completed" : "Mark Complete"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2" />
                    <p>No study sessions scheduled for this day</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2" />
                  <p>Select a day from the weekly overview to view its schedule</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create Personalized Study Plan</CardTitle>
            <CardDescription>
              Generate a tailored weekly study schedule based on your goals, exams, and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Date Selection */}
            <div className="space-y-4">
              <h3 className="font-medium">Plan Duration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={planStartDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={planEndDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Study Goals Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Study Goals</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowGoalForm(!showGoalForm)}
                >
                  {showGoalForm ? "Cancel" : "Add Goal"}
                </Button>
              </div>
              
              {showGoalForm && (
                <div className="space-y-4 p-4 border rounded-md bg-gray-50">
                  <Input
                    placeholder="Goal title"
                    value={goalTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Topics (comma separated)"
                    value={goalTopics}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoalTopics(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select 
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={goalPriority}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGoalPriority(e.target.value)}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Date
                      </label>
                      <Input
                        type="date"
                        value={goalDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateGoal}>Save Goal</Button>
                </div>
              )}
              
              {goals && goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.map((goal, i) => (
                    <div key={i} className="p-3 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{goal.title}</h4>
                          <div className="text-sm text-gray-500">
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {goal.topics.map((topic, j) => (
                              <span 
                                key={j} 
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          goal.priority === 'high' ? 'bg-red-100 text-red-800' :
                          goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {goal.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 border rounded-md">
                  <GraduationCap className="h-8 w-8 mx-auto mb-2" />
                  <p>No study goals yet</p>
                </div>
              )}
            </div>
            
            {/* Exams Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Upcoming Exams</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowExamForm(!showExamForm)}
                >
                  {showExamForm ? "Cancel" : "Add Exam"}
                </Button>
              </div>
              
              {showExamForm && (
                <div className="space-y-4 p-4 border rounded-md bg-gray-50">
                  <Input
                    placeholder="Exam title"
                    value={examTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExamTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Exam topics (comma separated)"
                    value={examTopics}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExamTopics(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importance
                      </label>
                      <select 
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={examImportance}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExamImportance(e.target.value)}
                      >
                        <option value="major">Major</option>
                        <option value="minor">Minor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exam Date
                      </label>
                      <Input
                        type="date"
                        value={examDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExamDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateExam}>Save Exam</Button>
                </div>
              )}
              
              {exams && exams.length > 0 ? (
                <div className="space-y-2">
                  {exams.map((exam, i) => (
                    <div key={i} className="p-3 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{exam.title}</h4>
                          <div className="text-sm text-gray-500">
                            Date: {new Date(exam.date).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {exam.topics.map((topic, j) => (
                              <span 
                                key={j} 
                                className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          exam.importance === 'major' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exam.importance}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 border rounded-md">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>No exams added yet</p>
                </div>
              )}
            </div>
            
            {/* Generate Plan Button */}
            {error && (
              <div className="p-3 text-sm bg-red-50 text-red-800 rounded border border-red-200">
                {error}
              </div>
            )}
            
            <Button 
              onClick={handleGeneratePlan}
              disabled={generatingPlan}
              className="w-full"
            >
              {generatingPlan ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Your Study Plan...
                </>
              ) : (
                "Generate Study Plan"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudyPlanTab;
