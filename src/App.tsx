import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { TimerProvider } from "./contexts/TimerContext";
import { TimeEntriesProvider } from "./contexts/TimeEntriesContext";
import Navigation from "./components/Navigation";
import Auth from "./components/Auth";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastContainer from "./components/ToastContainer";
import { Loader2, LogOut, User } from "lucide-react";

// Lazy load heavy components
const Timer = lazy(() => import("./components/Timer"));
const ProjectManager = lazy(() => import("./components/ProjectManager"));
const TimeEntries = lazy(() => import("./components/TimeEntries"));
const Reports = lazy(() => import("./components/Reports"));
const Projects = lazy(() => import("./components/Projects"));
const Clients = lazy(() => import("./components/Clients"));
const Settings = lazy(() => import("./components/Settings"));
const InvoiceGeneratorModal = lazy(
  () => import("./components/InvoiceGeneratorModal")
);
const UnsavedChangesModal = lazy(
  () => import("./components/UnsavedChangesModal")
);

import type { SettingsHandle } from "./components/Settings";
// Import theme manager to ensure it's initialized
import { themeManager } from "./lib/themeManager";
import type { TimeEntry } from "./lib/timeEntriesApi";
import type { Project } from "./lib/projectsApi";
import type { UserSettings } from "./lib/settingsApi";
import * as ErrorLoggerModule from "./lib/errorLogger";

const { errorLogger } = ErrorLoggerModule;

// Initialize theme system
themeManager.getCurrentTheme();

// Loading fallback component for lazy-loaded components
const LoadingFallback = ({ componentName }: { componentName: string }) => (
  <div className="card p-6 flex items-center justify-center min-h-[200px]">
    <div className="flex items-center space-x-3 text-primary">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span>Loading {componentName}...</span>
    </div>
  </div>
);

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("timer");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceModalData, setInvoiceModalData] = useState<{
    timeEntries: TimeEntry[];
    projects: Project[];
    userSettings: UserSettings;
    selectedClientId?: string;
    periodStart: string;
    periodEnd: string;
  } | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    null | (() => void)
  >(null);
  const [initialSettings, setInitialSettings] = useState<UserSettings | null>(
    null
  );
  const [settingsDirty, setSettingsDirty] = useState(false); // Track unsaved changes
  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<SettingsHandle>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Navigation handler with unsaved changes logic
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    // Only block navigation if on settings and there are unsaved changes
    if (activeTab === "settings" && settingsDirty) {
      setShowUnsavedModal(true);
      setPendingNavigation(() => () => {
        setIsTransitioning(true);
        setTimeout(() => {
          setActiveTab(newTab);
          setTimeout(() => {
            setIsTransitioning(false);
          }, 50);
        }, 200);
      });
      return;
    }
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(newTab);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  };

  // Function to open modal from anywhere
  const openInvoiceModal = (data: {
    timeEntries: TimeEntry[];
    projects: Project[];
    userSettings: UserSettings;
    selectedClientId?: string;
    periodStart: string;
    periodEnd: string;
  }) => {
    setInvoiceModalData(data);
    setInvoiceModalOpen(true);
  };

  // Handlers for modal actions
  const handleSaveAndLeave = async () => {
    if (settingsRef.current) {
      const savedSettings = await settingsRef.current.saveSettings();
      if (savedSettings) {
        setInitialSettings(savedSettings); // Update initialSettings to match saved
        setSettingsDirty(false); // Reset dirty state after save
      }
    }
    setShowUnsavedModal(false);
    if (pendingNavigation) pendingNavigation();
  };
  const handleDiscardAndLeave = () => {
    setShowUnsavedModal(false);
    setSettingsDirty(false); // Reset dirty state after discard
    if (pendingNavigation) pendingNavigation();
  };

  const renderContent = () => {
    switch (activeTab) {
      case "timer":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
            <div className="lg:col-span-2">
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  errorLogger.logReactError(error, errorInfo, {
                    component: "Timer",
                  });
                }}
                fallback={
                  <div className="card p-6 text-center">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      Timer Unavailable
                    </h3>
                    <p className="text-secondary">
                      There was an issue with the timer. Please refresh the
                      page.
                    </p>
                  </div>
                }
              >
                <Suspense fallback={<LoadingFallback componentName="Timer" />}>
                  <Timer />
                </Suspense>
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-3">
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  errorLogger.logReactError(error, errorInfo, {
                    component: "ProjectManager",
                  });
                }}
                fallback={
                  <div className="card p-6 text-center">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      Project Manager Unavailable
                    </h3>
                    <p className="text-secondary">
                      There was an issue loading projects. Please refresh the
                      page.
                    </p>
                  </div>
                }
              >
                <Suspense
                  fallback={<LoadingFallback componentName="Project Manager" />}
                >
                  <ProjectManager />
                </Suspense>
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-5">
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  errorLogger.logReactError(error, errorInfo, {
                    component: "TimeEntries",
                  });
                }}
                fallback={
                  <div className="card p-6 text-center">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      Time Entries Unavailable
                    </h3>
                    <p className="text-secondary">
                      There was an issue loading time entries. Please refresh
                      the page.
                    </p>
                  </div>
                }
              >
                <Suspense
                  fallback={<LoadingFallback componentName="Time Entries" />}
                >
                  <TimeEntries />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        );
      case "reports":
        return (
          <Suspense fallback={<LoadingFallback componentName="Reports" />}>
            <Reports openInvoiceModal={openInvoiceModal} />
          </Suspense>
        );
      case "projects":
        return (
          <Suspense fallback={<LoadingFallback componentName="Projects" />}>
            <Projects />
          </Suspense>
        );
      case "clients":
        return (
          <Suspense fallback={<LoadingFallback componentName="Clients" />}>
            <Clients />
          </Suspense>
        );
      case "settings":
        return (
          <Suspense fallback={<LoadingFallback componentName="Settings" />}>
            <Settings
              ref={settingsRef}
              showUnsavedModal={showUnsavedModal}
              setShowUnsavedModal={setShowUnsavedModal}
              handleSaveAndLeave={handleSaveAndLeave}
              handleDiscardAndLeave={handleDiscardAndLeave}
              setPendingNavigation={setPendingNavigation}
              initialSettings={initialSettings}
              setInitialSettings={setInitialSettings}
              settingsDirty={settingsDirty}
              setSettingsDirty={setSettingsDirty}
              // ...other props as needed...
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2 text-primary">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth component if user is not logged in
  if (!user) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  // Main app interface for authenticated users
  return (
    <TimerProvider>
      <TimeEntriesProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-10"></div>
          </div>

          <div className="relative z-10 flex flex-col min-h-screen">
            <header className="fixed top-0 left-0 right-0 bg-white bg-opacity-10 backdrop-blur-md border-b border-white border-opacity-20 py-4 z-50">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between">
                <button
                  onClick={() => setActiveTab("timer")}
                  className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                >
                  <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    TimeTracker Pro
                  </h1>
                </button>

                <div className="flex items-center gap-4">
                  <Navigation
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                  />

                  {/* User Menu */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10 transition-all duration-200"
                    >
                      <User className="w-5 h-5" />
                      <span className="hidden sm:block">
                        {user?.user_metadata?.["full_name"] || user?.email}
                      </span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {user?.user_metadata?.["full_name"] || "User"}
                          </p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            signOut();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <main className="pt-24 pb-4 sm:pb-6 lg:pb-8 flex-1">
              <div className="max-w-7xl mx-auto px-3 sm:px-6">
                <div
                  className={`transition-all duration-300 ease-in-out transform ${
                    isTransitioning
                      ? "opacity-0 translate-y-4 scale-[0.98]"
                      : "opacity-100 translate-y-0 scale-100"
                  }`}
                >
                  {isTransitioning && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div
                    className={`tab-content ${
                      isTransitioning ? "loading-shimmer" : ""
                    }`}
                  >
                    {renderContent()}
                  </div>
                </div>
              </div>
            </main>

            {/* Footer */}
            <Footer />
          </div>
          {/* Invoice Modal overlayed at app level */}
          {invoiceModalOpen && invoiceModalData && (
            <Suspense
              fallback={
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <LoadingFallback componentName="Invoice Generator" />
                </div>
              }
            >
              <InvoiceGeneratorModal
                isOpen={invoiceModalOpen}
                onClose={() => setInvoiceModalOpen(false)}
                {...invoiceModalData}
              />
            </Suspense>
          )}
          {/* Unsaved Changes Modal at app root */}
          <Suspense
            fallback={
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <LoadingFallback componentName="Unsaved Changes" />
              </div>
            }
          >
            <UnsavedChangesModal
              isOpen={showUnsavedModal}
              onSave={handleSaveAndLeave}
              onDiscard={handleDiscardAndLeave}
              onCancel={() => setShowUnsavedModal(false)}
            />
          </Suspense>

          {/* Global Toast Container */}
          <ToastContainer />
        </div>
      </TimeEntriesProvider>
    </TimerProvider>
  );
}

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        errorLogger.logReactError(error, errorInfo, {
          component: "App Root",
          timestamp: new Date().toISOString(),
        });
      }}
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
