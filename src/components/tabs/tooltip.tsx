import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  delay = 300,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate position
  const calculatePosition = () => {
    if (targetRef.current && tooltipRef.current) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let x = 0;
      let y = 0;
      
      switch (position) {
        case 'top':
          x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          y = targetRect.top - tooltipRect.height - 8;
          break;
        case 'bottom':
          x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          y = targetRect.bottom + 8;
          break;
        case 'left':
          x = targetRect.left - tooltipRect.width - 8;
          y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          break;
        case 'right':
          x = targetRect.right + 8;
          y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          break;
      }
      
      // Adjust if tooltip goes out of viewport
      if (x < 10) x = 10;
      if (y < 10) y = 10;
      if (x + tooltipRect.width > window.innerWidth - 10) {
        x = window.innerWidth - tooltipRect.width - 10;
      }
      if (y + tooltipRect.height > window.innerHeight - 10) {
        y = window.innerHeight - tooltipRect.height - 10;
      }
      
      setCoords({ x, y });
    }
  };

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calculate position after setting visible to ensure the tooltip is rendered
      setTimeout(calculatePosition, 0);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Recalculate position on window resize
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition);
      
      return () => {
        window.removeEventListener('resize', calculatePosition);
        window.removeEventListener('scroll', calculatePosition);
      };
    }
  }, [isVisible]);

  return (
    <>
      <div 
        ref={targetRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-800 rounded pointer-events-none transition-opacity duration-200 ${className}`}
          style={{ 
            left: `${coords.x}px`, 
            top: `${coords.y}px`,
            opacity: isVisible ? 1 : 0,
          }}
        >
          {content}
          {/* Tooltip arrow */}
          <div 
            className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 ${
              position === 'top' ? 'bottom-[-4px]' : 
              position === 'bottom' ? 'top-[-4px]' : 
              position === 'left' ? 'right-[-4px]' : 
              'left-[-4px]'
            }`}
            style={{
              left: position === 'top' || position === 'bottom' ? 'calc(50% - 4px)' : undefined,
              top: position === 'left' || position === 'right' ? 'calc(50% - 4px)' : undefined,
            }}
          />
        </div>
      )}
    </>
  );
};

// Simple wrapper to provide a context for tooltips
export const TooltipProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return <>{children}</>;
};

// Simple wrapper for tooltip trigger element
export const TooltipTrigger: React.FC<{children: React.ReactNode, asChild?: boolean}> = ({ 
  children, 
  asChild = false
}) => {
  return <>{children}</>;
};

// Wrapper for tooltip content
export const TooltipContent: React.FC<{
  children: React.ReactNode, 
  side?: 'top' | 'bottom' | 'left' | 'right'
}> = ({ 
  children,
  side = 'top'
}) => {
  return <>{children}</>;
};

export default Tooltip;