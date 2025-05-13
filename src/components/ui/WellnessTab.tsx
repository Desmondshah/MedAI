import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Heart, Send, Smile, Frown, Meh, Battery, BatteryMedium, BatteryLow } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { WellnessCheckin } from "../../../convex/types";

interface UserAwareProps {
  userId: Id<"users">;
}

const WellnessTab: React.FC<UserAwareProps> = ({ userId }) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCheckin, setCurrentCheckin] = useState<WellnessCheckin | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mock previous check-ins for demo
  const [previousCheckins, setPreviousCheckins] = useState<WellnessCheckin[]>([
    {
      _id: "1" as Id<"wellnessCheckins">,
      userId,
      mood: "okay",
      stressLevel: 5,
      message: "Feeling a bit stressed about my upcoming cardiology exam, but otherwise okay.",
      aiResponse: "It's completely normal to feel stressed about exams, especially in medical school. Remember that some stress can actually help motivate you, but it's important to keep it at a manageable level.",
      suggestions: [
        "Try breaking down your cardiology topics into smaller, manageable chunks",
        "Schedule short breaks during your study sessions",
        "Practice deep breathing for 5 minutes when feeling overwhelmed"
      ],
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    },
    {
      _id: "2" as Id<"wellnessCheckins">,
      userId,
      mood: "stressed",
      stressLevel: 7,
      message: "I didn't sleep well last night and I have a full day of lectures ahead. Feeling overwhelmed.",
      aiResponse: "I'm sorry to hear you didn't sleep well. Lack of sleep can definitely amplify feelings of stress. Today might be challenging, but remember to be kind to yourself.",
      suggestions: [
        "Try to take short power naps between lectures if possible",
        "Stay hydrated and avoid excessive caffeine",
        "Focus on active listening rather than perfect notes today"
      ],
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    }
  ]);
  
  // Ref for auto-scrolling to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Handle submitting a check-in
  const handleSubmitCheckin = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    // Simulate AI processing
    setTimeout(() => {
      // Analyze message to determine mood and stress level (simplified)
      let mood = "okay";
      let stressLevel = 5;
      
      const lowerMessage = message.toLowerCase();
      
      // Very simple mood detection logic
      if (lowerMessage.includes("stress") || lowerMessage.includes("overwhelm") || 
          lowerMessage.includes("anxious") || lowerMessage.includes("worry")) {
        mood = "stressed";
        stressLevel = 7;
      } else if (lowerMessage.includes("exhaust") || lowerMessage.includes("tired") ||
                lowerMessage.includes("can't handle") || lowerMessage.includes("too much")) {
        mood = "exhausted";
        stressLevel = 8;
      } else if (lowerMessage.includes("good") || lowerMessage.includes("well") ||
                lowerMessage.includes("fine") || lowerMessage.includes("okay")) {
        mood = "good";
        stressLevel = 3;
      }
      
      // Generate appropriate response
      let response = "";
      let suggestions: string[] = [];
      
      if (mood === "stressed") {
        response = "I can sense that you're feeling stressed right now. That's completely understandable, especially with the pressures of medical school. Remember that stress is a normal response, but it's important to manage it effectively.";
        suggestions = [
          "Try a brief 5-minute mindfulness exercise to center yourself",
          "Break down your immediate tasks into smaller, manageable steps",
          "Consider scheduling a short walk outside to clear your mind",
          "Remember to stay hydrated and take regular breaks"
        ];
      } else if (mood === "exhausted") {
        response = "You sound exhausted, which is completely valid. Medical education can be incredibly demanding both mentally and physically. Your wellbeing matters, and it's important to acknowledge when you need rest.";
        suggestions = [
          "Prioritize sleep tonight - aim for at least 7-8 hours",
          "Consider which tasks can be postponed to create space for rest",
          "Try a gentle relaxation technique before bed",
          "Reach out to a friend or family member for support"
        ];
      } else {
        response = "It sounds like you're managing well, which is great to hear. Maintaining this balance is important in medical school. Remember that it's okay to have ups and downs - that's part of the journey.";
        suggestions = [
          "Continue with your current self-care strategies",
          "Consider setting aside time for activities you enjoy",
          "Reflect on what's working well for you right now",
          "Remember to celebrate small wins along the way"
        ];
      }
      
      // Create new check-in
      const newCheckin: WellnessCheckin = {
        _id: `temp_${Date.now()}` as Id<"wellnessCheckins">,
        userId,
        mood,
        stressLevel,
        message: message.trim(),
        aiResponse: response,
        suggestions,
        createdAt: Date.now(),
      };
      
      // Update state
      setCurrentCheckin(newCheckin);
      setPreviousCheckins([newCheckin, ...previousCheckins]);
      setMessage("");
      setIsSubmitting(false);
    }, 1500);
  };
  
  // Get mood emoji based on mood string
  const getMoodEmoji = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'great':
      case 'good':
        return <Smile className="h-6 w-6 text-green-500" />;
      case 'okay':
        return <Meh className="h-6 w-6 text-yellow-500" />;
      case 'stressed':
      case 'overwhelmed':
      case 'exhausted':
      case 'anxious':
      case 'sad':
      case 'frustrated':
        return <Frown className="h-6 w-6 text-red-500" />;
      default:
        return <Meh className="h-6 w-6 text-yellow-500" />;
    }
  };
  
  // Get stress level icon based on stress level
  const getStressLevelIcon = (level: number) => {
    if (level <= 3) {
      return <Battery className="h-5 w-5 text-green-500" />;
    } else if (level <= 7) {
      return <BatteryMedium className="h-5 w-5 text-yellow-500" />;
    } else {
      return <BatteryLow className="h-5 w-5 text-red-500" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mental Health Check-In</CardTitle>
          <CardDescription>
            Talk about how you're feeling, vent, or ask for support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chat History */}
          <div className="space-y-4 max-h-96 overflow-y-auto p-2">
            {currentCheckin ? (
              <>
                {/* User Message */}
                <div className="flex justify-end mb-4">
                  <div className="bg-blue-100 text-blue-800 p-3 rounded-lg max-w-[80%]">
                    <p>{currentCheckin.message}</p>
                    <p className="text-xs text-right mt-1 text-blue-600">
                      {new Date(currentCheckin.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                {/* Dorothy Response */}
                <div className="flex mb-4">
                  <div className="bg-white border p-3 rounded-lg max-w-[80%]">
                    <div className="flex space-x-2 items-center mb-2">
                      <div className="bg-indigo-100 p-1 rounded-full">
                        <Heart className="h-4 w-4 text-indigo-600" />
                      </div>
                      <p className="font-medium">Dorothy</p>
                    </div>
                    
                    <div className="mb-2 flex items-center space-x-2">
                      <span>Mood: </span>
                      <div className="flex items-center space-x-1">
                        {getMoodEmoji(currentCheckin.mood)}
                        <span className="text-sm">{currentCheckin.mood}</span>
                      </div>
                      <span className="mx-2">•</span>
                      <span>Stress Level: </span>
                      <div className="flex items-center space-x-1">
                        {getStressLevelIcon(currentCheckin.stressLevel)}
                        <span className="text-sm">{currentCheckin.stressLevel}/10</span>
                      </div>
                    </div>
                    
                    <p className="whitespace-pre-wrap">{currentCheckin.aiResponse}</p>
                    
                    {/* Suggestions */}
                    {currentCheckin.suggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium mb-2">Suggestions:</p>
                        <ul className="space-y-1 list-disc pl-5">
                          {currentCheckin.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-sm">{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <p className="text-xs mt-1 text-gray-500">
                      {new Date(currentCheckin.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </>
            ) : previousCheckins.length > 0 ? (
              <div className="text-center py-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? "Hide Previous Check-Ins" : "View Previous Check-Ins"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Heart className="h-12 w-12 mx-auto mb-2" />
                <p>Welcome to Mental Health Check-Ins!</p>
                <p className="text-sm mt-1">Share how you're feeling or what's on your mind below.</p>
              </div>
            )}
            
            {/* Previous Check-ins */}
            {showHistory && previousCheckins.length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="font-medium text-center">Previous Check-Ins</h3>
                
                {previousCheckins.map((checkin, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          {getMoodEmoji(checkin.mood)}
                          <span className="font-medium">{checkin.mood}</span>
                          <span className="text-xs text-gray-500">
                            Stress: {checkin.stressLevel}/10
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(checkin.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 p-2 rounded mb-2">
                        <p className="text-sm italic">"{checkin.message}"</p>
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {checkin.aiResponse}
                      </p>
                      
                      {checkin.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">Suggestions:</p>
                          <p className="text-xs text-gray-600">
                            {checkin.suggestions[0]}
                            {checkin.suggestions.length > 1 && ` and ${checkin.suggestions.length - 1} more...`}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* For auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm bg-red-50 text-red-800 rounded border border-red-200">
              {error}
            </div>
          )}
          
          {/* Input Area */}
          <div className="flex items-end space-x-2">
            <Textarea
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="How are you feeling today? What's on your mind?"
              className="flex-1 min-h-24"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleSubmitCheckin();
                }
              }}
            />
            <Button 
              onClick={handleSubmitCheckin}
              disabled={isSubmitting || !message.trim()}
              className="h-10"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Press Ctrl+Enter to send your message. Your check-ins are private and confidential.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Wellness Resources</CardTitle>
          <CardDescription>
            Quick access to mental health and wellness resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Stress Management</h3>
                <ul className="space-y-1 text-sm">
                  <li>• 5-minute breathing exercises</li>
                  <li>• Progressive muscle relaxation</li>
                  <li>• Guided meditation</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  View Techniques
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Productivity Reset</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Pomodoro technique</li>
                  <li>• Study environment optimization</li>
                  <li>• Focus enhancement tips</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  Reset Now
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Self-Care Resources</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Sleep improvement guides</li>
                  <li>• Nutrition for brain health</li>
                  <li>• Physical activity suggestions</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  Browse Resources
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
            <h3 className="font-medium text-indigo-800 mb-2">Need More Support?</h3>
            <p className="text-sm text-indigo-700 mb-3">
              If you're experiencing persistent stress, anxiety, or other mental health concerns, don't hesitate to reach out for professional help.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button variant="outline" className="text-indigo-700 border-indigo-300 hover:bg-indigo-100">
                Campus Counseling Services
              </Button>
              <Button variant="outline" className="text-indigo-700 border-indigo-300 hover:bg-indigo-100">
                Crisis Resources
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WellnessTab;
