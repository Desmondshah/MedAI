import React, { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "premium" | "premium-outline";
  size?: "default" | "sm" | "lg" | "icon" | "xs";
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, isLoading = false, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow",
      premium: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md shadow-sm hover:from-blue-700 hover:to-indigo-700",
      destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow",
      outline: "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 hover:border-gray-300",
      "premium-outline": "border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 hover:border-blue-400",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
      ghost: "hover:bg-gray-100 text-gray-700 hover:text-gray-900",
      link: "underline-offset-4 hover:underline text-blue-600 p-0 h-auto",
    };
    
    const sizes = {
      xs: "h-7 px-2 text-xs rounded",
      sm: "h-9 px-3 rounded-md text-sm",
      default: "h-10 py-2 px-4 text-sm",
      lg: "h-12 px-8 rounded-md text-base",
      icon: "h-10 w-10 p-0",
    };
    
    const variantStyles = variants[variant];
    const sizeStyles = sizes[size];
    
    const allStyles = `${baseStyles} ${variantStyles} ${sizeStyles} ${className || ''}`;
    
    return (
      <button
        className={allStyles}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {typeof children === 'string' ? 'Loading...' : children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };