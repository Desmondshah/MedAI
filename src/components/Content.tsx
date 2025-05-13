import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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

// Import Tab Components
import { AskTab } from "./tabs/AskTabs";
import { NotesTab } from "./tabs/NoteTabs";
import  FileSearch from "./ui/FileSearch";
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

  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      <Tabs defaultValue="ask" className="w-full">
        {/* Premium Tab Header - Tesla/Apple Style */}
        <div 
          className={`sticky top-0 z-50 backdrop-blur-xl transition-all duration-300 ${
            scrolled 
              ? 'bg-white/85 shadow-md' 
              : 'bg-white/50'
          } border-b border-gray-200`}
        >
          <div className="max-w-6xl mx-auto">
            <TabsList className="flex justify-center gap-6 border-none shadow-none bg-transparent p-0 h-auto overflow-x-auto no-scrollbar">
              {/* Phase 1 tabs */}
              <TabsTrigger 
                value="ask" 
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <Brain className="h-4 w-4 mr-2" />
                <span>Ask</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="notes"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span>Notes</span>
              </TabsTrigger>

              <TabsTrigger 
                value="file-search"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <Search className="h-4 w-4 mr-2" />
                <span>Lecture Search</span>
              </TabsTrigger>

              <TabsTrigger 
                value="flashcards"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                <span>Flashcards</span>
              </TabsTrigger>

              <TabsTrigger 
                value="quizzes"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <Book className="h-4 w-4 mr-2" />
                <span>Quizzes</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="bookmarks"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                <span>Bookmarks</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="progress"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <Activity className="h-4 w-4 mr-2" />
                <span>Progress</span>
              </TabsTrigger>
              
              {/* Phase 2 tabs */}
              <TabsTrigger 
                value="study-plan"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <Calendar className="h-4 w-4 mr-2" />
                <span>Study Plan</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="wellness"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <Heart className="h-4 w-4 mr-2" />
                <span>Wellness</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="daily-digest"
                className="data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent
                           text-gray-700 hover:text-blue-600 transition-all py-4 px-3 hover:translate-y-[-2px] active:scale-95
                           rounded-none min-w-fit border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                <span>Today</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="py-6 px-4">
          {/* Phase 1 Tab Contents */}
          <TabsContent value="ask" className="mt-2 slide-up animation-delay-100">
            <AskTab userId={userId} />
          </TabsContent>
          
          <TabsContent value="notes" className="mt-2 slide-up animation-delay-100">
            <NotesTab userId={userId} />
          </TabsContent>

          <TabsContent value="file-search" className="mt-2 slide-up animation-delay-100">
            <FileSearch userId={userId} />
          </TabsContent>
          
          <TabsContent value="flashcards" className="mt-2 slide-up animation-delay-100">
            <FlashcardsTab userId={userId} />
          </TabsContent>
          
          <TabsContent value="quizzes" className="mt-2 slide-up animation-delay-100">
            <QuizzesTab userId={userId} />
          </TabsContent>
          
          <TabsContent value="bookmarks" className="mt-2 slide-up animation-delay-100">
            <BookmarksTab userId={userId} />
          </TabsContent>
          
          <TabsContent value="progress" className="mt-2 slide-up animation-delay-100">
            <ProgressTab userId={userId} />
          </TabsContent>
          
          {/* Phase 2 Tab Contents */}
          <TabsContent value="study-plan" className="mt-2 slide-up animation-delay-100">
            <StudyPlanTab userId={userId} />
          </TabsContent>
          
          <TabsContent value="wellness" className="mt-2 slide-up animation-delay-100">
            <WellnessTab userId={userId} />
          </TabsContent>
          
          <TabsContent value="daily-digest" className="mt-2 slide-up animation-delay-100">
            <DailyDigestTab userId={userId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// You may need to add this CSS to your global styles
// For the no-scrollbar utility class:
/*
@layer utilities {
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .animation-delay-100 {
    animation-delay: 100ms;
  }
}
*/