import React, { HTMLAttributes, forwardRef } from "react";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "success" | "warning" | "error" | "info";
  showValue?: boolean;
  animate?: boolean;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    size = "default", 
    variant = "default",
    showValue = false,
    animate = true,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizeStyles = {
      sm: "h-1.5",
      default: "h-2.5",
      lg: "h-4",
    };
    
    const variantStyles = {
      default: "bg-blue-600",
      success: "bg-green-500",
      warning: "bg-amber-500",
      error: "bg-red-500",
      info: "bg-indigo-500",
    };
    
    return (
      <div className="relative w-full">
        <div
          ref={ref}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          className={`w-full overflow-hidden rounded-full bg-gray-100 ${sizeStyles[size]} ${className || ""}`}
          {...props}
        >
          <div
            className={`h-full rounded-full ${variantStyles[variant]} transition-all duration-500 ease-out ${animate ? 'animate-pulse-subtle' : ''}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <span className="absolute right-0 -top-6 text-xs font-medium text-gray-600">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };