import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  BookOpen, 
  Book, 
  X, 
  AlertCircle, 
  Play, 
  ChevronRight, 
  PlusCircle, 
  RotateCcw, 
  CheckCircle, 
  Brain, 
  Bookmark, 
  Filter, 
  Search, 
  ChevronDown, 
  Sparkles, 
  Activity, 
  Calendar, 
  Clock, 
  BarChart, 
  ListOrdered 
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Progress } from "../../components/ui/progress";
import StudyCard from "../ui/StudyCard";

interface UserAwareProps {
  userId: Id<"users">;
}

interface Flashcard {
  front: string;
  back: string;
  category?: string;
  lastReviewed?: number;
  confidence?: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export function FlashcardsTab({ userId }: UserAwareProps) {
  const [topic, setTopic] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reviewMode, setReviewMode] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [savedDecks, setSavedDecks] = useState<{ category: string; count: number }[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [deckFlashcards, setDeckFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);

  // API connections
  const generateFlashcards = useAction(api.ai.generateFlashcards);
  const createFlashcardBatch = useMutation(api.flashcards.createBatch);
  const allFlashcards = useQuery(api.flashcards.getAll, { userId });
  
  // Get flashcards by category when a deck is selected
  const categoryFlashcards = useQuery(
    api.flashcards.getByCategory, 
    selectedDeck ? { userId, category: selectedDeck } : "skip"
  );

  // Group flashcards by category when data changes
  useEffect(() => {
    if (allFlashcards) {
      const decksByCategory: Record<string, number> = {};
      
      allFlashcards.forEach(card => {
        const category = card.category || "Uncategorized";
        decksByCategory[category] = (decksByCategory[category] || 0) + 1;
      });
      
      const formattedDecks = Object.entries(decksByCategory).map(([category, count]) => ({
        category,
        count
      }));
      
      setSavedDecks(formattedDecks);
    }
  }, [allFlashcards]);

  // Update deckFlashcards when categoryFlashcards changes
  useEffect(() => {
    if (categoryFlashcards && categoryFlashcards.length > 0) {
      setDeckFlashcards(categoryFlashcards);
      // If we're in review mode, make sure we have the right card index
      if (reviewMode && categoryFlashcards.length > 0) {
        setCurrentCardIndex(Math.min(currentCardIndex, categoryFlashcards.length - 1));
      }
    }
  }, [categoryFlashcards, reviewMode, currentCardIndex]);

  const handleGenerateFlashcards = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic first");
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      // Log the request for debugging
      console.log("Calling AI to generate flashcards with:", {
        topic: topic.trim(),
        contentLength: content.trim().length || 0
      });
      
      // Use the AI action to generate flashcards
      const response = await generateFlashcards({ 
        topic: topic.trim(), 
        content: content.trim() || undefined 
      });
      
      console.log("Received flashcards response:", response);
      
      // Check if we got valid flashcards
      if (response && Array.isArray(response) && response.length > 0) {
        setFlashcards(response);
        
        try {
          console.log("Saving flashcards to database:", response);
          
          // Save flashcards to database
          const savedIds = await createFlashcardBatch({
            userId,
            cards: response.map(card => ({
              ...card,
              category: topic.trim()
            }))
          });
          
          console.log("Successfully saved flashcards:", savedIds);
          toast.success(`${response.length} flashcards created successfully!`);
        } catch (dbError: unknown) {
          console.error("Database error saving flashcards:", dbError);
          const errorMessage = dbError instanceof Error ? dbError.message : "Unknown database error";
          setError(`Error saving flashcards: ${errorMessage}`);
          toast.error(`Error saving flashcards: ${errorMessage}`);
        }
      } else {
        console.error("No valid flashcards returned from AI");
        setError("No flashcards could be generated. Please try a different topic or provide more content.");
        toast.error("No flashcards could be generated. Please try a different topic or provide more detailed content.");
      }
    } catch (error: unknown) {
      console.error("Error generating flashcards:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Error generating flashcards: ${errorMessage}`);
      toast.error(`Failed to generate flashcards: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startReview = () => {
    if (flashcards.length === 0) {
      toast.error("No flashcards available to review");
      return;
    }
    setReviewMode(true);
    setCurrentCardIndex(0);
    setFlipped(false);
  };

  const startDeckReview = async (category: string) => {
    try {
      setIsLoading(true);
      setSelectedDeck(category);
      
      if (categoryFlashcards && categoryFlashcards.length > 0) {
        setCurrentCardIndex(0);
        setFlipped(false);
        setReviewMode(true);
      } else {
        toast.error("Error loading flashcards for this deck");
      }
    } catch (error: unknown) {
      console.error("Error loading deck:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to load flashcards: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const nextCard = () => {
    const currentDeck = selectedDeck ? deckFlashcards : flashcards;
    
    if (currentCardIndex < currentDeck.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setFlipped(false);
    } else {
      setReviewMode(false);
      setSelectedDeck(null);
      toast.success("Review complete!");
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prevIndex => prevIndex - 1);
      setFlipped(false);
    }
  };

  const handleMarkCard = (confidence: number) => {
    // In a real app, this would update the card's confidence level in the database
    console.log(`Marking card with confidence level: ${confidence}`);
    nextCard();
  };

  const handleBookmarkCard = () => {
    // In a real app, this would bookmark the current card
    toast.success("Flashcard bookmarked!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      {!reviewMode ? (
        <>
          <Card className="card-premium overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center mb-1">
                <div className="p-1.5 mr-3 rounded-lg bg-blue-50">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">Generate Flashcards</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Create high-yield medical flashcards from your notes or any medical topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic (e.g., Cardiac Physiology, Antibiotic Classes)"
                className="input-premium"
              />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add content to base flashcards on, or leave blank for general topic flashcards"
                className="textarea-premium min-h-32 placeholder:text-gray-400"
              />
              {error && (
                <div className="alert-premium error p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
              <Button 
                onClick={handleGenerateFlashcards}
                disabled={isLoading || !topic.trim()}
                className="w-full bg-gradient-premium hover-lift"
              >
                {!isLoading && <Sparkles className="h-4 w-4 mr-2" />}
                Generate Flashcards
              </Button>
            </CardContent>
          </Card>

          {flashcards.length > 0 && (
            <Card className="card-premium">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Generated Flashcards</CardTitle>
                <CardDescription>{flashcards.length} flashcards created for "{topic}"</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {flashcards.slice(0, 4).map((card, index) => (
                    <Card key={index} className="border hover:border-blue-200 hover:shadow-md transition-shadow hover-lift">
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm">{card.front}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <p className="text-xs text-gray-500">Tap to see answer</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center">
                  <Button 
                    onClick={startReview}
                    className="bg-gradient-premium hover-lift"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Start Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {savedDecks.length > 0 && (
            <Card className="card-premium">
              <CardHeader className="pb-2">
                <div className="flex items-center mb-1">
                  <div className="p-1.5 mr-3 rounded-lg bg-blue-50">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-xl">Your Flashcard Decks</CardTitle>
                </div>
                <CardDescription>Review your saved flashcards by topic</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {savedDecks.map((deck, index) => (
                    <Card key={index} className="border bg-gradient-to-tr from-white to-gray-50 hover:shadow-md transition-shadow hover-lift">
                      <CardContent className="p-6">
                        <h3 className="font-medium text-lg mb-2">{deck.category}</h3>
                        <div className="flex items-center text-sm text-gray-600 mb-4">
                          <BookOpen className="h-4 w-4 mr-1 text-gray-400" />
                          {deck.count} cards
                        </div>
                        <Button 
                          className="w-full bg-white hover:bg-blue-50 text-blue-600 border border-blue-100 hover:border-blue-200 hover-lift" 
                          variant="outline"
                          onClick={() => startDeckReview(deck.category)}
                          disabled={isLoading}
                        >
                          {isLoading ? "Loading..." : "Review Deck"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="py-8">
          <StudyCard
            id={selectedDeck ? `${selectedDeck}-${currentCardIndex}` : `card-${currentCardIndex}`}
            front={(selectedDeck ? deckFlashcards[currentCardIndex]?.front : flashcards[currentCardIndex]?.front) || ""}
            back={(selectedDeck ? deckFlashcards[currentCardIndex]?.back : flashcards[currentCardIndex]?.back) || ""}
            topic={selectedDeck || topic}
            onNext={nextCard}
            onPrevious={previousCard}
            onMark={handleMarkCard}
            onBookmark={handleBookmarkCard}
            hasNext={currentCardIndex < (selectedDeck ? deckFlashcards.length - 1 : flashcards.length - 1)}
            hasPrevious={currentCardIndex > 0}
            difficulty="medium"
            tags={["Cardiology", "Anatomy"]} // Example tags
          />
        </div>
      )}
    </div>
  );
}

export function QuizzesTab({ userId }: UserAwareProps) {
  const [topic, setTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [generating, setGenerating] = useState<boolean>(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number>(0);
  const [quizComplete, setQuizComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mock a generateQuiz function since it seems to be missing from your API
  // In a real app, you would use the actual AI action:
  // const generateQuiz = useAction(api.ai.generateQuiz);
  const generateQuiz = async ({ 
    topic, 
    difficulty, 
    questionCount 
  }: { 
    topic: string; 
    difficulty: string; 
    questionCount: number 
  }) => {
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return a mock quiz
    return {
      title: `Quiz on ${topic}`,
      questions: [
        {
          question: "Which of the following is the most common cause of community-acquired pneumonia?",
          options: [
            "Streptococcus pneumoniae",
            "Haemophilus influenzae",
            "Klebsiella pneumoniae",
            "Mycoplasma pneumoniae"
          ],
          correctAnswer: 0
        },
        {
          question: "Which of the following antibiotics is most appropriate for treating MRSA infections?",
          options: [
            "Amoxicillin",
            "Azithromycin",
            "Vancomycin",
            "Ceftriaxone"
          ],
          correctAnswer: 2
        },
        {
          question: "A 45-year-old patient presents with fever, productive cough, and pleuritic chest pain. Which of the following diagnostic tests should be ordered first?",
          options: [
            "CT scan of the chest",
            "Chest X-ray",
            "Sputum culture",
            "Bronchoscopy"
          ],
          correctAnswer: 1
        }
      ]
    };
  };

  const createQuiz = useMutation(api.quizzes.create);
  const updateQuizScore = useMutation(api.quizzes.updateScore);
  const getQuizzes = useQuery(api.quizzes.getAll, { userId });

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic first");
      return;
    }
    
    setError(null);
    setGenerating(true);
    
    try {
      console.log("Generating quiz for:", {
        topic: topic.trim(),
        difficulty,
        questionCount
      });
      
      const result = await generateQuiz({ 
        topic: topic.trim(),
        difficulty,
        questionCount
      });
      
      console.log("Received quiz response:", result);
      
      if (result && result.questions && result.questions.length > 0) {
        setQuiz(result);
        
        try {
          // Save the quiz to database
          const quizId = await createQuiz({
            userId,
            title: result.title || topic.trim(),
            questions: result.questions
          });
          
          console.log("Successfully saved quiz with ID:", quizId);
          toast.success("Quiz generated successfully!");
        } catch (dbError: unknown) {
          console.error("Database error saving quiz:", dbError);
          const errorMessage = dbError instanceof Error ? dbError.message : "Unknown database error";
          setError(`Error saving quiz: ${errorMessage}`);
          toast.error(`Error saving quiz: ${errorMessage}`);
        }
      } else {
        console.error("No valid quiz questions returned from AI");
        setError("Could not generate quiz. Please try a different topic or difficulty level.");
        toast.error("Could not generate quiz. Please try a different topic.");
      }
    } catch (error: unknown) {
      console.error("Error generating quiz:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Error generating quiz: ${errorMessage}`);
      toast.error(`Failed to generate quiz: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  const startQuiz = () => {
    if (!quiz) {
      toast.error("No quiz available to start");
      return;
    }
    
    if (quiz.questions.length === 0) {
      toast.error("Quiz contains no questions");
      return;
    }
    
    setQuizStarted(true);
    setCurrentQuestion(0);
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setScore(0);
    setQuizComplete(false);
  };

  const answerQuestion = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (!quiz) return;
    
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      for (let i = 0; i < quiz.questions.length; i++) {
        if (answers[i] === quiz.questions[i].correctAnswer) {
          correctCount++;
        }
      }
      setScore(correctCount);
      setQuizComplete(true);
      
      // Save score to database (if we had a quiz ID from creation)
      // updateQuizScore({ id: quizId, score: correctCount });
    }
  };

  const startSavedQuiz = (savedQuiz: any) => {
    try {
      console.log("Starting saved quiz:", savedQuiz);
      
      // First set the quiz
      const newQuiz = {
        title: savedQuiz.title,
        questions: savedQuiz.questions
      };
      
      // Make sure we have valid questions
      if (!newQuiz.questions || !Array.isArray(newQuiz.questions) || newQuiz.questions.length === 0) {
        toast.error("This quiz doesn't contain any valid questions");
        return;
      }
      
      setQuiz(newQuiz);
      
      // Then start the quiz with a slight delay to ensure the quiz state is updated
      setTimeout(() => {
        setQuizStarted(true);
        setCurrentQuestion(0);
        setAnswers(new Array(savedQuiz.questions.length).fill(-1));
        setScore(0);
        setQuizComplete(false);
      }, 100);
    } catch (error: unknown) {
      console.error("Error starting saved quiz:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to start saved quiz: ${errorMessage}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto fade-in space-y-6">
      {!quiz || (!quizStarted && !quizComplete) ? (
        <Card className="card-premium">
          <CardHeader className="pb-2">
            <div className="flex items-center mb-1">
              <div className="p-1.5 mr-3 rounded-lg bg-blue-50">
                <Book className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-2xl">Practice Quizzes</CardTitle>
            </div>
            <CardDescription className="text-gray-600">
              Test your knowledge with AI-generated quizzes on any medical topic
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Quiz topic (e.g., Respiratory Infections, Cardiology Board Review)"
              className="input-premium"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Difficulty
                </label>
                <div className="relative">
                  <select 
                    className="input-premium appearance-none w-full pr-8 cursor-pointer"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Number of Questions
                </label>
                <div className="relative">
                  <select 
                    className="input-premium appearance-none w-full pr-8 cursor-pointer"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  >
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            {error && (
              <div className="alert-premium error p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleGenerateQuiz}
              disabled={generating || !topic.trim()}
              className="w-full bg-gradient-premium hover-lift"
            >
              {!generating && <Book className="h-4 w-4 mr-2" />}
              Generate Quiz
            </Button>
          </CardContent>
        </Card>
      ) : quizComplete ? (
        <Card className="card-premium overflow-hidden">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-1.5 mr-3 rounded-lg bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Quiz Results</CardTitle>
                  <CardDescription className="text-gray-600">
                    You scored {score} out of {quiz.questions.length} ({Math.round((score / quiz.questions.length) * 100)}%)
                  </CardDescription>
                </div>
              </div>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-premium">
                {score}/{quiz.questions.length}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="relative pt-6">
              <Progress 
                value={(score / quiz.questions.length) * 100} 
                className={score / quiz.questions.length > 0.6 ? "bg-green-100" : "bg-blue-100"}
                size="lg"
              />
              <div className="absolute top-0 left-0 w-full text-center">
                <span className="inline-block bg-white px-2 py-1 text-sm font-medium rounded-full shadow-sm">
                  {Math.round((score / quiz.questions.length) * 100)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-4 mt-8">
              <h3 className="text-lg font-semibold text-gray-900">Question Review</h3>
              {quiz.questions.map((q, index) => (
                <Card 
                  key={index} 
                  className={`border-l-4 ${
                    answers[index] === q.correctAnswer 
                      ? 'border-l-green-500 bg-green-50' 
                      : 'border-l-red-500 bg-red-50'
                  } hover-lift overflow-hidden`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start">
                      <div className={`p-1.5 mr-3 rounded-full ${
                        answers[index] === q.correctAnswer 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      } mt-0.5`}>
                        {answers[index] === q.correctAnswer 
                          ? <CheckCircle className="h-5 w-5 text-green-600" />
                          : <X className="h-5 w-5 text-red-600" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{q.question}</p>
                        <div className="mt-3 space-y-2">
                          {q.options.map((option, optIndex) => (
                            <div 
                              key={optIndex} 
                              className={`p-3 rounded-lg border ${
                                optIndex === q.correctAnswer 
                                  ? 'bg-green-100 border-green-200 text-green-800' 
                                  : answers[index] === optIndex && optIndex !== q.correctAnswer 
                                    ? 'bg-red-100 border-red-200 text-red-800' 
                                    : 'bg-white border-gray-200 text-gray-600'
                              } flex justify-between items-center`}
                            >
                              <span>{option}</span>
                              {optIndex === q.correctAnswer && 
                                <span className="bg-green-200 text-green-800 p-1 rounded-full">
                                  <CheckCircle className="h-4 w-4" />
                                </span>
                              }
                              {answers[index] === optIndex && optIndex !== q.correctAnswer && 
                                <span className="bg-red-200 text-red-800 p-1 rounded-full">
                                  <X className="h-4 w-4" />
                                </span>
                              }
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {setQuiz(null); setTopic("");}}
                className="hover-lift"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Quiz
              </Button>
              <Button 
                onClick={() => {setQuizStarted(false); setQuizComplete(false);}}
                className="bg-gradient-premium hover-lift"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-premium">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-transparent bg-clip-text bg-gradient-premium">{quiz.title}</CardTitle>
                <CardDescription className="text-gray-600">
                  Question {currentQuestion + 1} of {quiz.questions.length}
                </CardDescription>
              </div>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="relative pt-2">
              <Progress value={((currentQuestion + 1) / quiz.questions.length) * 100} size="lg" />
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>Question {currentQuestion + 1}</span>
                <span>{quiz.questions.length} total</span>
              </div>
            </div>
            
            <div className="p-6 bg-gradient-secondary rounded-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-6">{quiz.questions[currentQuestion].question}</h3>
              <div className="space-y-3">
                {quiz.questions[currentQuestion].options.map((option, index) => (
                  <div 
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      answers[currentQuestion] === index 
                        ? 'bg-blue-50 border-blue-200 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                    onClick={() => answerQuestion(currentQuestion, index)}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border ${
                        answers[currentQuestion] === index 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      } mr-3 flex items-center justify-center`}>
                        {answers[currentQuestion] === index && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span className={answers[currentQuestion] === index ? 'text-blue-700 font-medium' : ''}>{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={nextQuestion}
                disabled={answers[currentQuestion] === -1}
                className="bg-gradient-premium hover-lift"
              >
                {currentQuestion < quiz.questions.length - 1 ? "Next Question" : "Finish Quiz"}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {getQuizzes && getQuizzes.length > 0 && !quizStarted && !quizComplete && (
        <Card className="card-premium">
          <CardHeader className="pb-2">
            <div className="flex items-center mb-1">
              <div className="p-1.5 mr-3 rounded-lg bg-blue-50">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-xl">Your Quizzes</CardTitle>
            </div>
            <CardDescription className="text-gray-600">Review your past quizzes or start a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getQuizzes.slice(0, 5).map((savedQuiz, index) => (
                <div key={index} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:border-blue-100 hover:bg-blue-50/20 transition-colors group">
                  <div>
                    <h3 className="font-medium text-gray-900">{savedQuiz.title}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <Book className="h-3.5 w-3.5 mr-1 text-gray-400" />
                      <span>{savedQuiz.questions.length} questions</span>
                      <span className="mx-2">•</span>
                      {savedQuiz.score !== undefined ? (
                        <div className="flex items-center">
                          <span className={`${
                            (savedQuiz.score / savedQuiz.questions.length) > 0.7 
                              ? 'text-green-600' 
                              : (savedQuiz.score / savedQuiz.questions.length) > 0.4 
                                ? 'text-amber-600' 
                                : 'text-red-600'
                          }`}>
                            Score: {savedQuiz.score}/{savedQuiz.questions.length}
                          </span>
                        </div>
                      ) : (
                        <span className="text-blue-600">Not taken</span>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => startSavedQuiz(savedQuiz)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover-lift"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start Quiz
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ProgressTab({ userId }: UserAwareProps) {
  // API connections
  const getProgress = useQuery(api.progress.getAll, { userId });
  // Mock a suggestReviewContent function since it seems to be missing from your API
  // In a real app, you would use the actual AI action:
  // const suggestReview = useAction(api.ai.suggestReviewContent);
  const [reviewPlan, setReviewPlan] = useState("");
  const [suggestedTopics, setSuggestedTopics] = useState<{topic: string, priority: string}[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  
  // Format data for display
  const progressData = getProgress || [];
  
  // Prepare chart data
  const chartData = progressData.map(item => ({
    name: item.topic,
    confidence: item.confidence,
    lastReviewed: new Date(item.lastReviewed).getTime(),
  }));
  
  const handleGenerateReviewPlan = async () => {
    setIsGeneratingPlan(true);
    setError(null);
    
    try {
      // Mock suggestReviewContent function since it's missing from the API
      // In a real app, you would call the actual AI action
      // const result = await suggestReview({ userId });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response
      const result = {
        reviewPlan: "Based on your current progress, I recommend focusing on Cardiology and Respiratory topics this week. These subjects show the lowest confidence scores and haven't been reviewed recently. Plan 30-minute daily sessions alternating between these topics, using active recall and spaced repetition techniques.",
        suggestedTopics: [
          { topic: "Cardiac Pharmacology", priority: "high" },
          { topic: "Respiratory Pathophysiology", priority: "medium" },
          { topic: "Renal Physiology", priority: "low" }
        ]
      };
      
      setReviewPlan(result.reviewPlan);
      setSuggestedTopics(result.suggestedTopics);
      
      toast.success("Review plan generated successfully!");
    } catch (error: unknown) {
      console.error("Error generating review plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to generate review plan: ${errorMessage}`);
      toast.error(`Failed to generate review plan: ${errorMessage}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Get today's date for formatting
  const today = new Date();
  
  // Define priority colors
  const getPriorityColors = (priority: string) => {
    switch(priority) {
      case 'high':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          dot: 'bg-red-500',
          border: 'border-red-200'
        };
      case 'medium':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-800',
          dot: 'bg-amber-500',
          border: 'border-amber-200'
        };
      case 'low':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          dot: 'bg-green-500',
          border: 'border-green-200'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          dot: 'bg-gray-500',
          border: 'border-gray-200'
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center mb-1">
              <div className="p-1.5 mr-3 rounded-lg bg-blue-50">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-2xl">Learning Progress</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8"
              >
                <ListOrdered className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "chart" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("chart")}
                className="h-8"
              >
                <BarChart className="h-4 w-4 mr-1" />
                Chart
              </Button>
            </div>
          </div>
          <CardDescription className="text-gray-600">
            Track your confidence and review status across different medical topics
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {progressData.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No progress data yet</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                As you use flashcards and quizzes, your progress will be tracked here.
                Start by reviewing some flashcards or taking a quiz.
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <Button
                  variant="outline"
                  className="hover-lift"
                  onClick={() => toast.info("Navigate to the Flashcards tab to start reviewing")}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Review Flashcards
                </Button>
                <Button
                  variant="outline"
                  className="hover-lift"
                  onClick={() => toast.info("Navigate to the Quizzes tab to test your knowledge")}
                >
                  <Book className="h-4 w-4 mr-2" />
                  Take a Quiz
                </Button>
              </div>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-6">
              {progressData.map((item, index) => (
                <div key={index} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow hover-lift">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="font-medium text-lg text-gray-900">{item.topic}</h3>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          Last reviewed: {
                            new Date(item.lastReviewed).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          }
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full">
                      <span className={`font-semibold ${
                        item.confidence >= 70 ? 'text-green-600' : 
                        item.confidence >= 40 ? 'text-amber-600' : 
                        'text-red-600'
                      }`}>
                        {item.confidence}%
                      </span>
                      <span className="text-gray-400 text-sm ml-1">confidence</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress 
                      value={item.confidence} 
                      className={
                        item.confidence >= 70 ? 'bg-green-100' : 
                        item.confidence >= 40 ? 'bg-amber-100' : 
                        'bg-red-100'
                      }
                      size="default"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4 justify-end">
                    <Button variant="outline" size="sm" className="hover-lift">
                      <BookOpen className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button variant="outline" size="sm" className="hover-lift">
                      <Book className="h-4 w-4 mr-1" />
                      Generate Quiz
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-96 w-full bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              {/* This is a placeholder for the chart view - in a real app, you would render a proper chart here */}
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-500">Chart visualization would be rendered here</p>
                  <p className="text-sm text-gray-400 mt-2">Using a library like Recharts or Chart.js</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader className="pb-2">
          <div className="flex items-center mb-1">
            <div className="p-1.5 mr-3 rounded-lg bg-blue-50">
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <CardTitle className="text-2xl">Smart Review Mode</CardTitle>
          </div>
          <CardDescription className="text-gray-600">
            Optimize your learning with AI-powered spaced repetition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {!reviewPlan ? (
            <div className="text-center py-8 space-y-4">
              <div className="relative">
                <div className="h-20 w-20 bg-gradient-premium rounded-full mx-auto flex items-center justify-center">
                  <Brain className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Ready for Smart Review?</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Our AI will analyze your progress and create a personalized review plan
                  based on confidence levels and time since last review.
                </p>
              </div>
              
              {error && (
                <div className="alert-premium error max-w-md mx-auto">
                  <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <Button 
                onClick={handleGenerateReviewPlan}
                disabled={isGeneratingPlan}
                className="bg-gradient-premium hover-lift mt-4"
              >
                {!isGeneratingPlan && <Sparkles className="h-4 w-4 mr-2" />}
                Generate Smart Review Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-gradient-secondary rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <Brain className="h-full w-full text-blue-600" />
                </div>
                <div className="relative">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Your Personalized Review Plan</h3>
                      <div className="prose prose-blue max-w-none text-gray-700">
                        {reviewPlan.split('\n\n').map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center mb-4">
                      <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Today's Review Schedule</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center mb-2">
                          <Clock className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="text-sm font-medium">Morning Session</span>
                        </div>
                        <p className="text-gray-700">Cardiac Pharmacology (30 min)</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center mb-2">
                          <Clock className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="text-sm font-medium">Evening Session</span>
                        </div>
                        <p className="text-gray-700">Respiratory Pathophysiology (30 min)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {suggestedTopics.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-lg text-gray-900">Suggested Topics to Review</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {suggestedTopics.map((topic, index) => {
                      const colors = getPriorityColors(topic.priority);
                      return (
                        <div 
                          key={index} 
                          className={`rounded-xl ${colors.bg} ${colors.text} p-5 border ${colors.border} hover-lift`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                              <h5 className="font-medium">{topic.topic}</h5>
                            </div>
                            <span className="uppercase text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-50">
                              {topic.priority}
                            </span>
                          </div>
                          <div className="mt-4 flex">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full bg-white hover-lift"
                            >
                              <BookOpen className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  className="hover-lift"
                  onClick={() => {
                    setReviewPlan("");
                    setSuggestedTopics([]);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Plan
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}