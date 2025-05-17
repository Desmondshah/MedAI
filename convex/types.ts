import { Id } from "../convex/_generated/dataModel";

// Phase 1 types (you might already have these defined)
export interface Note {
  _id: Id<"notes">;
  userId: Id<"users">;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export interface Flashcard {
  _creationTime: any;
  _id: Id<"flashcards">;
  userId: Id<"users">;
  front: string;
  back: string;
  category: string;
  lastReviewed?: number;
  confidence?: number;
}

export interface QuizQuestion {
  explanation: any;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  _id: Id<"quizzes">;
  userId: Id<"users">;
  title: string;
  questions: QuizQuestion[];
  score?: number;
  takenAt?: number;
}

export interface Bookmark {
  _id: Id<"bookmarks">;
  userId: Id<"users">;
  noteId: Id<"notes">;
  comment?: string;
  createdAt: number;
}

// Phase 2 types
export interface StudyGoal {
  _id: Id<"studyGoals">;
  userId: Id<"users">;
  title: string;
  description?: string;
  targetDate: number;
  topics: string[];
  priority: string; // "high", "medium", "low"
  completed: boolean;
  createdAt: number;
}

export interface Exam {
  _id: Id<"examDates">;
  userId: Id<"users">;
  title: string;
  description?: string;
  date: number;
  topics: string[];
  importance: string; // "major", "minor"
  createdAt: number;
}

export interface StudySession {
  startTime: string;
  endTime: string;
  topic: string;
  activity: string;
  description?: string;
  completed: boolean;
}

export interface DailyPlan {
  day: string;
  date: number;
  sessions: StudySession[];
}

export interface StudyPlan {
  _id: Id<"studyPlans">;
  userId: Id<"users">;
  title: string;
  startDate: number;
  endDate: number;
  dailyPlans: DailyPlan[];
  createdAt: number;
}

export interface WellnessCheckin {
  _id: Id<"wellnessCheckins">;
  userId: Id<"users">;
  mood: string;
  stressLevel: number;
  message: string;
  aiResponse: string;
  suggestions: string[];
  createdAt: number;
}

export interface ReviewTopic {
  topic: string;
  reason: string;
  priority: string; // "high", "medium", "low"
}

export interface SuggestedActivity {
  activity: string;
  topic: string;
  duration: number;
}

export interface DailyDigest {
  _id: Id<"dailyDigests">;
  userId: Id<"users">;
  date: number;
  summary: string;
  reviewTopics: ReviewTopic[];
  suggestedActivities: SuggestedActivity[];
  completed: boolean;
  createdAt: number;
}

export interface StudyActivity {
  type: string; // "note", "flashcard", "quiz", etc.
  topic: string;
  timestamp: number;
  details?: string;
}

export interface StudyPreferences {
  studySessionLength: number; // minutes
  breaksFrequency: string; // "frequent", "normal", "minimal"
  preferredTimes: string[]; // ["morning", "evening"]
  maxDailyHours: number;
  restDays: string[]; // ["sunday"]
}


