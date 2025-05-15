
import React, { useState, useEffect, useRef } from "react";
import { Button } from "./button";
import { 
  MoreHorizontal, 
  ChevronDown,
  Menu as MenuIcon,
  X
} from "lucide-react";

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabGroupProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "underline" | "pills" | "minimal";
  mobileDisplay?: "dropdown" | "drawer" | "grid";
  visibleTabCount?: number;
  groupedTabs?: {
    [key: string]: TabItem[];
  };
}

export function TabGroup({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  mobileDisplay = "dropdown",
  visibleTabCount = 4,
  groupedTabs
}: TabGroupProps) {
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [visibleTabs, setVisibleTabs] = useState<TabItem[]>([]);
  const [overflowTabs, setOverflowTabs] = useState<TabItem[]>([]);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  
  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Determine which tabs should be visible and which should be in overflow menu
  useEffect(() => {
    if (windowWidth < 768) {
      // On mobile, keep all tabs in dropdown/drawer
      setVisibleTabs([]);
      setOverflowTabs(tabs);
    } else {
      if (groupedTabs) {
        // For grouped tabs, determine visible tabs based on the active group
        const allVisibleTabs: TabItem[] = [];
        Object.keys(groupedTabs).forEach(groupKey => {
          if (groupedTabs[groupKey].some(tab => tab.id === activeTab)) {
            allVisibleTabs.push(...groupedTabs[groupKey]);
          }
        });
        setVisibleTabs(allVisibleTabs.slice(0, visibleTabCount));
        setOverflowTabs(tabs.filter(tab => !allVisibleTabs.slice(0, visibleTabCount).some(t => t.id === tab.id)));
      } else {
        // Standard tabs - show first n tabs
        setVisibleTabs(tabs.slice(0, visibleTabCount));
        setOverflowTabs(tabs.slice(visibleTabCount));
      }
    }
  }, [tabs, windowWidth, visibleTabCount, activeTab, groupedTabs]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        overflowMenuRef.current && 
        !overflowMenuRef.current.contains(event.target as Node) &&
        !tabsContainerRef.current?.contains(event.target as Node)
      ) {
        setOverflowMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get active tab info
  const currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0];
  
  // Get var styles based on variant
  const getVariantStyles = (isActive: boolean) => {
    switch (variant) {
      case "pills":
        return isActive 
          ? "bg-blue-50 text-blue-600 font-medium"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50";
      case "minimal":
        return isActive 
          ? "text-blue-600 font-medium"
          : "text-gray-500 hover:text-gray-800";
      case "underline":
      default:
        return isActive 
          ? "text-blue-600 border-b-2 border-blue-600 rounded-none font-medium"
          : "text-gray-500 hover:text-gray-800 border-b-2 border-transparent rounded-none";
    }
  };
  
  // Render mobile menu based on display type
  const renderMobileMenu = () => {
    if (!mobileMenuOpen) return null;
    
    switch (mobileDisplay) {
      case "drawer":
        return (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
            
            {/* Drawer */}
            <div className="relative w-64 max-w-[70vw] bg-white h-full shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-medium">Navigation</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {groupedTabs ? (
                  /* Grouped tabs display in drawer */
                  <div className="space-y-4">
                    {Object.entries(groupedTabs).map(([groupName, groupTabs]) => (
                      <div key={groupName}>
                        <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{groupName}</div>
                        <div className="space-y-1">
                          {groupTabs.map(tab => (
                            <button
                              key={tab.id}
                              className={`flex items-center w-full px-3 py-2 text-sm rounded-md ${
                                tab.id === activeTab
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                onChange(tab.id);
                                setMobileMenuOpen(false);
                              }}
                              disabled={tab.disabled}
                            >
                              {tab.icon && <span className="mr-2">{tab.icon}</span>}
                              <span>{tab.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Standard tabs display in drawer */
                  <div className="space-y-1">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        className={`flex items-center w-full px-3 py-2 text-sm rounded-md ${
                          tab.id === activeTab
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          onChange(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        disabled={tab.disabled}
                      >
                        {tab.icon && <span className="mr-2">{tab.icon}</span>}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case "grid":
        return (
          <div className="md:hidden py-2 px-3 bg-white border-b border-gray-100 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              {tabs.map(tab => (
                <Button
                  key={tab.id}
                  variant={tab.id === activeTab ? "default" : "ghost"}
                  size="sm"
                  className={`justify-start ${tab.id === activeTab ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-gray-700'}`}
                  onClick={() => {
                    onChange(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  disabled={tab.disabled}
                >
                  <div className="flex items-center">
                    {tab.icon && <span className="mr-2">{tab.icon}</span>}
                    <span className="text-sm truncate">{tab.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );
        
      case "dropdown":
      default:
        return (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-sm z-50" ref={overflowMenuRef}>
            <div className="p-2 max-h-[50vh] overflow-y-auto">
              {groupedTabs ? (
                /* Grouped tabs in dropdown */
                <div className="space-y-3">
                  {Object.entries(groupedTabs).map(([groupName, groupTabs]) => (
                    <div key={groupName} className="space-y-1">
                      <div className="text-xs uppercase tracking-wider text-gray-500 px-3 py-1">{groupName}</div>
                      {groupTabs.map(tab => (
                        <button
                          key={tab.id}
                          className={`flex items-center w-full px-3 py-2 text-sm rounded-md ${
                            tab.id === activeTab
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            onChange(tab.id);
                            setMobileMenuOpen(false);
                          }}
                          disabled={tab.disabled}
                        >
                          {tab.icon && <span className="mr-2">{tab.icon}</span>}
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                /* Standard tabs in dropdown */
                <div className="space-y-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`flex items-center w-full px-3 py-2 text-sm rounded-md ${
                        tab.id === activeTab
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        onChange(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      disabled={tab.disabled}
                    >
                      {tab.icon && <span className="mr-2">{tab.icon}</span>}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="relative" ref={tabsContainerRef}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-2 border-b border-gray-100">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-gray-600 flex items-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <MenuIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">{currentTab.label}</span>
          <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
        </Button>
        
        {currentTab.icon && (
          <div className="bg-blue-50 p-1 rounded-md text-blue-600">
            {currentTab.icon}
          </div>
        )}
      </div>
      
      {/* Mobile Menu */}
      {renderMobileMenu()}
      
      {/* Desktop Tabs */}
      <div className="hidden md:block">
        <div className="flex items-center">
          {/* Visible Tabs */}
          <div className="flex-1">
            <nav className={`flex items-center ${variant === 'pills' ? 'space-x-2' : 'space-x-1'}`}>
              {visibleTabs.map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  className={`${
                    variant === 'underline' ? 'py-4 px-3' : 'px-3 py-2'
                  } ${
                    variant === 'pills' ? 'rounded-full' : ''
                  } ${getVariantStyles(tab.id === activeTab)}`}
                  onClick={() => onChange(tab.id)}
                  disabled={tab.disabled}
                >
                  <div className="flex items-center">
                    {tab.icon && <span className="mr-2">{tab.icon}</span>}
                    <span>{tab.label}</span>
                  </div>
                </Button>
              ))}
            </nav>
          </div>
          
          {/* Overflow Menu (More button) */}
          {overflowTabs.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  variant === 'underline' ? 'py-4 px-3' : 'px-3 py-2'
                } ${
                  variant === 'pills' ? 'rounded-full' : ''
                } ${getVariantStyles(overflowTabs.some(tab => tab.id === activeTab))}`}
                onClick={() => setOverflowMenuOpen(!overflowMenuOpen)}
              >
                <div className="flex items-center">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="ml-2">More</span>
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${overflowMenuOpen ? 'rotate-180' : ''}`} />
                </div>
              </Button>
              
              {/* Overflow Dropdown */}
              {overflowMenuOpen && (
                <div 
                  className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-100 overflow-hidden z-50"
                  ref={overflowMenuRef}
                >
                  {groupedTabs ? (
                    /* Grouped tabs in overflow */
                    <div className="py-2">
                      {Object.entries(groupedTabs).map(([groupName, groupTabs]) => {
                        // Only show groups that have tabs in overflow
                        const groupOverflowTabs = groupTabs.filter(tab => 
                          overflowTabs.some(t => t.id === tab.id)
                        );
                        
                        if (groupOverflowTabs.length === 0) return null;
                        
                        return (
                          <div key={groupName} className="py-1">
                            <div className="px-4 py-1 text-xs uppercase tracking-wider text-gray-500">{groupName}</div>
                            {groupOverflowTabs.map(tab => (
                              <button
                                key={tab.id}
                                className={`flex items-center w-full px-4 py-2 text-sm ${
                                  tab.id === activeTab
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  onChange(tab.id);
                                  setOverflowMenuOpen(false);
                                }}
                                disabled={tab.disabled}
                              >
                                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                                <span>{tab.label}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Standard tabs in overflow */
                    <div className="py-1">
                      {overflowTabs.map(tab => (
                        <button
                          key={tab.id}
                          className={`flex items-center w-full px-4 py-2 text-sm ${
                            tab.id === activeTab
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            onChange(tab.id);
                            setOverflowMenuOpen(false);
                          }}
                          disabled={tab.disabled}
                        >
                          {tab.icon && <span className="mr-2">{tab.icon}</span>}
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}