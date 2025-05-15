import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { 
  Brain, 
  FileText, 
  Search, 
  BookOpen, 
  Book, 
  Bookmark, 
  Activity, 
  Calendar, 
  Heart, 
  Sparkles 
} from "lucide-react";

// Import TabGroup component
import { TabGroup } from "../components/ui/tabgroup";

// Import Tab Components
import { AskTab } from "./tabs/AskTabs";
import { NotesTab } from "./tabs/NoteTabs";
import FileSearch from "./ui/FileSearch";
import { BookmarksTab } from "./tabs/BookmarksTab";
import { FlashcardsTab, QuizzesTab, ProgressTab } from "./tabs/StudyTabs";

// Import our Phase 2 components
import StudyPlanTab from "./ui/StudyPlanTab";
import WellnessTab from "./ui/WellnessTab";
import DailyDigestTab from "./ui/DailyDigestTab";

interface UserAwareProps {
  userId: Id<"users">;
}

export default function Content({ userId }: UserAwareProps) {
  // Track scroll position for header effects
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("ask");

  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Define all tabs with their icons
  const allTabs = [
    {
      id: "ask",
      label: "Ask",
      icon: <Brain className="h-4 w-4" />
    },
    {
      id: "notes",
      label: "Notes",
      icon: <FileText className="h-4 w-4" />
    },
    {
      id: "file-search",
      label: "Lecture Search",
      icon: <Search className="h-4 w-4" />
    },
    {
      id: "flashcards",
      label: "Flashcards",
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      id: "quizzes",
      label: "Quizzes",
      icon: <Book className="h-4 w-4" />
    },
    {
      id: "bookmarks",
      label: "Bookmarks",
      icon: <Bookmark className="h-4 w-4" />
    },
    {
      id: "progress",
      label: "Progress",
      icon: <Activity className="h-4 w-4" />
    },
    {
      id: "study-plan",
      label: "Study Plan",
      icon: <Calendar className="h-4 w-4" />
    },
    {
      id: "wellness",
      label: "Wellness",
      icon: <Heart className="h-4 w-4" />
    },
    {
      id: "daily-digest",
      label: "Today",
      icon: <Sparkles className="h-4 w-4" />
    }
  ];
  
  // Group tabs for better organization
  const groupedTabs = {
    "Main": [
      allTabs[0], // Ask
      allTabs[1], // Notes
      allTabs[2], // Lecture Search
    ],
    "Study": [
      allTabs[3], // Flashcards
      allTabs[4], // Quizzes
      allTabs[5], // Bookmarks
      allTabs[6], // Progress
    ],
    "Planning": [
      allTabs[7], // Study Plan
      allTabs[8], // Wellness
      allTabs[9], // Daily Digest
    ]
  };
  
  // Render the active tab content
  const renderActiveTab = () => {
    switch(activeTab) {
      case "ask":
        return <AskTab userId={userId} />;
      case "notes":
        return <NotesTab userId={userId} />;
      case "file-search":
        return <FileSearch userId={userId} />;
      case "flashcards":
        return <FlashcardsTab userId={userId} />;
      case "quizzes":
        return <QuizzesTab userId={userId} />;
      case "bookmarks":
        return <BookmarksTab userId={userId} />;
      case "progress":
        return <ProgressTab userId={userId} />;
      case "study-plan":
        return <StudyPlanTab userId={userId} />;
      case "wellness":
        return <WellnessTab userId={userId} />;
      case "daily-digest":
        return <DailyDigestTab userId={userId} />;
      default:
        return <AskTab userId={userId} />;
    }
  };

  return (
    <div className="flex flex-col">
      <div className="text-center max-w-3xl mx-auto mb-8 mt-4 px-4">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-premium">Dorothy</span> AI Assistant
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your AI-powered medical education companion
        </p>
      </div>

      {/* Tab Navigation with overflow management */}
      <div 
        className={`sticky top-0 z-50 backdrop-blur-sm transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 border-b border-gray-100' 
            : 'bg-white/80'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          {/* TabGroup component handles responsive behavior */}
          <TabGroup 
            tabs={allTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
            mobileDisplay="drawer"
            visibleTabCount={5}
            groupedTabs={groupedTabs}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-6 px-4 animate-in fade-in">
        {renderActiveTab()}
      </div>
    </div>
  );
}