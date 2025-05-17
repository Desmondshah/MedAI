import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api"; // Adjusted path
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  BookOpen, // For Flashcards
  Book,     // For Quizzes
  Activity, // For Progress
  Brain, Sparkles, CheckCircle2, ListTodo, Target, ChevronDown, ChevronUp,
  Sun, Moon, Loader2, RotateCcw, AlertCircle, Info, TrendingUp, ClipboardCheck,
  Play, Eye, Edit3, Trash2, CalendarCheck2, ListChecks, Target as TargetIcon, Award, Settings2,
  Palette, 
  Calendar as CalendarIcon, 
  Clock as ClockIcon,       
  ArrowLeft, // Added for QuizTab back button
  Save, // Added for FlashcardsTab save button
  Zap,
  ChevronRight,
  Plus,
  X, // Added for FlashcardsTab generate button
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "../../components/ui/card"; 
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Progress } from "../../components/ui/progress";
import StudyCard from "../ui/StudyCard"; 
import { Badge } from "../../components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
// Ensure all types are correctly imported from your central types file
import { Flashcard as FlashcardType, Quiz as QuizType, QuizQuestion } from "../../../convex/types"; 

interface UserAwareProps {
  userId: Id<"users">;
}

interface ProgressItem { 
    _id?: Id<"progress">; 
    userId: Id<"users">;
    topic: string;
    confidence: number;
    lastReviewed: number;
    createdAt?: number;
}

const formatDate = (timestamp: number | Date | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (timestamp === undefined) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
    };
    return new Date(timestamp).toLocaleDateString(undefined, options || defaultOptions);
};

const formatDuration = (minutes: number): string => {
    if (minutes < 1) return "<1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h${remMinutes > 0 ? ` ${remMinutes}m` : ''}`;
};

// --- FlashcardsTab Component ---
interface FlashcardSet {
  id: string;
  title: string;
  cards: FlashcardType[]; 
  source?: string;
  createdAt?: number;
}

export function FlashcardsTab({ userId }: UserAwareProps) {
  const [topic, setTopic] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [generatedFlashcards, setGeneratedFlashcards] = useState<FlashcardType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reviewingSet, setReviewingSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false);

  const generateFlashcardsAction = useAction(api.ai.generateFlashcards);
  const createFlashcardBatchMutation = useMutation(api.flashcards.createBatch);
  const allFlashcardsQuery = useQuery(api.flashcards.getAll, { userId });
  const updateCardConfidence = useMutation(api.flashcards.updateReview);

  const [savedDecks, setSavedDecks] = useState<FlashcardSet[]>([]);

  useEffect(() => {
    if (darkMode && !useNotebookTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode, useNotebookTheme]);

  useEffect(() => {
    if (allFlashcardsQuery) {
      const decksMap = new Map<string, FlashcardType[]>();
      allFlashcardsQuery.forEach(card => {
        const category = card.category || "Uncategorized";
        if (!decksMap.has(category)) decksMap.set(category, []);
        decksMap.get(category)?.push(card);
      });
      const formattedDecks: FlashcardSet[] = Array.from(decksMap.entries()).map(([title, cards]) => ({
        id: title, title, cards, source: "Saved Deck", createdAt: cards[0]?._creationTime
      })).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSavedDecks(formattedDecks);
    }
  }, [allFlashcardsQuery]);

  const handleGenerateFlashcards = async () => {
    if (!topic.trim()) { toast.error("Please enter a topic."); return; }
    setIsLoading(true); setError(null); setGeneratedFlashcards([]);
    try {
      const response = await generateFlashcardsAction({ topic: topic.trim(), content: content.trim() || undefined });
      if (response && response.length > 0) {
        setGeneratedFlashcards(response as FlashcardType[]); 
        toast.success(`${response.length} flashcards generated!`);
      } else {
        setError("No flashcards generated. Try refining your input.");
        toast.info("No flashcards generated.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Generation failed: ${msg}`); toast.error(`Generation failed: ${msg}`);
    } finally { setIsLoading(false); }
  };
  
  const handleSaveGeneratedCards = async () => {
    if (generatedFlashcards.length === 0) return;
    setIsLoading(true);
    try {
        const cardsToSave = generatedFlashcards.map(card => ({
            front: card.front, back: card.back, category: topic.trim() || "Generated Deck"
        }));
        await createFlashcardBatchMutation({ userId, cards: cardsToSave });
        toast.success("Flashcards saved!");
        setGeneratedFlashcards([]); setTopic(""); setContent("");
    } catch (error) { toast.error("Failed to save flashcards."); console.error(error);
    } finally { setIsLoading(false); }
  };

  const startReview = (deck: FlashcardSet) => {
    if (!deck.cards || deck.cards.length === 0) { toast.error("Deck has no cards."); return; }
    setReviewingSet(deck); setCurrentCardIndex(0);
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
    if (currentCardIndex > 0) setCurrentCardIndex(prev => prev - 1);
  };

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
            } catch(err) { toast.error("Failed to update confidence."); }
        }
        handleNextCard(); 
    }
  };

  const rootThemeClass = useNotebookTheme ? 'notebook-theme' : (darkMode ? 'dark' : '');

  if (reviewingSet) {
    const currentCard = reviewingSet.cards[currentCardIndex];
    return (
      <div className={`study-tab-pane-container flashcards-review-area ${rootThemeClass}`}>
         <div className={`
            flex justify-between items-center mb-6 
            ${useNotebookTheme ? 'study-tab-header-bar !border-none !mb-4' : (darkMode ? 'border-b border-neutral-700 pb-4' : 'border-b border-gray-200 pb-4')}
          `}>
            <Button 
              variant="outline" 
              onClick={() => setReviewingSet(null)} 
              className={`${useNotebookTheme 
                ? 'study-action-button !bg-amber-50 !text-amber-700 !border-amber-300' 
                : (darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-50')
              }`}
            >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Decks
            </Button>
            {/* You can add theme toggles here as well if desired for the review screen */}
            <div className={`flex items-center gap-2 ${useNotebookTheme ? 'study-tab-header-controls' : ''}`}>
              <Button variant="outline" size="icon" onClick={() => setUseNotebookTheme(!useNotebookTheme)} className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''} ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`} title="Toggle Notebook Theme"><Palette className="h-5 w-5"/></Button>
              <Button variant="outline" size="icon" onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not for notebook theme.");}} className="notetab-header-button" title="Toggle Dark Mode">{darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
            </div>
         </div>
        <div className={useNotebookTheme ? "study-card-container" : ""}>
            <StudyCard
            id={currentCard._id?.toString() || `temp-${currentCardIndex}`}
            front={currentCard.front}
            back={currentCard.back}
            topic={reviewingSet.title}
            onNext={handleNextCard}
            onPrevious={handlePreviousCard}
            onMark={handleMarkConfidence}
            hasNext={currentCardIndex < reviewingSet.cards.length - 1}
            hasPrevious={currentCardIndex > 0}
            />
        </div>
      </div>
    );
  }

  return (
    <div className={`study-tab-pane-container ${rootThemeClass}`}>
      <div className={`
        flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 pb-4 mb-6
        ${useNotebookTheme 
          ? 'study-tab-header-bar' 
          : (darkMode ? 'border-b border-neutral-700' : 'border-b border-gray-200')
        }
      `}>
        <div className={`flex items-center ${useNotebookTheme ? 'study-tab-title-group' : ''}`}>
          <div className={`
            p-2.5 mr-3 rounded-xl shadow-md
            ${useNotebookTheme 
              ? 'study-tab-title-icon flashcard-tab-icon-bg' 
              : (darkMode ? 'bg-purple-700' : 'bg-purple-600')
            }
          `}>
            <BookOpen className={`h-6 w-6 text-white ${useNotebookTheme ? '' : ''}`} />
          </div>
          <div>
            <h1 className={`
              tracking-tight
              ${useNotebookTheme 
                ? 'study-tab-title' 
                : `text-3xl font-bold ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`
              }
            `}>Flashcards</h1>
            <p className={`
              ${useNotebookTheme 
                ? 'study-tab-description' 
                : `text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`
              }
            `}>Create, review, and master medical concepts.</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 ${useNotebookTheme ? 'study-tab-header-controls' : ''}`}>
            <Button variant="outline" size="icon" onClick={() => setUseNotebookTheme(!useNotebookTheme)} className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''} ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`} title="Toggle Notebook Theme"><Palette className="h-5 w-5"/></Button>
            <Button variant="outline" size="icon" onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not applicable to Notebook theme.");}} className="notetab-header-button" title="Toggle Dark Mode">{darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
        </div>
      </div>

      <Card className={`study-card-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800' : 'bg-white')}`}>
        <CardHeader className={`study-card-header-notebook`}>
          <div className="flex items-center gap-3">
            <Sparkles className={`h-5 w-5 ${useNotebookTheme ? 'text-purple-500' : (darkMode ? 'text-purple-400' : 'text-purple-600')}`} />
            <CardTitle className={`card-title-text`}>Generate New Flashcards</CardTitle>
          </div>
          <CardDescription className={`card-description-text`}>Enter topic or paste content for AI-generated flashcards.</CardDescription>
        </CardHeader>
        <CardContent className="study-card-content-notebook space-y-4">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g., Cardiac Cycle)" className={`study-input-notebook`}/>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Optional: Paste content here..." className={`study-input-notebook min-h-[100px]`}/>
          {error && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle className="h-4 w-4"/>{error}</p>}
          <div className="flex justify-end">
            <Button onClick={handleGenerateFlashcards} disabled={isLoading || !topic.trim()} className={`study-action-button primary`}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Zap className="h-4 w-4 mr-2" />}
              Generate with AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedFlashcards.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
                <h2 className={`text-xl font-semibold ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>Generated Cards for "{topic}"</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => startReview({id: 'generated', title: `Review: ${topic}`, cards: generatedFlashcards, source: 'Generated'})} className={`study-action-button`}>
                        <Play className="h-4 w-4 mr-2"/> Review These
                    </Button>
                    <Button onClick={handleSaveGeneratedCards} className={`study-action-button primary`}>
                        <Save className="h-4 w-4 mr-2"/> Save to My Decks
                    </Button>
                </div>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedFlashcards.slice(0, 6).map((card, index) => (
              <Card key={`gen-${index}`} className={`p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow flashcard-deck-card ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-700' : 'bg-white')}`} onClick={() => startReview({id: 'generated', title: `Preview: ${topic}`, cards: [card], source: 'Generated'})}>
                <p className={`font-medium text-sm line-clamp-2 mb-1 ${useNotebookTheme ? 'text-amber-900' : (darkMode ? 'text-neutral-200' : 'text-gray-700')}`}>{card.front}</p>
                <p className={`text-xs line-clamp-3 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>{card.back}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      <div className="space-y-4 mt-8">
        <h2 className={`text-2xl font-semibold border-b pb-2 mb-4 ${useNotebookTheme ? 'text-amber-800 border-amber-200' : (darkMode ? 'text-neutral-100 border-neutral-700' : 'text-gray-800 border-gray-200')}`}>Your Flashcard Decks</h2>
        {savedDecks.length === 0 && !isLoading && (
             <div className={`text-center py-10 rounded-xl border ${useNotebookTheme ? 'bg-yellow-50 border-yellow-200' : (darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 shadow-sm')}`}>
                <BookOpen className={`h-12 w-12 mx-auto mb-3 ${useNotebookTheme ? 'text-yellow-600' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} />
                <h3 className={`text-lg font-medium ${useNotebookTheme ? 'text-yellow-800' : (darkMode ? 'text-neutral-200' : 'text-gray-700')}`}>No Saved Decks Yet</h3>
            </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedDecks.map((deck) => (
            <motion.div
                key={deck.id}
                initial={{ opacity: 0, y:20 }} animate={{ opacity: 1, y:0 }} transition={{delay: 0.1 * savedDecks.indexOf(deck)}}
                className={`rounded-xl shadow-lg overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flashcard-deck-card 
                            ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800 border-neutral-700 hover:border-purple-600' : 'bg-white border-gray-200 hover:border-purple-400')}`}
                onClick={() => startReview(deck)}
            >
              <div className={`p-5 border-b ${useNotebookTheme ? 'border-amber-300' : (darkMode ? 'border-neutral-700' : 'border-gray-100')}`}>
                <div className="flex justify-between items-start">
                    <h3 className={`text-md font-semibold line-clamp-2 deck-title ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>{deck.title}</h3>
                    <Badge variant="outline" className={`text-xs rounded-full px-2 py-0.5 deck-count-badge ${useNotebookTheme ? '' : (darkMode ? 'border-neutral-600 bg-neutral-700 text-neutral-300' : 'border-gray-300 bg-gray-50 text-gray-600')}`}>{deck.cards.length} cards</Badge>
                </div>
                <p className={`text-xs mt-1 ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>Last reviewed: {deck.cards.find(c => c.lastReviewed)?.lastReviewed ? formatDate(deck.cards.find(c => c.lastReviewed)?.lastReviewed) : 'Never'}</p>
              </div>
              <div className="p-5">
                <Button variant="default" className={`w-full rounded-lg shadow-md group-hover:opacity-90 transition-opacity study-action-button primary ${useNotebookTheme ? '' : (darkMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-600 hover:bg-purple-700')}`}>
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

// --- QuizzesTab Component ---
export function QuizzesTab({ userId }: UserAwareProps) {
  const [topic, setTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizType | null>(null);
  const [quizInProgress, setQuizInProgress] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [isQuizComplete, setIsQuizComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false);

  const generateQuizActionConvex = useAction(api.ai.generateQuizQuestions);
  const createQuizMutation = useMutation(api.quizzes.create);
  const updateQuizScoreMutation = useMutation(api.quizzes.updateScore);
  const pastQuizzesQuery = useQuery(api.quizzes.getAll, { userId });
  
  const [pastQuizzes, setPastQuizzes] = useState<QuizType[]>([]);

  useEffect(() => {
    if (darkMode && !useNotebookTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode, useNotebookTheme]);

  useEffect(() => {
    if (pastQuizzesQuery) {
        // Ensure correct mapping if types differ slightly, as done in the fix for the error
        const mappedQuizzes: QuizType[] = pastQuizzesQuery
            .map(dbQuiz => ({
                _id: dbQuiz._id,
                userId: dbQuiz.userId,
                title: dbQuiz.title,
                questions: dbQuiz.questions.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation ?? "", 
                })),
                score: dbQuiz.score,
                takenAt: dbQuiz.takenAt,
                difficulty: dbQuiz.difficulty,
            }))
            .sort((a,b) => (b.takenAt || (b as any)._creationTime || 0) - (a.takenAt || (a as any)._creationTime || 0));
        setPastQuizzes(mappedQuizzes);
    }
  }, [pastQuizzesQuery]);


  const handleGenerateQuiz = async () => {
    if (!topic.trim()) { toast.error("Please enter a quiz topic."); return; }
    setIsGeneratingQuiz(true); setError(null); setCurrentQuiz(null); setIsQuizComplete(false);
    try {
      const quizData = await generateQuizActionConvex({ topic: topic.trim(), difficulty, questionCount });
       if (quizData && quizData.questions && quizData.questions.length > 0) {
        const transformedQuestions: QuizQuestion[] = quizData.questions.map(qFromAI => ({
          question: qFromAI.question, options: qFromAI.options, correctAnswer: qFromAI.correctAnswerIndex, explanation: qFromAI.explanation,
        }));
        const quizToSave = {
            title: quizData.title || `Quiz: ${topic.trim()}`, questions: transformedQuestions, difficulty: quizData.difficulty || difficulty
        };
        const quizId = await createQuizMutation({ userId, title: quizToSave.title, questions: quizToSave.questions, difficulty: quizToSave.difficulty });
        setCurrentQuiz({...quizToSave, _id: quizId, userId: userId, score: undefined, takenAt: undefined });
        toast.success(`Quiz "${quizToSave.title}" generated!`);
      } else {
        setError("Could not generate quiz. AI did not return valid questions.");
        toast.info("Quiz generation failed or returned no questions.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Quiz generation failed: ${msg}`); toast.error(`Generation failed: ${msg}`);
    } finally { setIsGeneratingQuiz(false); }
  };

  const startQuiz = (quizToStart?: QuizType) => {
    const activeQuiz = quizToStart || currentQuiz;
    if (!activeQuiz || !activeQuiz.questions || activeQuiz.questions.length === 0) { toast.error("No quiz or questions available."); return; }
    setCurrentQuiz(activeQuiz); setQuizInProgress(true); setCurrentQuestionIndex(0);
    setUserAnswers(new Array(activeQuiz.questions.length).fill(null));
    setQuizScore(0); setIsQuizComplete(false);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (!currentQuiz) return;
    if (userAnswers[currentQuestionIndex] === null) { toast.error("Please select an answer."); return; }
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      let score = 0;
      currentQuiz.questions.forEach((q, index) => { if (userAnswers[index] === q.correctAnswer) score++; });
      setQuizScore(score); setIsQuizComplete(true); setQuizInProgress(false);
      if(currentQuiz._id) updateQuizScoreMutation({ id: currentQuiz._id, score });
      toast.success("Quiz completed! Results are shown below.");
    }
  };

  const resetQuizGenerator = () => {
    setCurrentQuiz(null); setTopic(""); setDifficulty("medium"); setQuestionCount(5);
    setIsQuizComplete(false); setError(null);
  };
  
  const rootThemeClass = useNotebookTheme ? 'notebook-theme' : (darkMode ? 'dark' : '');

  if (quizInProgress && currentQuiz) {
    const question = currentQuiz.questions[currentQuestionIndex];
    return (
        <div className={`study-tab-pane-container ${rootThemeClass}`}>
            <div className={`
              flex justify-between items-center mb-6 
              ${useNotebookTheme ? 'study-tab-header-bar !border-none !mb-4' : (darkMode ? 'border-b border-neutral-700 pb-4' : 'border-b border-gray-200 pb-4')}
            `}>
                 <Button 
                    variant="outline" 
                    onClick={() => {setQuizInProgress(false);}} 
                    className={`${useNotebookTheme 
                      ? 'study-action-button !bg-amber-50 !text-amber-700 !border-amber-300' 
                      : (darkMode ? 'border-neutral-600 hover:bg-neutral-700' : 'border-gray-300 hover:bg-gray-50')
                    }`}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quiz Setup
                </Button>
                <div className={`flex items-center gap-2 ${useNotebookTheme ? 'study-tab-header-controls' : ''}`}>
                    <Button variant="outline" size="icon" onClick={() => setUseNotebookTheme(!useNotebookTheme)} className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''}`} title="Toggle Notebook Theme"><Palette className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon" onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not for notebook theme.");}} className="notetab-header-button" title="Toggle Dark Mode">{darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
                </div>
            </div>
            <Card className={`study-card-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800' : 'bg-white')}`}>
                <CardHeader className={`study-card-header-notebook`}>
                    <div className="flex justify-between items-center">
                        <CardTitle className={`card-title-text`}>{currentQuiz.title}</CardTitle>
                        <Badge variant="outline" className={`${useNotebookTheme ? 'note-tag-badge !bg-blue-100 !text-blue-700 !border-blue-300' : (darkMode ? 'border-neutral-600 bg-neutral-700' : 'border-gray-300 bg-gray-50')}`}>
                            Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="study-card-content-notebook space-y-6">
                    <Progress value={((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100} className={`mb-4 h-2 ${useNotebookTheme ? 'progress-bar-notebook' : ''}`} />
                    <p className={`text-lg font-medium ${useNotebookTheme ? 'text-gray-700' : (darkMode ? 'text-neutral-200' : 'text-gray-700')}`}>{question.question}</p>
                    <div className="space-y-3">
                        {question.options.map((option, index) => (
                        <Button
                            key={index}
                            variant={userAnswers[currentQuestionIndex] === index ? "default" : "outline"}
                            className={`w-full justify-start text-left h-auto py-3 px-4 rounded-lg transition-all duration-150 quiz-option-button ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}
                                        ${useNotebookTheme ? '' : (userAnswers[currentQuestionIndex] === index 
                                            ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                                            : (darkMode ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-300' : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'))
                                        }`}
                            onClick={() => handleAnswerSelect(index)}
                        >
                            <span className={`mr-3 h-5 w-5 rounded-full border-2 flex items-center justify-center ${userAnswers[currentQuestionIndex] === index ? (useNotebookTheme ? 'border-purple-400 bg-purple-500' : (darkMode ? 'border-blue-400 bg-blue-500' : 'border-blue-300 bg-blue-600')) : (useNotebookTheme ? 'border-gray-400' : (darkMode ? 'border-neutral-500' : 'border-gray-400'))}`}>
                                {userAnswers[currentQuestionIndex] === index && <CheckCircle2 className="h-3 w-3 text-white"/>}
                            </span>
                            {option}
                        </Button>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className={`study-card-footer-notebook`}>
                    <Button onClick={handleNextQuestion} disabled={userAnswers[currentQuestionIndex] === null} className="w-full rounded-lg shadow-md study-action-button primary">
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
        <div className={`study-tab-pane-container ${rootThemeClass}`}>
             <div className={`flex justify-end items-center mb-6 ${useNotebookTheme ? 'study-tab-header-bar !border-none !mb-4' : ''}`}>
                <div className={`flex items-center gap-2 ${useNotebookTheme ? 'study-tab-header-controls' : ''}`}>
                    <Button variant="outline" size="icon" onClick={() => setUseNotebookTheme(!useNotebookTheme)} className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''}`} title="Toggle Notebook Theme"><Palette className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon" onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not for notebook theme.");}} className="notetab-header-button" title="Toggle Dark Mode">{darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
                </div>
             </div>
            <Card className={`study-card-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800' : 'bg-white')}`}>
                <CardHeader className={`study-card-header-notebook text-center`}>
                    <CheckCircle2 className={`h-16 w-16 mx-auto mb-3 ${quizScore / currentQuiz.questions.length >= 0.7 ? (useNotebookTheme ? 'text-green-600' : 'text-green-500') : (useNotebookTheme ? 'text-orange-500' : 'text-orange-500')}`} />
                    <CardTitle className={`card-title-text text-2xl`}>Quiz Completed!</CardTitle>
                    <CardDescription className={`card-description-text text-lg`}>You scored {quizScore} out of {currentQuiz.questions.length}</CardDescription>
                    <Progress value={(quizScore / currentQuiz.questions.length) * 100} className={`mt-4 h-3 ${quizScore / currentQuiz.questions.length >= 0.7 ? (useNotebookTheme ? 'progress-bar-notebook [&>*]:!bg-green-500' : 'bg-green-200 dark:bg-green-700 progress-bar-green') : (useNotebookTheme ? 'progress-bar-notebook [&>*]:!bg-orange-500' : 'bg-orange-200 dark:bg-orange-700 progress-bar-orange')}`} />
                </CardHeader>
                <CardContent className="study-card-content-notebook space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    <h3 className={`text-lg font-semibold ${useNotebookTheme ? 'text-gray-700' : (darkMode ? 'text-neutral-200' : 'text-gray-700')}`}>Review Your Answers:</h3>
                    {currentQuiz.questions.map((q, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${userAnswers[index] === q.correctAnswer ? 'quiz-result-correct' : 'quiz-result-incorrect'}`}>
                            <p className={`font-medium mb-1 ${useNotebookTheme ? 'text-gray-800' : (darkMode ? 'text-neutral-200' : 'text-gray-800')}`}>{index + 1}. {q.question}</p>
                            <p className={`text-sm ${userAnswers[index] === q.correctAnswer ? (useNotebookTheme ? 'text-green-700':'text-green-600') : (useNotebookTheme ? 'text-red-700':'text-red-600')}`}>
                                Your answer: {q.options[userAnswers[index]!] || "Not answered"} {userAnswers[index] === q.correctAnswer ? <CheckCircle2 className="inline h-4 w-4 ml-1"/> : <X className="inline h-4 w-4 ml-1"/>}
                            </p>
                            {userAnswers[index] !== q.correctAnswer && <p className={`text-sm ${useNotebookTheme ? 'text-gray-600':'text-gray-600'}`}>Correct answer: {q.options[q.correctAnswer]}</p>}
                            {q.explanation && <p className={`text-xs mt-1 p-2 rounded ${useNotebookTheme ? 'bg-yellow-50 text-yellow-800':'bg-gray-100 text-gray-500'}`}>Explanation: {q.explanation}</p>}
                        </div>
                    ))}
                </CardContent>
                 <CardFooter className={`study-card-footer-notebook flex-col sm:flex-row justify-between gap-2`}>
                    <Button variant="outline" onClick={() => startQuiz()} className="w-full sm:w-auto rounded-lg study-action-button">
                        <RotateCcw className="h-4 w-4 mr-2"/> Retry Quiz
                    </Button>
                    <Button onClick={resetQuizGenerator} className="w-full sm:w-auto rounded-lg study-action-button primary">
                        <Plus className="h-4 w-4 mr-2"/> Create New Quiz
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className={`study-tab-pane-container ${rootThemeClass}`}>
      <div className={`
        flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 pb-4 mb-6
        ${useNotebookTheme 
          ? 'study-tab-header-bar' 
          : (darkMode ? 'border-b border-neutral-700' : 'border-b border-gray-200')
        }
      `}>
        <div className={`flex items-center ${useNotebookTheme ? 'study-tab-title-group' : ''}`}>
          <div className={`
            p-2.5 mr-3 rounded-xl shadow-md
            ${useNotebookTheme 
              ? 'study-tab-title-icon quiz-tab-icon-bg' 
              : (darkMode ? 'bg-teal-700' : 'bg-teal-600')
            }
          `}>
            <Book className={`h-6 w-6 text-white ${useNotebookTheme ? '' : ''}`} />
          </div>
          <div>
            <h1 className={`
              tracking-tight
              ${useNotebookTheme 
                ? 'study-tab-title' 
                : `text-3xl font-bold ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`
              }
            `}>Practice Quizzes</h1>
            <p className={`
              ${useNotebookTheme 
                ? 'study-tab-description' 
                : `text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`
              }
            `}>Test your knowledge with AI-generated quizzes.</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 ${useNotebookTheme ? 'study-tab-header-controls' : ''}`}>
            <Button variant="outline" size="icon" onClick={() => setUseNotebookTheme(!useNotebookTheme)} className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''} ${darkMode && !useNotebookTheme ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-gray-200 hover:bg-gray-100'}`} title="Toggle Notebook Theme"><Palette className="h-5 w-5"/></Button>
            <Button variant="outline" size="icon" onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not for notebook theme.");}} className="notetab-header-button" title="Toggle Dark Mode">{darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
        </div>
      </div>

      <Card className={`study-card-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800' : 'bg-white')}`}>
        <CardHeader className={`study-card-header-notebook`}>
            <div className="flex items-center gap-3">
                <Sparkles className={`h-5 w-5 ${useNotebookTheme ? 'text-green-500' : (darkMode ? 'text-teal-400' : 'text-teal-600')}`} />
                <CardTitle className={`card-title-text`}>Generate a New Quiz</CardTitle>
            </div>
            <CardDescription className={`card-description-text`}>Customize your quiz by topic, difficulty, and number of questions.</CardDescription>
        </CardHeader>
        <CardContent className="study-card-content-notebook space-y-5">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Quiz Topic (e.g., Endocrine System)" className={`study-input-notebook`}/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="quizDifficulty" className={`block text-sm font-medium mb-1 ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-300' : 'text-gray-700')}`}>Difficulty</label>
                <select id="quizDifficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`w-full study-select-notebook`}>
                    <option value="easy">Easy</option> <option value="medium">Medium</option> <option value="hard">Hard</option>
                </select>
            </div>
            <div>
                <label htmlFor="questionCount" className={`block text-sm font-medium mb-1 ${useNotebookTheme ? 'text-amber-800' : (darkMode ? 'text-neutral-300' : 'text-gray-700')}`}>Number of Questions</label>
                 <select id="questionCount" value={questionCount.toString()} onChange={(e) => setQuestionCount(parseInt(e.target.value))} className={`w-full study-select-notebook`}>
                    <option value="3">3</option> <option value="5">5</option> <option value="10">10</option> <option value="15">15</option>
                </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle className="h-4 w-4"/>{error}</p>}
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            {currentQuiz && !isGeneratingQuiz && !quizInProgress && (
                 <Button variant="outline" onClick={() => startQuiz()} className={`study-action-button w-full sm:w-auto`}>
                    <Play className="h-4 w-4 mr-2"/> Start Generated Quiz
                </Button>
            )}
            <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || !topic.trim()} className={`study-action-button primary w-full sm:w-auto`}>
              {isGeneratingQuiz ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Sparkles className="h-4 w-4 mr-2" />}
              {currentQuiz ? "Regenerate Quiz" : "Generate Quiz"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {pastQuizzes.length > 0 && (
            <div className="space-y-4 mt-8">
                <h2 className={`text-2xl font-semibold border-b pb-2 mb-4 ${useNotebookTheme ? 'text-amber-800 border-amber-200' : (darkMode ? 'text-neutral-100 border-neutral-700' : 'text-gray-800 border-gray-200')}`}>Past Quizzes</h2>
                <div className="space-y-3">
                    {pastQuizzes.map(quiz => (
                        <Card key={quiz._id?.toString()} className={`p-4 rounded-lg shadow-md flex justify-between items-center group study-card-notebook !bg-opacity-70 ${useNotebookTheme ? '!border-amber-300' : (darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700/70' : 'bg-white border-gray-200 hover:bg-gray-50')}`}>
                            <div>
                                <h3 className={`font-medium ${useNotebookTheme ? 'text-amber-900' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>{quiz.title}</h3>
                                <p className={`text-xs ${useNotebookTheme ? 'text-amber-700' : (darkMode ? 'text-neutral-400' : 'text-gray-500')}`}>
                                    Taken: {quiz.takenAt ? formatDate(quiz.takenAt) : 'N/A'} | Score: {quiz.score !== undefined ? `${quiz.score}/${quiz.questions.length}` : 'N/A'}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => startQuiz(quiz)} className={`study-action-button opacity-0 group-hover:opacity-100 transition-opacity`}>
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

// --- ProgressTab Component ---
export function ProgressTab({ userId }: UserAwareProps) {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [useNotebookTheme, setUseNotebookTheme] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(false);
  const [reviewPlan, setReviewPlan] = useState<string | null>(null);
  const [suggestedReviewTopics, setSuggestedReviewTopics] = useState<{topic: string, priority: string, reason?: string}[]>([]);
  
  const progressQuery = useQuery(api.progress.getAll, { userId });
  const suggestReviewAction = useAction(api.ai.suggestReviewContent);

  useEffect(() => {
    if (darkMode && !useNotebookTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode, useNotebookTheme]);

  const progressData: ProgressItem[] = progressQuery ? [...progressQuery].sort((a,b) => (b.lastReviewed || 0) - (a.lastReviewed || 0)) : [];

  const handleGenerateReviewPlan = async () => {
    setIsLoadingPlan(true); setReviewPlan(null); setSuggestedReviewTopics([]);
    try {
        if(progressData.length === 0) {
            toast.error("No progress data to generate a plan.");
            setIsLoadingPlan(false);
            return;
        }
        const plan = await suggestReviewAction({ progressData });
        if (plan && plan.reviewPlan) {
            setReviewPlan(plan.reviewPlan);
            setSuggestedReviewTopics(plan.suggestedTopics || []);
            toast.success("Smart Review Plan generated!");
        } else {
            toast.error("Could not generate a review plan.");
        }
    } catch (error) {
        toast.error("Failed to generate review plan."); console.error(error);
    } finally { setIsLoadingPlan(false); }
  };

  const getConfidenceColor = (confidence: number) => {
    if (useNotebookTheme) { 
        if (confidence >= 75) return 'text-green-700';
        if (confidence >= 50) return 'text-orange-600';
        return 'text-red-700';
    }
    if (confidence >= 75) return darkMode ? 'text-green-400' : 'text-green-600';
    if (confidence >= 50) return darkMode ? 'text-yellow-400' : 'text-yellow-500';
    return darkMode ? 'text-red-400' : 'text-red-500';
  };
   const getCardBgByConfidence = (confidence: number) => { 
    if (useNotebookTheme) {
        if (confidence >= 75) return 'bg-green-50 border-green-200';
        if (confidence >= 50) return 'bg-orange-50 border-orange-200';
        return 'bg-red-50 border-red-200';
    }
    return darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200';
  };

  const rootThemeClass = useNotebookTheme ? 'notebook-theme' : (darkMode ? 'dark' : '');

  return (
    <div className={`study-tab-pane-container ${rootThemeClass}`}>
        <div className={`
            flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 pb-4 mb-6
            ${useNotebookTheme 
              ? 'study-tab-header-bar' 
              : (darkMode ? 'border-b border-neutral-700' : 'border-b border-gray-200')
            }
          `}>
            <div className={`flex items-center ${useNotebookTheme ? 'study-tab-title-group' : ''}`}>
              <div className={`
                p-2.5 mr-3 rounded-xl shadow-md
                ${useNotebookTheme 
                  ? 'study-tab-title-icon progress-tab-icon-bg' 
                  : (darkMode ? 'bg-sky-700' : 'bg-sky-600') // Adjusted for ProgressTab
                }
              `}>
                <Activity className={`h-6 w-6 text-white ${useNotebookTheme ? '' : ''}`} />
              </div>
              <div>
                <h1 className={`
                  tracking-tight
                  ${useNotebookTheme 
                    ? 'study-tab-title' 
                    : `text-3xl font-bold ${darkMode ? 'text-neutral-100' : 'text-gray-900'}`
                  }
                `}>Learning Progress</h1>
                <p className={`
                  ${useNotebookTheme 
                    ? 'study-tab-description' 
                    : `text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`
                  }
                `}>Track your mastery across medical topics.</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 ${useNotebookTheme ? 'study-tab-header-controls' : ''}`}>
                <div className={`p-0.5 rounded-lg flex border ${useNotebookTheme ? 'bg-amber-50 border-amber-200' : (darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-200 border-gray-300')}`}>
                    <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-md h-8 w-8 ${viewMode === 'list' && (useNotebookTheme ? 'bg-amber-500 text-white' : (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')) }`} title="List View"><ListChecks className="h-4 w-4"/></Button>
                    <Button variant={viewMode === 'chart' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('chart')} className={`rounded-md h-8 w-8 ${viewMode === 'chart' && (useNotebookTheme ? 'bg-amber-500 text-white' : (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')) }`} title="Chart View"><TrendingUp className="h-4 w-4"/></Button>
                </div>
                <Button variant="outline" size="icon" onClick={() => setUseNotebookTheme(!useNotebookTheme)} className={`notetab-header-button ${useNotebookTheme ? 'active-theme-button' : ''}`} title="Toggle Notebook Theme"><Palette className="h-5 w-5"/></Button>
                <Button variant="outline" size="icon" onClick={() => {if (!useNotebookTheme) setDarkMode(!darkMode); else toast.info("Dark mode not for notebook theme.");}} className="notetab-header-button" title="Toggle Dark Mode">{darkMode && !useNotebookTheme ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}</Button>
            </div>
        </div>

      <Card className={`study-card-notebook ${useNotebookTheme ? '' : (darkMode ? 'bg-neutral-800' : 'bg-white')}`}>
        <CardHeader className={`study-card-header-notebook`}>
            <div className="flex items-center gap-3">
                <Sparkles className={`h-5 w-5 ${useNotebookTheme ? 'text-blue-500' : (darkMode ? 'text-green-400' : 'text-green-600')}`} />
                <CardTitle className={`card-title-text`}>Smart Review Suggestions</CardTitle>
            </div>
             <CardDescription className={`card-description-text`}>Let AI analyze your progress for a focused review plan.</CardDescription>
        </CardHeader>
        <CardContent className="study-card-content-notebook space-y-4">
            {isLoadingPlan ? ( <div className="flex items-center justify-center p-6"> <Loader2 className="h-6 w-6 animate-spin mr-3"/> Generating plan... </div>
            ) : reviewPlan ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
                    <div className={`p-4 rounded-lg ${useNotebookTheme ? 'bg-blue-50 border-blue-200' : (darkMode ? 'bg-neutral-700/50' : 'bg-green-50')}`}>
                        <h4 className={`font-semibold mb-1 ${useNotebookTheme ? 'text-blue-700' : (darkMode ? 'text-green-300' : 'text-green-700')}`}>AI Review Plan:</h4>
                        <p className={`text-sm ${useNotebookTheme ? 'text-blue-800' : (darkMode ? 'text-neutral-300' : 'text-gray-700')}`}>{reviewPlan}</p>
                    </div>
                    {suggestedReviewTopics.length > 0 && (
  <div>
    <h4 className={`
      font-medium mb-2 
      ${useNotebookTheme 
        ? 'text-blue-700' // Notebook theme specific color for this heading
        : (darkMode ? 'text-neutral-200' : 'text-gray-700')
      }
    `}>Key Topics to Review:</h4>
    <div className="space-y-2">
      {suggestedReviewTopics.map((item, index) => (
        <div 
          key={index} 
          className={`
            p-3 rounded-md border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1
            ${useNotebookTheme 
              ? `bg-white border-blue-200 ${item.priority === 'High' ? 'border-l-red-400' : item.priority === 'Medium' ? 'border-l-yellow-400' : 'border-l-green-400'} border-l-4` 
              : (darkMode 
                  ? `bg-neutral-700 border-neutral-600 ${item.priority === 'High' ? 'border-l-red-500' : item.priority === 'Medium' ? 'border-l-yellow-500' : 'border-l-green-500'} border-l-4` 
                  : `bg-white border-gray-200 ${item.priority === 'High' ? 'border-l-red-400' : item.priority === 'Medium' ? 'border-l-yellow-400' : 'border-l-green-400'} border-l-4 shadow-sm`)
            }
          `}
        >
          <div>
            <span className={`
              font-medium text-sm 
              ${useNotebookTheme 
                ? 'text-blue-800' 
                : (darkMode ? 'text-neutral-100':'text-gray-800')
              }
            `}>{item.topic}</span>
            {item.reason && 
              <p className={`
                text-xs 
                ${useNotebookTheme 
                  ? 'text-blue-600' 
                  : (darkMode ? 'text-neutral-400':'text-gray-500')
                }
              `}>{item.reason}</p>
            }
          </div>
          <Badge 
            variant={
              useNotebookTheme 
                ? (item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'outline')
                : (item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'outline')
            } 
            className={`
              text-xs rounded-full mt-1 sm:mt-0
              ${useNotebookTheme && item.priority === 'High' ? '!bg-red-100 !text-red-700 !border-red-300' : ''}
              ${useNotebookTheme && item.priority === 'Medium' ? '!bg-yellow-100 !text-yellow-700 !border-yellow-300' : ''}
              ${useNotebookTheme && item.priority === 'Low' ? '!bg-green-100 !text-green-700 !border-green-300' : ''}
            `}
          >
            {item.priority}
          </Badge>
        </div>
      ))}
    </div>
  </div>
)}
                    <Button onClick={() => {setReviewPlan(null); setSuggestedReviewTopics([])}} variant="outline" className={`w-full mt-3 study-action-button ${useNotebookTheme ? '!bg-transparent !border-amber-500 !text-amber-700 hover:!bg-amber-50' : ''}`}>
                        <RotateCcw className="h-4 w-4 mr-2"/> Clear Plan & Regenerate
                    </Button>
                </motion.div>
            ) : ( <div className={`text-center py-6 ${useNotebookTheme ? 'text-amber-700' : ''}`}> <Info className={`h-8 w-8 mx-auto mb-2 ${useNotebookTheme ? 'text-amber-500' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} /> <p>No plan generated.</p> </div> )}
            {!reviewPlan && !isLoadingPlan && ( <Button onClick={handleGenerateReviewPlan} className={`w-full study-action-button primary`}> <Sparkles className="h-4 w-4 mr-2"/> Generate Review Plan </Button> )}
        </CardContent>
      </Card>

      <div className="space-y-4 mt-8">
        <h2 className={`text-2xl font-semibold border-b pb-2 mb-4 ${useNotebookTheme ? 'text-amber-800 border-amber-200' : (darkMode ? 'text-neutral-100 border-neutral-700' : 'text-gray-800 border-gray-200')}`}>Topic Mastery</h2>
        {!progressQuery && <div className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> <p className="mt-2 text-sm">Loading...</p></div>}
        {progressQuery && progressData.length === 0 && (
  <div className={`
    text-center py-10 rounded-xl 
    ${useNotebookTheme 
      ? 'bg-yellow-50 border-2 border-dashed border-yellow-200 text-amber-700' 
      : (darkMode ? 'bg-neutral-800 border border-neutral-700 text-neutral-400' : 'bg-white border border-gray-200 shadow-sm text-gray-500')
    }
  `}>
    <TrendingUp className={`h-12 w-12 mx-auto mb-3 ${useNotebookTheme ? 'text-yellow-600' : (darkMode ? 'text-neutral-500' : 'text-gray-400')}`} />
    <h3 className={`
      text-lg font-medium 
      ${useNotebookTheme 
        ? 'text-yellow-800' 
        : (darkMode ? 'text-neutral-200' : 'text-gray-700')
      }
    `}>No Progress Tracked Yet</h3>
    <p className={`mt-1 text-sm`}>
      Review flashcards and take quizzes to see your learning progress here.
    </p>
  </div>
)}
        {progressQuery && progressData.length > 0 && viewMode === 'list' && (
            <div className="space-y-3">
            {progressData.map((item) => (
              <Card key={item._id?.toString()} className={`p-4 rounded-lg shadow-md group transition-all duration-150 progress-item-card 
                                                            ${useNotebookTheme ? getCardBgByConfidence(item.confidence) : (darkMode ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg')}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex-1">
                        <h4 className={`font-medium progress-topic-title ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-100' : 'text-gray-800')}`}>{item.topic}</h4>
                        <p className={`text-xs ${useNotebookTheme ? 'text-opacity-80' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>Last reviewed: {formatDate(item.lastReviewed)}</p>
                    </div>
                    <div className="w-full sm:w-auto flex items-center gap-3 mt-2 sm:mt-0">
                        <Progress value={item.confidence} className={`h-2.5 flex-grow ${useNotebookTheme ? 'progress-bar-notebook' : ''}`} />
                        <span className={`font-semibold text-sm w-12 text-right ${getConfidenceColor(item.confidence)}`}>{item.confidence}%</span>
                    </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {progressQuery && progressData.length > 0 && viewMode === 'chart' && (
  <div className={`
    p-6 rounded-xl shadow-lg h-96 flex items-center justify-center text-center 
    ${useNotebookTheme 
      ? 'bg-yellow-50 border-2 border-dashed border-yellow-200 text-amber-700' 
      : (darkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-white border-gray-200 text-gray-600')
    }
  `}>
    <div>
      <TrendingUp /* Changed from BarChart for consistency with other empty state */ className={`h-16 w-16 mx-auto mb-4 ${useNotebookTheme ? 'text-yellow-500' : (darkMode ? 'text-sky-400' : 'text-sky-500')}`} />
      <p className={`font-medium ${useNotebookTheme ? 'text-lg' : ''}`}>
        Progress Chart View
      </p>
      <p className={`text-sm ${useNotebookTheme ? '' : (darkMode ? 'text-neutral-500' : 'text-gray-500')}`}>
        A visual representation of your topic mastery will appear here in a future update!
      </p>
      <p className={`text-xs mt-1 ${useNotebookTheme ? 'text-amber-600' : (darkMode ? 'text-neutral-600' : 'text-gray-400')}`}>
        (Requires a chart library like Recharts or Chart.js for implementation)
      </p>
    </div>
  </div>
)}
      </div>
    </div>
  );
}