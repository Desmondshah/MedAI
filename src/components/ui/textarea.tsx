import React, { TextareaHTMLAttributes, forwardRef, useState, useEffect } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "premium" | "flat";
  resizable?: boolean;
  maxLength?: number;
  showCount?: boolean;
  autoExpand?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className,
    variant = "default",
    resizable = false,
    maxLength,
    showCount = false,
    autoExpand = false,
    onChange,
    value,
    ...props 
  }, ref) => {
    const [charCount, setCharCount] = useState(0);
    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      innerRef.current = node;
    };

    // Update character count when value changes
    useEffect(() => {
      if (typeof value === 'string') {
        setCharCount(value.length);
      } else if (innerRef.current) {
        setCharCount(innerRef.current.value.length);
      }
    }, [value]);

    // Handle auto-expand
    const handleAutoExpand = () => {
      if (autoExpand && innerRef.current) {
        // Reset height to calculate the right scrollHeight
        innerRef.current.style.height = 'auto';
        // Set new height based on scrollHeight (+ a little extra for padding)
        innerRef.current.style.height = `${innerRef.current.scrollHeight + 2}px`;
      }
    };

    // Set up auto-expand
    useEffect(() => {
      if (autoExpand && innerRef.current) {
        handleAutoExpand();
      }
    }, [autoExpand, value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
      
      if (autoExpand) {
        handleAutoExpand();
      }
    };

    const variants = {
      default: "border border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
      premium: "border border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-inner",
      flat: "bg-transparent border-none focus:ring-2 focus:ring-blue-100",
    };

    return (
      <div className="relative w-full">
        <textarea
          className={`w-full rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
            focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 
            ${variants[variant]} 
            ${resizable ? "resize" : "resize-none"}
            ${className || ""}`}
          ref={combinedRef}
          onChange={handleChange}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        
        {showCount && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {charCount}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };