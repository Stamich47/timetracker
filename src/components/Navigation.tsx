import React, { useState, useRef, useEffect } from "react";
import {
  Timer,
  BarChart3,
  FolderOpen,
  Users,
  Settings,
  Menu,
  X,
} from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: "timer", label: "Timer", icon: Timer },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "projects", label: "Projects", icon: FolderOpen },
    { id: "clients", label: "Clients", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTabClick = (tabId: string) => {
    if (tabId === activeTab) return;
    // Fire custom event for settings tab change if leaving settings
    if (activeTab === "settings") {
      const event = new CustomEvent("settingsTabChange", { cancelable: true });
      window.dispatchEvent(event);
      // Only proceed if not prevented (modal will handle navigation)
      let proceed = false;
      const proceedListener = () => {
        proceed = true;
        onTabChange(tabId);
      };
      window.addEventListener("proceedTabChange", proceedListener, {
        once: true,
      });
      // If there are no unsaved changes, the modal won't show and proceedTabChange won't fire,
      // so we need to check if the event was not prevented and proceed immediately.
      setTimeout(() => {
        if (!proceed) {
          onTabChange(tabId);
        }
      }, 0);
      return;
    }
    onTabChange(tabId);
    setIsMobileMenuOpen(false); // Close mobile menu after selection
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-white bg-white bg-opacity-20 font-medium"
                  : "text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden relative" ref={mobileMenuRef}>
        {/* Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center justify-center p-2 rounded-lg text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10 transition-all duration-200"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white bg-opacity-95 backdrop-blur-md rounded-lg shadow-lg border border-white border-opacity-20 py-2 z-50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Navigation;
