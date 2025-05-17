import React, { useState, useEffect, useRef } from "react";
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
  ListOrdered,
  FileText,
  Zap,
  Settings,
  Target,
  TrendingUp,
  Eye,
  Copy,
  Save,
  Loader2,
  Info,
  Moon,
  Sun,
  LayoutGrid,
  ListChecks,
  Trash2,
  Edit3,
  Plus,
  ArrowLeft, // Added
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Progress } from "../../components/ui/progress";
import StudyCard from "../ui/StudyCard";
import { Badge } from "../../components/ui/badge";
// Removed custom Select imports
import { motion, AnimatePresence } from "framer-motion";

interface UserAwareProps {
  userId: Id<"users">;
}

interface FlashcardSet {
  id: string;
  title: string;
  cards: Flashcard[];
  source?: string;
  createdAt?: number;
}

interface Flashcard {
  front: string;
  back: string;
  category?: string;
  lastReviewed?: number;
  confidence?: number;
  _id?: Id<"flashcards">;
  _creationTime?: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation?: string;
}

interface Quiz {
  _id?: Id<"quizzes">;
  title: string;
  questions: QuizQuestion[];
  score?: number;
  takenAt?: number;
  difficulty?: string;
}

interface ProgressItem {
    _id?: Id<"progress">;
    topic: string;
    confidence: number;
    lastReviewed: number;
}

const formatDate = (timestamp: number | Date | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (timestamp === undefined) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
    };
    return new Date(timestamp).toLocaleDateString(undefined, options || defaultOptions);
};


