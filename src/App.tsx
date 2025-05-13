import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster, toast } from "sonner";
import { 
  Brain, 
  User, 
  Search, 
  Menu, 
  Activity, 
  Settings, 
  AlertCircle 
} from "lucide-react";
import { Id } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";

// Import our Content component
import Content from "./components/Content";

export default function App() {
  // Create a state to store the real user ID
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Get the createDevUser mutation
  const createDevUser = useMutation(api.user.createDevUser);
  
  // Create a dev user when the app loads
  useEffect(() => {
    async function initUser() {
      try {
        // Create a development user and get a real Convex ID
        const id = await createDevUser();
        setUserId(id);
      } catch (error: unknown) {
        console.error("Error creating user:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to initialize user: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    initUser();
  }, [createDevUser]);
  
  // Show loading state while creating user
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="space-y-4 text-center">
          <div className="inline-block relative">
            <Brain className="h-10 w-10 text-blue-600 animate-pulse" />
          </div>
          <p className="text-gray-600 animate-pulse">Initializing Dorothy...</p>
        </div>
      </div>
    );
  }
  
  // If user creation failed, show error
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full p-8 bg-red-50 rounded-xl shadow-sm border border-red-100">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center text-red-700 mb-2">Initialization Failed</h2>
          <p className="text-red-600 text-center">
            We couldn't initialize your session. Please refresh the page to try again.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full mt-6 bg-red-600 hover:bg-red-700"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Premium Glass Morphism Header */}
      <header className="sticky top-0 z-10 glass-effect backdrop-blur-md p-4 md:px-8 flex justify-between items-center border-b border-gray-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-premium text-white p-1.5 rounded-md shadow-sm">
            <Brain className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Dorothy</h2>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
          <div className="bg-gray-100 rounded-full px-3 py-1.5 flex items-center mr-4">
            <Search className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm text-gray-500">Quick search...</span>
          </div>
          <Button variant="ghost" className="nav-link-premium">Dashboard</Button>
          <Button variant="ghost" className="nav-link-premium">Settings</Button>
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          <div className="relative hover-lift">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </nav>
        
        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 rounded-md hover:bg-gray-100"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
      </header>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 right-0 left-0 z-20 bg-white border-b shadow-md slide-up">
          <div className="p-4 space-y-3">
            <Button variant="ghost" className="w-full justify-start">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Activity className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
          </div>
        </div>
      )}
      
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Content userId={userId} />
      </main>
      
      <footer className="border-t border-gray-100 py-4 px-8 text-center text-sm text-gray-500">
        <p>
          © 2025 Dorothy AI - Your Medical Education Assistant
        </p>
      </footer>
      
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: "white",
            color: "#1d1d1f",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.05)"
          }
        }}
        richColors
        closeButton
      />
    </div>
  );
}