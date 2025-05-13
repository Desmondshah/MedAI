import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Calendar, Clock, BookOpen, Brain, CheckCircle, BarChart, PieChart, BookMarked, BookOpen as BookOutlined } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { DailyDigest, ReviewTopic, SuggestedActivity } from "../../../convex/types";

interface UserAwareProps {
  userId: Id<"users">;
}

const DailyDigestTab: React.FC<UserAwareProps> = ({ userId }) => {
  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [currentDigest, setCurrentDigest] = useState<DailyDigest | null>(null);
  const [availableTime, setAvailableTime] = useState<number>(120); // Default to 2 hours
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activityCompletions, setActivityCompletions] = useState<boolean[]>([]);
  
  // Mock previous digests for demo
  const [previousDigests, setPreviousDigests] = useState<DailyDigest[]>([
    {
      _id: "1" as Id<"dailyDigests">,
      userId,
      date: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
      summary: "Focus on cardiology concepts and USMLE preparation with targeted flashcard review and practice questions.",
      reviewTopics: [
        {
          topic: "Cardiac Pharmacology",
          reason: "Low confidence score in recent quiz",
          priority: "high"
        },
        {
          topic: "ECG Interpretation",
          reason: "Upcoming exam topic",
          priority: "high"
        },
        {
          topic: "Heart Failure",
          reason: "Due for spaced repetition review",
          priority: "medium"
        }
      ],
      suggestedActivities: [
        {
          activity: "Review notes",
          topic: "Cardiac Pharmacology",
          duration: 45
        },
        {
          activity: "Flashcards",
          topic: "ECG Interpretation",
          duration: 30
        },
        {
          activity: "Practice quiz",
          topic: "Heart Failure",
          duration: 20
        }
      ],
      completed: true,
      createdAt: Date.now() - 24 * 60 * 60 * 1000
    },
    {
      _id: "2" as Id<"dailyDigests">,
      userId,
      date: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      summary: "Focus on respiratory physiology and pathology in preparation for your upcoming exam. Include active recall techniques.",
      reviewTopics: [
        {
          topic: "Lung Compliance",
          reason: "Upcoming exam topic",
          priority: "high"
        },
        {
          topic: "COPD Pathophysiology",
          reason: "Low confidence score",
          priority: "high"
        },
        {
          topic: "Asthma Treatment",
          reason: "Due for spaced repetition review",
          priority: "medium"
        }
      ],
      suggestedActivities: [
        {
          activity: "Review notes",
          topic: "Lung Compliance",
          duration: 40
        },
        {
          activity: "Practice quiz",
          topic: "COPD Pathophysiology",
          duration: 30
        },
        {
          activity: "Flashcards",
          topic: "Asthma Treatment",
          duration: 20
        }
      ],
      completed: false,
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
    }
  ]);
  
  // Handle generating a new digest
  const handleGenerateDigest = () => {
    setGeneratingDigest(true);
    setError(null);
    
    // Simulate AI processing
    setTimeout(() => {
      // Create a sample digest
      const reviewTopics: ReviewTopic[] = [
        {
          topic: "Renal Physiology",
          reason: "Upcoming exam topic",
          priority: "high"
        },
        {
          topic: "Acid-Base Balance",
          reason: "Low confidence in recent review",
          priority: "high"
        },
        {
          topic: "Electrolyte Disorders",
          reason: "Due for spaced repetition review",
          priority: "medium"
        },
        {
          topic: "Diuretics",
          reason: "Related to current coursework",
          priority: "medium"
        }
      ];
      
      // Calculate activity durations based on available time and priorities
      const highPriorityTopics = reviewTopics.filter(t => t.priority === "high");
      const mediumPriorityTopics = reviewTopics.filter(t => t.priority === "medium");
      
      const totalTopics = reviewTopics.length;
      const highPriorityCount = highPriorityTopics.length;
      
      // Allocate more time to high priority topics
      const timePerHighPriority = Math.floor(availableTime * 0.7 / highPriorityCount);
      const timePerMediumPriority = Math.floor(availableTime * 0.3 / (totalTopics - highPriorityCount));
      
      const suggestedActivities: SuggestedActivity[] = [];
      
      // Assign activities to high priority topics
      highPriorityTopics.forEach((topic, index) => {
        // Alternate between different activity types
        const activityType = index % 2 === 0 ? "Review notes" : "Practice quiz";
        suggestedActivities.push({
          activity: activityType,
          topic: topic.topic,
          duration: timePerHighPriority
        });
      });
      
      // Assign activities to medium priority topics
      mediumPriorityTopics.forEach((topic) => {
        // Use flashcards for medium priority topics
        suggestedActivities.push({
          activity: "Flashcards",
          topic: topic.topic,
          duration: timePerMediumPriority
        });
      });
      
      const newDigest: DailyDigest = {
        _id: `temp_${Date.now()}` as Id<"dailyDigests">,
        userId,
        date: Date.now(),
        summary: "Focus on renal physiology and related topics today, with emphasis on acid-base balance and electrolyte disorders in preparation for your upcoming exam.",
        reviewTopics,
        suggestedActivities,
        completed: false,
        createdAt: Date.now()
      };
      
      // Update state
      setCurrentDigest(newDigest);
      setActivityCompletions(new Array(suggestedActivities.length).fill(false));
      setGeneratingDigest(false);
    }, 2000);
  };
  
  // Handle marking a digest as completed
  const handleCompleteDigest = () => {
    if (!currentDigest) return;
    
    const updatedDigest = {...currentDigest, completed: true};
    setCurrentDigest(updatedDigest);
    
    // Also update in the previous digests if we switch away
    setPreviousDigests([updatedDigest, ...previousDigests]);
    
    toast.success("Daily digest marked as completed!");
  };
  
  // Handle activity completion toggle
  const handleToggleActivity = (index: number) => {
    const newCompletions = [...activityCompletions];
    newCompletions[index] = !newCompletions[index];
    setActivityCompletions(newCompletions);
    
    // Check if all activities are completed
    const allCompleted = newCompletions.every(completed => completed);
    if (allCompleted && currentDigest && !currentDigest.completed) {
      handleCompleteDigest();
    }
  };
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  
  // Get activity icon
  const getActivityIcon = (activity: string) => {
    switch (activity.toLowerCase()) {
      case 'review notes':
        return <BookOpen className="h-4 w-4" />;
      case 'flashcards':
        return <BookOutlined className="h-4 w-4" />;
      case 'practice quiz':
        return <BookMarked className="h-4 w-4" />;
      case 'read textbook':
        return <BookOpen className="h-4 w-4" />;
      case 'watch lecture':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };
  
  // Format minutes to hours and minutes
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours} hr ${remainingMinutes} min` 
      : `${hours} hr`;
  };
  
  return (
    <div className="space-y-6">
      {currentDigest && !currentDigest.completed ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Today's Study Plan</CardTitle>
                <CardDescription>
                  {new Date(currentDigest.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCompleteDigest}
              >
                Mark Complete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Summary
              </h3>
              <p>{currentDigest.summary}</p>
            </div>
            
            {/* Review Topics */}
            <div>
              <h3 className="font-medium mb-3">Priority Topics</h3>
              <div className="space-y-2">
                {currentDigest.reviewTopics.map((topic, index) => (
                  <div 
                    key={index}
                    className="p-3 border rounded-md flex justify-between items-start"
                  >
                    <div>
                      <h4 className="font-medium">{topic.topic}</h4>
                      <p className="text-sm text-gray-600">{topic.reason}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(topic.priority)}`}>
                      {topic.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Suggested Activities */}
            <div>
              <h3 className="font-medium mb-3">Suggested Activities</h3>
              <div className="space-y-2">
                {currentDigest.suggestedActivities.map((activity, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded-md ${activityCompletions[index] ? 'bg-green-50 border-green-200' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium flex items-center">
                          {getActivityIcon(activity.activity)}
                          <span className="ml-2">{activity.activity}</span>
                        </h4>
                        <p className="text-sm text-gray-600">{activity.topic}</p>
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(activity.duration)}
                        </div>
                      </div>
                      <Button 
                        variant={activityCompletions[index] ? "outline" : "default"}
                        size="sm"
                        className={activityCompletions[index] ? "border-green-500 text-green-500" : ""}
                        onClick={() => handleToggleActivity(index)}
                      >
                        {activityCompletions[index] ? (
                          <><CheckCircle className="h-4 w-4 mr-1" /> Completed</>
                        ) : (
                          "Mark Complete"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : currentDigest && currentDigest.completed ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Today's Study Plan Completed</CardTitle>
                <CardDescription>
                  {new Date(currentDigest.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </CardDescription>
              </div>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Completed
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-medium mb-2">Great work today!</h3>
              <p className="text-gray-600 mb-6">You've completed all your study activities for today.</p>
              <Button 
                onClick={() => {
                  setCurrentDigest(null);
                  setActivityCompletions([]);
                }}
              >
                Generate New Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Generate Daily Study Digest</CardTitle>
            <CardDescription>
              Get AI-recommended topics and activities based on your current progress and goals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How much time do you have available today? (minutes)
              </label>
              <Input
                type="number"
                min="15"
                max="480"
                value={availableTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvailableTime(parseInt(e.target.value))}
              />
            </div>
            
            {error && (
              <div className="p-3 text-sm bg-red-50 text-red-800 rounded border border-red-200">
                {error}
              </div>
            )}
            
            <Button 
              onClick={handleGenerateDigest}
              disabled={generatingDigest}
              className="w-full"
            >
              {generatingDigest ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Your Daily Digest...
                </>
              ) : (
                "Generate Daily Digest"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Previous Digests */}
      {previousDigests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Previous Digests</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? "Hide Completed" : "Show All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {previousDigests
                .filter(digest => showCompleted || !digest.completed)
                .slice(0, 5)
                .map((digest, index) => (
                  <div 
                    key={index}
                    className="p-3 border rounded-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">
                          {new Date(digest.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{digest.summary}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {digest.reviewTopics.slice(0, 3).map((topic, i) => (
                            <span 
                              key={i}
                              className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(topic.priority)}`}
                            >
                              {topic.topic}
                            </span>
                          ))}
                          {digest.reviewTopics.length > 3 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                              +{digest.reviewTopics.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        digest.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {digest.completed ? 'Completed' : 'Incomplete'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Study Statistics</CardTitle>
          <CardDescription>
            Track your progress and study patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Completion Rate</h3>
                  <BarChart className="h-5 w-5 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold text-indigo-600">
                  {previousDigests.length > 0 
                    ? Math.round((previousDigests.filter(d => d.completed).length / previousDigests.length) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {previousDigests.filter(d => d.completed).length} of {previousDigests.length} digests completed
                </p>
              </CardContent>
            </Card>
            
            <Card className="border">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Total Study Time</h3>
                  <Clock className="h-5 w-5 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatDuration(
                    previousDigests
                      .filter(d => d.completed)
                      .reduce((total, digest) => {
                        return total + digest.suggestedActivities.reduce((sum, activity) => sum + activity.duration, 0);
                      }, 0)
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Total time spent studying
                </p>
              </CardContent>
            </Card>
            
            <Card className="border">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Top Topics</h3>
                  <PieChart className="h-5 w-5 text-indigo-500" />
                </div>
                {previousDigests.length > 0 ? (
                  <ul className="space-y-1">
                    {/* Calculate top topics */}
                    {[...new Set(
                      previousDigests
                        .flatMap(d => d.reviewTopics)
                        .map(t => t.topic)
                    )]
                      .slice(0, 3)
                      .map((topic, i) => (
                        <li key={i} className="text-sm flex items-center">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
                          {topic}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No data available yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyDigestTab;