export function FlashcardsTab({ userId }: UserAwareProps) {
  const [topic, setTopic] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reviewingSet, setReviewingSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const generateFlashcardsAction = useAction(api.ai.generateFlashcards);
  const createFlashcardBatchMutation = useMutation(api.flashcards.createBatch);
  const allFlashcardsQuery = useQuery(api.flashcards.getAll, { userId });

  const [savedDecks, setSavedDecks] = useState<FlashcardSet[]>([]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (allFlashcardsQuery) {
      const decksMap = new Map<string, Flashcard[]>();
      allFlashcardsQuery.forEach(card => {
        const category = card.category || "Uncategorized";
        if (!decksMap.has(category)) {
          decksMap.set(category, []);
        }
        decksMap.get(category)?.push({
            front: card.front,
            back: card.back,
            category: card.category,
            _id: card._id,
            _creationTime: card._creationTime,
            confidence: card.confidence,
            lastReviewed: card.lastReviewed
        });
      });
      const formattedDecks: FlashcardSet[] = Array.from(decksMap.entries()).map(([title, cards]) => ({
        id: title,
        title,
        cards,
        source: "Saved Deck",
        createdAt: cards[0]?._creationTime
      })).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSavedDecks(formattedDecks);
    }
  }, [allFlashcardsQuery]);


  const handleGenerateFlashcards = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic to generate flashcards.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedFlashcards([]);
    try {
      const response = await generateFlashcardsAction({
        topic: topic.trim(),
        content: content.trim() || undefined,
      });
      if (response && response.length > 0) {
        const newCards = response.map((card, index) => ({ ...card, id: `gen-${index}` }));
        setGeneratedFlashcards(newCards);
        toast.success(`${response.length} flashcards generated for "${topic.trim()}"!`);
      } else {
        setError("No flashcards could be generated. Try refining your topic or adding more content.");
        toast.info("No flashcards generated. Try a different input.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to generate flashcards: ${msg}`);
      toast.error(`Generation failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveGeneratedCards = async () => {
    if (generatedFlashcards.length === 0) return;
    setIsLoading(true);
    try {
        const cardsToSave = generatedFlashcards.map(card => ({
            front: card.front,
            back: card.back,
            category: topic.trim() || "Generated Deck"
        }));
        await createFlashcardBatchMutation({ userId, cards: cardsToSave });
        toast.success("Flashcards saved successfully to your decks!");
        setGeneratedFlashcards([]);
        setTopic("");
        setContent("");
    } catch (error) {
        toast.error("Failed to save flashcards.");
        console.error("Error saving flashcards:", error);
    } finally {
        setIsLoading(false);
    }
};

  const startReview = (deck: FlashcardSet) => {
    if (!deck.cards || deck.cards.length === 0) {
      toast.error("This deck has no cards to review.");
      return;
    }
    setReviewingSet(deck);
    setCurrentCardIndex(0);
  };

  const handleNextCard = () => {
    if (reviewingSet && currentCardIndex < reviewingSet.cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      toast.success(`Finished reviewing "${reviewingSet?.title}"!`);
      setReviewingSet(null);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const updateCardConfidence = useMutation(api.flashcards.updateReview);
  const handleMarkConfidence = async (confidence: number) => {
    if (reviewingSet) {
        const card = reviewingSet.cards[currentCardIndex];
        if (card._id) {
            try {
                await updateCardConfidence({id: card._id, confidence});
                const updatedCards = [...reviewingSet.cards];
                updatedCards[currentCardIndex] = {...card, confidence, lastReviewed: Date.now()};
                setReviewingSet({...reviewingSet, cards: updatedCards});
                toast.info(`Card marked with confidence: ${confidence}/5`);
            } catch(err) {
                toast.error("Failed to update card confidence.");
            }
        }
        handleNextCard();
    }
  };

  if (reviewingSet) {
    const currentCard = reviewingSet.cards[currentCardIndex];
    return (
      <div className={`max-w-2xl mx-auto py-8 px-4 ${darkMode ? 'text-neutral-100' : ''}`}>
        <Button variant="outline" onClick={() => setReviewingSet(null)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Decks {/* Corrected: Use ArrowLeft */}
        </Button>
        <StudyCard
          id={currentCard._id?.toString() || `temp-${currentCardIndex}`}
          front={currentCard.front}
          back={currentCard.back}
          topic={reviewingSet.title}
          difficulty="medium"
          onNext={handleNextCard}
          onPrevious={handlePreviousCard}
          onMark={handleMarkConfidence}
          hasNext={currentCardIndex < reviewingSet.cards.length - 1}
          hasPrevious={currentCardIndex > 0}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${darkMode ? 'text-neutral-200' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center">
            <div className={`p-2.5 mr-3 rounded-xl shadow-md ${darkMode ? 'bg-purple-500' : 'bg-purple-600'}`}>
                <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
                <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`}>Flashcards</h1>
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Create, review, and master medical concepts.</p>
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

      <Card className={`shadow-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
          <div className="flex items-center gap-3">
            <Sparkles className={`h-5 w-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <CardTitle className={`text-lg font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Generate New Flashcards</CardTitle>
          </div>
          <CardDescription className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
            Enter a topic or paste content to let AI create flashcards for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter Topic (e.g., Cardiac Cycle, Types of Anemia)"
            className={`rounded-lg h-11 ${darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`}
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Optional: Paste specific content here to generate flashcards from..."
            className={`rounded-lg min-h-[100px] custom-scrollbar ${darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-200 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`}
          />
          {error && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle className="h-4 w-4"/>{error}</p>}
          <div className="flex justify-end">
            <Button onClick={handleGenerateFlashcards} disabled={isLoading || !topic.trim()} className={`rounded-lg shadow-md ${darkMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-600 hover:bg-purple-700'}`}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Zap className="h-4 w-4 mr-2" />}
              Generate with AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedFlashcards.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Generated Cards for "{topic}"</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => startReview({id: 'generated', title: `Review: ${topic}`, cards: generatedFlashcards, source: 'Generated'})} className={`rounded-lg shadow-sm ${darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                        <Play className="h-4 w-4 mr-2"/> Review These
                    </Button>
                    <Button onClick={handleSaveGeneratedCards} className={`rounded-lg shadow-sm ${darkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-600'}`}>
                        <Save className="h-4 w-4 mr-2"/> Save to My Decks
                    </Button>
                </div>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedFlashcards.slice(0, 6).map((card, index) => (
              <Card key={`gen-${index}`} className={`p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow ${darkMode ? 'bg-neutral-700 border-neutral-600 hover:border-purple-500' : 'bg-white border-gray-200 hover:border-purple-400'}`} onClick={() => startReview({id: 'generated', title: `Preview: ${topic}`, cards: [card], source: 'Generated'})}>
                <p className={`font-medium text-sm line-clamp-2 mb-1 ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>{card.front}</p>
                <p className={`text-xs line-clamp-3 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>{card.back}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        <h2 className={`text-2xl font-semibold border-b pb-2 mb-4 ${darkMode ? 'text-neutral-100 border-neutral-700' : 'text-gray-800 border-gray-200'}`}>Your Flashcard Decks</h2>
        {savedDecks.length === 0 && !isLoading && (
             <div className={`text-center py-10 rounded-xl ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <BookOpen className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>No Saved Decks Yet</h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                    Generate flashcards above or organize existing ones into decks.
                </p>
            </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedDecks.map((deck) => (
            <motion.div
                key={deck.id}
                initial={{ opacity: 0, y:20 }} animate={{ opacity: 1, y:0 }} transition={{delay: 0.1 * savedDecks.indexOf(deck)}}
                className={`rounded-xl shadow-lg overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
                            ${darkMode ? 'bg-neutral-800 border border-neutral-700 hover:border-purple-600' : 'bg-white border-gray-200 hover:border-purple-400'}`}
                onClick={() => startReview(deck)}
            >
              <div className={`p-5 border-b ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                <div className="flex justify-between items-start">
                    <h3 className={`text-md font-semibold line-clamp-2 ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{deck.title}</h3>
                    <Badge variant="outline" className={`text-xs rounded-full px-2 py-0.5 ${darkMode ? 'border-neutral-600 bg-neutral-700 text-neutral-300' : 'border-gray-300 bg-gray-50 text-gray-600'}`}>{deck.cards.length} cards</Badge>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Last reviewed: {deck.cards.find(c => c.lastReviewed)?.lastReviewed ? formatDate(deck.cards.find(c => c.lastReviewed)?.lastReviewed) : 'Never'}</p>
              </div>
              <div className="p-5">
                <Button variant="default" className={`w-full rounded-lg shadow-md group-hover:opacity-90 transition-opacity ${darkMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-600 hover:bg-purple-700'}`}>
                    <Play className="h-4 w-4 mr-2"/> Review Deck
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}


export function QuizzesTab({ userId }: UserAwareProps) {
  const [topic, setTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizInProgress, setQuizInProgress] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [isQuizComplete, setIsQuizComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Use your actual AI action for generating quizzes
  const generateQuizActionConvex = useAction(api.ai.generateQuizQuestions); // Placeholder if you create this
  
  const createQuizMutation = useMutation(api.quizzes.create);
  const updateQuizScoreMutation = useMutation(api.quizzes.updateScore);
  const pastQuizzesQuery = useQuery(api.quizzes.getAll, { userId });
  
  const [pastQuizzes, setPastQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (pastQuizzesQuery) {
        setPastQuizzes(pastQuizzesQuery.sort((a,b) => (b.takenAt || 0) - (a.takenAt || 0)));
    }
  }, [pastQuizzesQuery]);


  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a quiz topic.");
      return;
    }
    setIsGeneratingQuiz(true);
    setError(null);
    setCurrentQuiz(null);
    setIsQuizComplete(false);
    try {
      // Replace mock with actual Convex action call
      // const quizData = await generateQuizAction({ topic: topic.trim(), difficulty, questionCount });
      // For now, we'll assume you'll create `generateQuizQuestions` in convex/ai.ts
      // You'll need to define what this action returns (e.g., { title: string, questions: QuizQuestion[] })
      const quizData = await generateQuizActionConvex({ 
          topic: topic.trim(), 
          difficulty, 
          questionCount,
          // You might need to pass a system prompt or other parameters here
          // depending on how you structure your `generateQuizQuestions` action.
      });

       if (quizData && quizData.questions && quizData.questions.length > 0) {
        // Assuming quizData.questions is QuizQuestionFromAI[]
        const transformedQuestions: QuizQuestion[] = quizData.questions.map(qFromAI => ({
          question: qFromAI.question,
          options: qFromAI.options,
          correctAnswer: qFromAI.correctAnswerIndex, // Map here!
          explanation: qFromAI.explanation,
        }));

        const quizToSave: Omit<Quiz, '_id' | 'score' | 'takenAt'> = {
            title: quizData.title || `Quiz: ${topic.trim()}`,
            questions: transformedQuestions, // Use the transformed questions
            difficulty: quizData.difficulty || difficulty // Prefer difficulty from AI if provided
        };
        const quizId = await createQuizMutation({
             userId,
             title: quizToSave.title,
             questions: quizToSave.questions,
             // difficulty: quizToSave.difficulty, // also store difficulty if in schema
        });
        setCurrentQuiz({...quizToSave, _id: quizId}); // Store the transformed quiz
        toast.success(`Quiz "${quizToSave.title}" generated!`);
      } else {
        setError("Could not generate quiz. AI did not return valid questions. Please try a different topic or settings.");
        toast.info("Quiz generation failed or returned no questions.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error during quiz generation";
      setError(`Failed to generate quiz: ${msg}`);
      toast.error(`Generation failed: ${msg}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const startQuiz = (quizToStart?: Quiz) => {
    const activeQuiz = quizToStart || currentQuiz;
    if (!activeQuiz || !activeQuiz.questions || activeQuiz.questions.length === 0) {
      toast.error("No quiz available or quiz has no questions.");
      return;
    }
    setCurrentQuiz(activeQuiz);
    setQuizInProgress(true);
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(activeQuiz.questions.length).fill(null));
    setQuizScore(0);
    setIsQuizComplete(false);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (!currentQuiz) return;
    if (userAnswers[currentQuestionIndex] === null) {
        toast.error("Please select an answer.");
        return;
    }
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      let score = 0;
      currentQuiz.questions.forEach((q, index) => {
        if (userAnswers[index] === q.correctAnswer) {
          score++;
        }
      });
      setQuizScore(score);
      setIsQuizComplete(true);
      setQuizInProgress(false);
      if(currentQuiz._id) {
        updateQuizScoreMutation({ id: currentQuiz._id, score });
      }
      toast.success("Quiz completed! Results are shown below.");
    }
  };

  const resetQuizGenerator = () => {
    setCurrentQuiz(null);
    setTopic("");
    setDifficulty("medium");
    setQuestionCount(5);
    setIsQuizComplete(false);
    setError(null);
  };

  if (quizInProgress && currentQuiz) {
    const question = currentQuiz.questions[currentQuestionIndex];
    return (
        <div className={`max-w-3xl mx-auto py-8 px-4 ${darkMode ? 'text-neutral-100' : ''}`}>
            <Card className={`shadow-xl ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
                <CardHeader className={`border-b ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-center">
                        <CardTitle className={`text-xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{currentQuiz.title}</CardTitle>
                        <Badge variant="outline" className={`${darkMode ? 'border-neutral-600 bg-neutral-700' : 'border-gray-300 bg-gray-50'}`}>
                            Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <Progress value={((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100} className="mb-4 h-2" />
                    <p className={`text-lg font-medium ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>{question.question}</p>
                    <div className="space-y-3">
                        {question.options.map((option, index) => (
                        <Button
                            key={index}
                            variant={userAnswers[currentQuestionIndex] === index ? "default" : "outline"}
                            className={`w-full justify-start text-left h-auto py-3 px-4 rounded-lg transition-all duration-150
                                        ${userAnswers[currentQuestionIndex] === index 
                                            ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                                            : (darkMode ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-300' : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700')}
                                        `}
                            onClick={() => handleAnswerSelect(index)}
                        >
                            <span className={`mr-3 h-5 w-5 rounded-full border-2 flex items-center justify-center ${userAnswers[currentQuestionIndex] === index ? (darkMode ? 'border-blue-400 bg-blue-500' : 'border-blue-300 bg-blue-600') : (darkMode ? 'border-neutral-500' : 'border-gray-400')}`}>
                                {userAnswers[currentQuestionIndex] === index && <CheckCircle className="h-3 w-3 text-white"/>}
                            </span>
                            {option}
                        </Button>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className={`border-t pt-4 ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                    <Button onClick={handleNextQuestion} disabled={userAnswers[currentQuestionIndex] === null} className="w-full rounded-lg shadow-md">
                        {currentQuestionIndex < currentQuiz.questions.length - 1 ? "Next Question" : "Finish Quiz"}
                        <ChevronRight className="h-4 w-4 ml-2"/>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (isQuizComplete && currentQuiz) {
    return (
        <div className={`max-w-3xl mx-auto py-8 px-4 ${darkMode ? 'text-neutral-100' : ''}`}>
            <Card className={`shadow-xl ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
                <CardHeader className={`text-center border-b ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                    <CheckCircle className={`h-16 w-16 mx-auto mb-3 ${quizScore / currentQuiz.questions.length >= 0.7 ? 'text-green-500' : 'text-orange-500'}`} />
                    <CardTitle className={`text-2xl font-bold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Quiz Completed!</CardTitle>
                    <CardDescription className={`text-lg ${darkMode ? 'text-neutral-300' : 'text-gray-600'}`}>You scored {quizScore} out of {currentQuiz.questions.length}</CardDescription>
                    <Progress value={(quizScore / currentQuiz.questions.length) * 100} className={`mt-4 h-3 ${quizScore / currentQuiz.questions.length >= 0.7 ? 'bg-green-200 dark:bg-green-700 progress-bar-green' : 'bg-orange-200 dark:bg-orange-700 progress-bar-orange'}`} />
                </CardHeader>
                <CardContent className="p-6 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>Review Your Answers:</h3>
                    {currentQuiz.questions.map((q, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${userAnswers[index] === q.correctAnswer ? (darkMode ? 'border-green-500 bg-neutral-700/50' : 'border-green-400 bg-green-50') : (darkMode ? 'border-red-500 bg-neutral-700/50' : 'border-red-400 bg-red-50')}`}>
                            <p className={`font-medium mb-1 ${darkMode ? 'text-neutral-200' : 'text-gray-800'}`}>{index + 1}. {q.question}</p>
                            <p className={`text-sm ${userAnswers[index] === q.correctAnswer ? (darkMode ? 'text-green-400':'text-green-600') : (darkMode ? 'text-red-400':'text-red-600')}`}>
                                Your answer: {q.options[userAnswers[index]!] || "Not answered"} {userAnswers[index] === q.correctAnswer ? <CheckCircle className="inline h-4 w-4 ml-1"/> : <X className="inline h-4 w-4 ml-1"/>}
                            </p>
                            {userAnswers[index] !== q.correctAnswer && <p className={`text-sm ${darkMode ? 'text-neutral-400':'text-gray-600'}`}>Correct answer: {q.options[q.correctAnswer]}</p>}
                            {q.explanation && <p className={`text-xs mt-1 p-2 rounded ${darkMode ? 'bg-neutral-700 text-neutral-300':'bg-gray-100 text-gray-500'}`}>Explanation: {q.explanation}</p>}
                        </div>
                    ))}
                </CardContent>
                 <CardFooter className={`border-t pt-4 flex flex-col sm:flex-row justify-between gap-2 ${darkMode ? 'border-neutral-700' : 'border-gray-100'}`}>
                    <Button variant="outline" onClick={() => startQuiz()} className="w-full sm:w-auto rounded-lg">
                        <RotateCcw className="h-4 w-4 mr-2"/> Retry Quiz
                    </Button>
                    <Button onClick={resetQuizGenerator} className="w-full sm:w-auto rounded-lg">
                        <PlusCircle className="h-4 w-4 mr-2"/> Create New Quiz
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }
  
  return (
    <div className={`space-y-8 ${darkMode ? 'text-neutral-200' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
                <div className={`p-2.5 mr-3 rounded-xl shadow-md ${darkMode ? 'bg-teal-500' : 'bg-teal-600'}`}>
                    <Book className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`}>Practice Quizzes</h1>
                    <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Test your knowledge with AI-generated quizzes.</p>
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

      <Card className={`shadow-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
            <div className="flex items-center gap-3">
                <Sparkles className={`h-5 w-5 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                <CardTitle className={`text-lg font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Generate a New Quiz</CardTitle>
            </div>
            <CardDescription className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                Customize your quiz by topic, difficulty, and number of questions.
            </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter Quiz Topic (e.g., Endocrine System, Antibiotics)"
            className={`rounded-lg h-11 ${darkMode ? 'bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/30'}`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="quizDifficulty" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>Difficulty</label>
                <select
                    id="quizDifficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className={`w-full rounded-lg h-11 px-3 border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-neutral-200 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'}`}
                >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium (Recommended)</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            <div>
                <label htmlFor="questionCount" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>Number of Questions</label>
                 <select
                    id="questionCount"
                    value={questionCount.toString()}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))} // Corrected: type 'e' as React.ChangeEvent<HTMLSelectElement>
                    className={`w-full rounded-lg h-11 px-3 border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-neutral-200 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'}`}
                >
                    <option value="3">3 Questions</option>
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle className="h-4 w-4"/>{error}</p>}
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            {currentQuiz && !isGeneratingQuiz && (
                 <Button variant="outline" onClick={() => startQuiz()} className={`rounded-lg shadow-sm w-full sm:w-auto ${darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                    <Play className="h-4 w-4 mr-2"/> Start Generated Quiz
                </Button>
            )}
            <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || !topic.trim()} className={`rounded-lg shadow-md w-full sm:w-auto ${darkMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-600 hover:bg-teal-700'}`}>
              {isGeneratingQuiz ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Sparkles className="h-4 w-4 mr-2" />}
              {currentQuiz ? "Regenerate Quiz" : "Generate Quiz"}
            </Button>
          </div>
        </CardContent>
      </Card>

        {pastQuizzes.length > 0 && (
            <div className="space-y-4 mt-8">
                <h2 className={`text-2xl font-semibold border-b pb-2 mb-4 ${darkMode ? 'text-neutral-100 border-neutral-700' : 'text-gray-800 border-gray-200'}`}>Past Quizzes</h2>
                <div className="space-y-3">
                    {pastQuizzes.map(quiz => (
                        <Card key={quiz._id?.toString()} className={`p-4 rounded-lg shadow-md flex justify-between items-center group ${darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700/70' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <div>
                                <h3 className={`font-medium ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{quiz.title}</h3>
                                <p className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                                    Taken: {quiz.takenAt ? formatDate(quiz.takenAt) : 'Not taken'} | 
                                    Score: {quiz.score !== undefined ? `${quiz.score}/${quiz.questions.length}` : 'N/A'} | 
                                    {quiz.difficulty ? ` Difficulty: ${quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}` : ''}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => startQuiz(quiz)} className={`rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-100'}`}>
                                <Play className="h-4 w-4 mr-1.5"/> Review / Retry
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}


export function ProgressTab({ userId }: UserAwareProps) {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(false);
  const [reviewPlan, setReviewPlan] = useState<string | null>(null);
  const [suggestedReviewTopics, setSuggestedReviewTopics] = useState<{topic: string, priority: string, reason?: string}[]>([]);
  
  const progressQuery = useQuery(api.progress.getAll, { userId });
  // const suggestReviewAction = useAction(api.ai.suggestReviewContent); // This action does not exist in user's convex/ai.ts

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const progressData: ProgressItem[] = progressQuery 
    ? [...progressQuery].sort((a,b) => b.lastReviewed - a.lastReviewed) 
    : [];

  const handleGenerateReviewPlan = async () => {
    setIsLoadingPlan(true);
    setReviewPlan(null);
    setSuggestedReviewTopics([]);
    try {
        // TODO: User needs to implement `api.ai.suggestReviewContent` or a similar action in convex/ai.ts
        // For now, using mock data as `api.ai.suggestReviewContent` is not found.
        toast.info("Generating smart review plan (using mock data for now). Implement AI action for real suggestions.");
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockResult = {
            reviewPlan: "Based on your current progress (mock data), focus on Cardiology and high-yield Pharmacology topics this week. Revisit topics with confidence below 60% or those not reviewed in the last 2 weeks. Allocate 30-minute focused sessions.",
            suggestedTopics: [
                { topic: "Cardiac Arrhythmias (Mock)", priority: "High", reason: "Low confidence (45%)" },
                { topic: "Beta Blockers MOA (Mock)", priority: "Medium", reason: "Not reviewed in 15 days" },
                { topic: "Renal Physiology Basics (Mock)", priority: "Low", reason: "Good confidence (80%) but core topic" },
            ]
        };
        setReviewPlan(mockResult.reviewPlan);
        setSuggestedReviewTopics(mockResult.suggestedTopics);
        toast.success("Smart Review Plan generated (mock data)!");
    } catch (error) {
        toast.error("Failed to generate review plan.");
        console.error("Error generating review plan:", error);
    } finally {
        setIsLoadingPlan(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return darkMode ? 'text-green-400' : 'text-green-600';
    if (confidence >= 50) return darkMode ? 'text-yellow-400' : 'text-yellow-500';
    return darkMode ? 'text-red-400' : 'text-red-500';
  };
   const getProgressBgColor = (confidence: number) => {
    if (confidence >= 75) return darkMode ? 'bg-green-500/20' : 'bg-green-100';
    if (confidence >= 50) return darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100';
    return darkMode ? 'bg-red-500/20' : 'bg-red-100';
  };


  return (
    <div className={`space-y-8 ${darkMode ? 'text-neutral-200' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
                <div className={`p-2.5 mr-3 rounded-xl shadow-md ${darkMode ? 'bg-green-500' : 'bg-green-600'}`}>
                    <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`}>Learning Progress</h1>
                    <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Track your mastery across medical topics.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className={`p-0.5 rounded-lg flex ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-200 border-gray-300'} border`}>
                    <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-md h-8 w-8 ${viewMode === 'list' && (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white') }`} title="List View"><ListChecks className="h-4 w-4"/></Button>
                    <Button variant={viewMode === 'chart' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('chart')} className={`rounded-md h-8 w-8 ${viewMode === 'chart' && (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white') }`} title="Chart View"><BarChart className="h-4 w-4"/></Button>
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
        </div>

      <Card className={`shadow-xl overflow-hidden ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className={`border-b ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
            <div className="flex items-center gap-3">
                <Sparkles className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <CardTitle className={`text-lg font-semibold ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>Smart Review Suggestions</CardTitle>
            </div>
             <CardDescription className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                Let AI analyze your progress and suggest a focused review plan. (Backend AI action needed for full functionality)
            </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-4">
            {isLoadingPlan ? (
                <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin mr-3"/> Generating your personalized plan...
                </div>
            ) : reviewPlan ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-neutral-700/50' : 'bg-green-50'}`}>
                        <h4 className={`font-semibold mb-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>AI Review Plan:</h4>
                        <p className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>{reviewPlan}</p>
                    </div>
                    {suggestedReviewTopics.length > 0 && (
                        <div>
                            <h4 className={`font-medium mb-2 ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>Key Topics to Review:</h4>
                            <div className="space-y-2">
                                {suggestedReviewTopics.map(item => (
                                    <div key={item.topic} className={`p-3 rounded-md border flex justify-between items-center ${darkMode ? `bg-neutral-700 border-neutral-600 ${item.priority === 'High' ? 'border-l-red-500' : item.priority === 'Medium' ? 'border-l-yellow-500' : 'border-l-green-500'}` 
                                                                                                                                    : `bg-white border-gray-200 ${item.priority === 'High' ? 'border-l-red-400' : item.priority === 'Medium' ? 'border-l-yellow-400' : 'border-l-green-400'}` } border-l-4`}>
                                        <div>
                                            <span className={`font-medium text-sm ${darkMode ? 'text-neutral-100':'text-gray-800'}`}>{item.topic}</span>
                                            {item.reason && <p className={`text-xs ${darkMode ? 'text-neutral-400':'text-gray-500'}`}>{item.reason}</p>}
                                        </div>
                                        <Badge variant={item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'outline'} className={`text-xs rounded-full ${item.priority === 'Medium' && (darkMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-200') }`}>
                                            {item.priority}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     <Button onClick={() => {setReviewPlan(null); setSuggestedReviewTopics([])}} variant="outline" className={`w-full mt-3 ${darkMode ? 'border-neutral-600 hover:bg-neutral-700':'border-gray-300 hover:bg-gray-100'}`}>
                        <RotateCcw className="h-4 w-4 mr-2"/> Clear Plan & Regenerate
                    </Button>
                </motion.div>
            ) : (
                 <div className="text-center py-6">
                    <Info className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
                    <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>No review plan generated yet. Click below to get started.</p>
                </div>
            )}
            {!reviewPlan && !isLoadingPlan && (
                <Button onClick={handleGenerateReviewPlan} className={`w-full rounded-lg shadow-md ${darkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-600 hover:bg-green-700'}`}>
                    <Sparkles className="h-4 w-4 mr-2"/> Generate Smart Review Plan
                </Button>
            )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className={`text-2xl font-semibold border-b pb-2 mb-4 ${darkMode ? 'text-neutral-100 border-neutral-700' : 'text-gray-800 border-gray-200'}`}>Topic Mastery</h2>
        {!progressQuery && <div className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> <p className="mt-2 text-sm">Loading progress data...</p></div>}
        {progressQuery && progressData.length === 0 && (
            <div className={`text-center py-10 rounded-xl ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <TrendingUp className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium ${darkMode ? 'text-neutral-200' : 'text-gray-700'}`}>No Progress Tracked Yet</h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                    Review flashcards and take quizzes to see your progress here.
                </p>
            </div>
        )}

        {progressQuery && progressData.length > 0 && viewMode === 'list' && (
            <div className="space-y-3">
            {progressData.map((item) => (
              <Card key={item._id?.toString()} className={`p-4 rounded-lg shadow-md group transition-all duration-150 ${darkMode ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex-1">
                        <h4 className={`font-medium ${darkMode ? 'text-neutral-100' : 'text-gray-800'}`}>{item.topic}</h4>
                        <p className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Last reviewed: {formatDate(item.lastReviewed)}</p>
                    </div>
                    <div className="w-full sm:w-auto flex items-center gap-3 mt-2 sm:mt-0">
                        <Progress value={item.confidence} className={`h-2.5 flex-grow ${getProgressBgColor(item.confidence)}`} />
                        <span className={`font-semibold text-sm w-12 text-right ${getConfidenceColor(item.confidence)}`}>{item.confidence}%</span>
                    </div>
                </div>
                 <div className="mt-3 pt-3 border-t flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" className={`rounded-md text-xs ${darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-50'}`} onClick={() => toast.info(`Reviewing ${item.topic}...`)}>
                        <BookOpen className="h-3.5 w-3.5 mr-1.5"/> Review Topic
                    </Button>
                     <Button size="sm" variant="outline" className={`rounded-md text-xs ${darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-50'}`} onClick={() => toast.info(`Quiz for ${item.topic}...`)}>
                        <Zap className="h-3.5 w-3.5 mr-1.5"/> Take Quiz
                    </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        {progressQuery && progressData.length > 0 && viewMode === 'chart' && (
             <div className={`p-6 rounded-xl shadow-lg h-96 flex items-center justify-center text-center ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
                <div>
                    <BarChart className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                    <p className={`font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-600'}`}>Progress Chart View</p>
                    <p className={`text-sm ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>A visual representation of your topic mastery would appear here.</p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-neutral-600' : 'text-gray-400'}`}>(Chart library like Recharts or Chart.js needed for actual implementation)</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}