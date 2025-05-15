import React, { createContext, useContext, useState, useEffect } from "react";

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a TabsProvider");
  }
  return context;
};

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "minimal" | "pill" | "underline";
}

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className = "",
  variant = "minimal" // Change default to minimal
}: TabsProps) {
  const [tabValue, setTabValue] = useState(value || defaultValue);

  // Update internal state when controlled value changes
  useEffect(() => {
    if (value !== undefined) {
      setTabValue(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setTabValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider
      value={{
        value: value !== undefined ? value : tabValue,
        onValueChange: handleValueChange,
      }}
    >
      <div className={`tabs-container ${className}`} data-variant={variant}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  centered?: boolean;
}

export function TabsList({ 
  children, 
  className = "",
  scrollable = false,
  centered = false
}: TabsListProps) {
  const variantClasses = {
    default: "bg-gray-50 p-1 border border-gray-100 shadow-sm",
    minimal: "border-b border-gray-100", // Simplified minimalist style
    pill: "bg-transparent",
    underline: "border-b border-gray-200",
  };

  const { value: selectedValue } = useTabs();
  const tabsRef = React.useRef<HTMLDivElement>(null);
  
  // Scroll selected tab into view
  useEffect(() => {
    if (scrollable && tabsRef.current) {
      const container = tabsRef.current;
      const selectedTab = container.querySelector(`[data-state="active"]`);
      
      if (selectedTab) {
        // Calculate scroll position to center the selected tab
        const containerWidth = container.offsetWidth;
        const tabWidth = selectedTab.clientWidth;
        const tabLeft = (selectedTab as HTMLElement).offsetLeft;
        const scrollPosition = tabLeft - (containerWidth / 2) + (tabWidth / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    }
  }, [selectedValue, scrollable]);

  return (
    <div
      ref={tabsRef}
      className={`inline-flex items-center w-full ${
        scrollable ? "overflow-x-auto no-scrollbar" : ""
      } ${centered ? "justify-center" : ""} ${className}`}
      data-variant={useContext(TabsContext)?.value}
      role="tablist"
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function TabsTrigger({ 
  value, 
  children, 
  className = "", 
  disabled = false,
  icon
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs();
  const isSelected = selectedValue === value;
  
  // Get the parent variant
  const variantStyles = {
    default: `${
      isSelected
        ? "bg-white text-blue-600 shadow-sm font-medium"
        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
    } rounded-lg`,
    minimal: `${
      isSelected
        ? "text-blue-600 font-medium border-b-2 border-blue-600" // Clean underline for active tab
        : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
    } rounded-none transition-colors`, // Simple transition with no shadow or background
    pill: `${
      isSelected
        ? "bg-blue-50 text-blue-600 font-medium border-blue-100"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent"
    } border rounded-full transition-colors`,
    underline: `${
      isSelected
        ? "text-blue-600 font-medium border-b-2 border-blue-600"
        : "text-gray-600 hover:text-gray-900 border-b-2 border-transparent"
    } rounded-none transition-colors pb-2`
  };
  
  // Determine which variant to use from the context
  const tabsContainer = document.querySelector('.tabs-container');
  const variant = tabsContainer?.getAttribute('data-variant') || 'minimal';
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      disabled={disabled}
      className={`inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm transition-all 
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-1 
        disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant as keyof typeof variantStyles]} ${className}`}
      onClick={() => onValueChange(value)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  forceMount?: boolean;
  animated?: boolean;
}

export function TabsContent({ 
  value, 
  children, 
  className = "",
  forceMount = false,
  animated = true
}: TabsContentProps) {
  const { value: selectedValue } = useTabs();
  const isSelected = selectedValue === value;
  
  // Don't render anything unless active or forceMount is true
  if (!isSelected && !forceMount) return null;
  
  return (
    <div 
      role="tabpanel" 
      aria-hidden={!isSelected}
      hidden={!isSelected && !forceMount}
      data-state={isSelected ? "active" : "inactive"}
      className={`${animated && isSelected ? 'animate-tabFadeIn' : ''} ${className}`}
    >
      {children}
    </div>
  );
}