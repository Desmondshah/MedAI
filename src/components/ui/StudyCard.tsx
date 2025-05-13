import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, RotateCcw, ThumbsUp, ThumbsDown, BookmarkPlus, MoreHorizontal, Share } from 'lucide-react';
import { Button } from './button';

interface StudyCardProps {
  id: string;
  front: string;
  back: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  onNext?: () => void;
  onPrevious?: () => void;
  onMark?: (confidence: number) => void;
  onBookmark?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export default function StudyCard({
  id,
  front,
  back,
  topic,
  difficulty = 'medium',
  tags = [],
  onNext,
  onPrevious,
  onMark,
  onBookmark,
  hasNext = true,
  hasPrevious = true,
}: StudyCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const handleFlip = () => {
    setFlipped(!flipped);
  };
  
  const handleNext = () => {
    if (!onNext) return;
    
    setIsExiting(true);
    setTimeout(() => {
      onNext();
      setFlipped(false);
      setIsExiting(false);
    }, 300);
  };
  
  const handlePrevious = () => {
    if (!onPrevious) return;
    
    setIsExiting(true);
    setTimeout(() => {
      onPrevious();
      setFlipped(false);
      setIsExiting(false);
    }, 300);
  };
  
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-amber-100 text-amber-800',
    hard: 'bg-red-100 text-red-800',
  };
  
  return (
    <div className="study-card-container w-full max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          {topic && (
            <span className="text-sm font-medium text-gray-900">{topic}</span>
          )}
          {difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[difficulty]}`}>
              {difficulty}
            </span>
          )}
        </div>
        
        <div className="flex space-x-1">
          <Button variant="ghost" size="xs" className="text-gray-500 hover:text-blue-600" onClick={onBookmark}>
            <BookmarkPlus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="xs" className="text-gray-500 hover:text-blue-600">
            <Share className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="xs" className="text-gray-500 hover:text-blue-600">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <motion.div
        className={`relative w-full aspect-[4/3] ${isExiting ? 'opacity-0' : ''} transition-opacity duration-300`}
        initial={false}
      >
        <div 
          className="absolute inset-0 rounded-2xl perspective-1000 cursor-pointer"
          onClick={handleFlip}
        >
          <AnimatePresence initial={false}>
            {!flipped ? (
              <motion.div
                key="front"
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 flex flex-col p-8 transition-shadow duration-300"
                initial={{ rotateY: -180 }}
                animate={{ rotateY: 0 }}
                exit={{ rotateY: 180 }}
                transition={{ duration: 0.5, easings: ["easeIn", "easeOut"] }}
              >
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xl text-center font-medium text-gray-900 max-w-md">{front}</p>
                </div>
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-500">Tap to see answer</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="back"
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg hover:shadow-xl border border-blue-100 flex flex-col p-8 transition-shadow duration-300"
                initial={{ rotateY: 180 }}
                animate={{ rotateY: 0 }}
                exit={{ rotateY: -180 }}
                transition={{ duration: 0.5, easings: ["easeIn", "easeOut"] }}
              >
                <div className="absolute top-2 right-2">
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    className="text-gray-400 hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlip();
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-lg text-center text-blue-900 max-w-md">{back}</p>
                </div>
                
                {onMark && (
                  <div className="flex justify-center space-x-2 mt-6">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white text-red-500 hover:text-red-600 hover:bg-red-50" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onMark(1);
                        handleNext();
                      }}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Didn't know
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white text-amber-500 hover:text-amber-600 hover:bg-amber-50" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onMark(3);
                        handleNext();
                      }}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Partially knew
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white text-green-500 hover:text-green-600 hover:bg-green-50" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onMark(5);
                        handleNext();
                      }}
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      Knew it!
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      <div className="mt-6 flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={!hasPrevious}
          className={!hasPrevious ? 'opacity-0' : 'hover-lift'}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={!hasNext}
          className={!hasNext ? 'opacity-0' : 'hover-lift'}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="tag-premium tag-blue">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .backface-hidden {
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
}
