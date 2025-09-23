import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  Clock,
  Loader2,
  Edit3,
  Timer as TimerIcon,
  Calendar,
  ChevronDown,
  FolderOpen,
  CheckCircle,
} from "lucide-react";
import {
  timeEntriesApi,
  type ActiveTimer,
  type TimeEntry,
} from "../lib/timeEntriesApi";
import { useTimeEntries } from "../hooks/useTimeEntries";
import { useAuth } from "../hooks/useAuth";
import { useTimer } from "../hooks/useTimer";
import { secondsToHMS } from "../utils/timeUtils";

const Timer: React.FC = () => {
  const { projects, timeEntries } = useTimeEntries();
  const { loading: authLoading } = useAuth();
  const {
    timer,
    startTimer: startTimerContext,
    stopTimer: stopTimerContext,
  } = useTimer();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Success state for submit button
  const [showSuccess, setShowSuccess] = useState(false);

  // Manual entry mode state
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
    startTime: "",
    endTime: "",
    duration: 0,
  });

  // Load initial data - only after auth is ready
  useEffect(() => {
    if (!authLoading) {
      loadInitialData();
    }
  }, [authLoading]);

  // Listen for changes in timeEntries to detect when a timer is started from elsewhere
  useEffect(() => {
    const runningEntry = timeEntries.find(
      (entry: TimeEntry) =>
        entry.is_running || (!entry.end_time && entry.start_time)
    );

    if (runningEntry && !activeTimer) {
      // A timer was started from elsewhere (like TimeEntries component)
      setActiveTimer({
        id: runningEntry.id!,
        start_time: runningEntry.start_time,
        description: runningEntry.description || "",
        project_id: runningEntry.project_id,
        project: runningEntry.project,
      });
      setDescription(runningEntry.description || "");
      setSelectedProjectId(runningEntry.project_id || "");

      // Sync with TimerContext
      startTimerContext();
    } else if (!runningEntry && activeTimer) {
      // Timer was stopped from elsewhere
      setActiveTimer(null);
      setElapsedTime(0);
      setDescription("");
      setSelectedProjectId("");

      // Sync with TimerContext
      stopTimerContext();
    }
  }, [timeEntries, activeTimer, startTimerContext, stopTimerContext]);

  // Sync selected project from TimerContext
  useEffect(() => {
    if (timer.selectedProject) {
      setSelectedProjectId(timer.selectedProject.id);
    }
  }, [timer.selectedProject]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update elapsed time for running timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTimer) {
      interval = setInterval(() => {
        const startTime = new Date(activeTimer.start_time).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const timer = await timeEntriesApi.getActiveTimer();

      setActiveTimer(timer);

      if (timer) {
        setDescription(timer.description || "");
        setSelectedProjectId(timer.project_id || "");
      }
    } catch (error) {
      console.error("Error loading timer data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartStop = async () => {
    if (activeTimer) {
      // Stop timer
      await handleStop();
    } else {
      // Start timer
      await handleStart();
    }
  };

  const handleStart = async () => {
    try {
      setIsSaving(true);
      const newTimer = await timeEntriesApi.startTimer(
        description,
        selectedProjectId || undefined
      );
      setActiveTimer({
        id: newTimer.id!,
        start_time: newTimer.start_time,
        description: newTimer.description || "",
        project_id: newTimer.project_id || undefined,
        project: newTimer.project,
      });

      // Sync with TimerContext
      startTimerContext();

      // Real-time subscription will handle adding the new entry
    } catch (error) {
      console.error("Error starting timer:", error);
      alert("Failed to start timer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsSaving(true);
      await timeEntriesApi.stopActiveTimer();
      setActiveTimer(null);
      setElapsedTime(0);

      // Sync with TimerContext
      stopTimerContext();

      // Real-time subscription will handle updating the entry
      setDescription("");
      setSelectedProjectId("");
    } catch (error) {
      console.error("Error stopping timer:", error);
      alert("Failed to stop timer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateDescription = async (newDescription: string) => {
    setDescription(newDescription);

    if (activeTimer) {
      try {
        await timeEntriesApi.updateTimeEntry(activeTimer.id, {
          description: newDescription,
        });
      } catch (error) {
        console.error("Error updating description:", error);
      }
    }
  };

  // Success notification function
  const showSuccessState = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000); // Hide after 2 seconds
  };

  // Manual entry helper functions
  const calculateManualDuration = (
    startTime: string,
    endTime: string
  ): number => {
    if (!startTime || !endTime) return 0;

    const start = new Date(`${manualEntry.date}T${startTime}`);
    const end = new Date(`${manualEntry.date}T${endTime}`);

    if (end <= start) return 0;

    return Math.floor((end.getTime() - start.getTime()) / 1000);
  };

  const handleManualTimeChange = (
    field: "startTime" | "endTime",
    value: string
  ) => {
    const updatedEntry = { ...manualEntry, [field]: value };
    const duration = calculateManualDuration(
      updatedEntry.startTime,
      updatedEntry.endTime
    );

    setManualEntry({
      ...updatedEntry,
      duration,
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !manualEntry.startTime ||
      !manualEntry.endTime ||
      manualEntry.duration <= 0
    ) {
      alert("Please fill in start time, end time, and ensure valid duration.");
      return;
    }

    try {
      setIsSaving(true);

      const startDateTime = new Date(
        `${manualEntry.date}T${manualEntry.startTime}`
      );
      const endDateTime = new Date(
        `${manualEntry.date}T${manualEntry.endTime}`
      );

      await timeEntriesApi.createTimeEntry({
        description,
        project_id: selectedProjectId || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration: manualEntry.duration,
        billable: true, // Default to billable, can be adjusted
      });

      // Real-time subscription will handle adding the new entry
      setDescription("");
      setSelectedProjectId("");
      setManualEntry({
        date: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        duration: 0,
      });

      showSuccessState();
    } catch (error) {
      console.error("Error creating manual entry:", error);
      alert("Failed to create time entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-3 sm:p-6 sticky top-24 isolate">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary" />
          <span className="ml-2 sm:ml-3 text-secondary text-sm sm:text-base">
            Loading timer...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3 sm:p-6 sticky top-24 isolate">
      {/* Timer Header with Mode Toggle */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-primary">
            {isManualMode ? "Manual Entry" : "Timer"}
          </h2>
        </div>

        {/* Mode Toggle */}
        <div className="relative flex bg-surface rounded-lg p-1 border border-theme">
          {/* Sliding Background Indicator */}
          <div
            className={`absolute top-1 bottom-1 bg-blue-600 rounded-md shadow-sm transition-all duration-300 ease-in-out ${
              !isManualMode
                ? "left-1 right-1/2 mr-0.5"
                : "right-1 left-1/2 ml-0.5"
            }`}
          />

          {/* Timer Button */}
          <button
            onClick={() => setIsManualMode(false)}
            className={`relative z-10 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 flex-1 justify-center ${
              !isManualMode ? "text-white" : "text-secondary hover:text-primary"
            }`}
          >
            <TimerIcon className="w-4 h-4" />
            Timer
          </button>

          {/* Manual Button */}
          <button
            onClick={() => setIsManualMode(true)}
            className={`relative z-10 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 flex-1 justify-center ${
              isManualMode ? "text-white" : "text-secondary hover:text-primary"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={activeTimer !== null}
          >
            <Edit3 className="w-4 h-4" />
            Manual
          </button>
        </div>
      </div>

      {isManualMode ? (
        /* Manual Entry Form */
        <form onSubmit={handleManualSubmit} className="space-y-6">
          {/* Date Selection */}
          <div>
            <label
              htmlFor="manual-entry-date"
              className="block text-sm font-medium text-primary mb-2"
            >
              Date
            </label>
            <input
              type="date"
              id="manual-entry-date"
              name="manualEntryDate"
              value={manualEntry.date}
              onChange={(e) =>
                setManualEntry({ ...manualEntry, date: e.target.value })
              }
              className="input-field"
              max={new Date().toISOString().split("T")[0]} // Can't select future dates
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="manual-entry-start-time"
                className="block text-sm font-medium text-primary mb-2"
              >
                Start Time
              </label>
              <input
                type="time"
                id="manual-entry-start-time"
                name="manualEntryStartTime"
                value={manualEntry.startTime}
                onChange={(e) =>
                  handleManualTimeChange("startTime", e.target.value)
                }
                className="input-field"
                required
              />
            </div>
            <div>
              <label
                htmlFor="manual-entry-end-time"
                className="block text-sm font-medium text-primary mb-2"
              >
                End Time
              </label>
              <input
                type="time"
                id="manual-entry-end-time"
                name="manualEntryEndTime"
                value={manualEntry.endTime}
                onChange={(e) =>
                  handleManualTimeChange("endTime", e.target.value)
                }
                className="input-field"
                required
              />
            </div>
          </div>

          {/* Duration Display */}
          {manualEntry.duration > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Duration:
                  </span>
                </div>
                <span className="text-xl font-bold text-blue-700 font-mono">
                  {secondsToHMS(manualEntry.duration)}
                </span>
              </div>
            </div>
          )}

          {/* Description Input */}
          <div>
            <label
              htmlFor="manual-entry-description"
              className="block text-sm font-medium text-primary mb-2"
            >
              Description
            </label>
            <input
              type="text"
              id="manual-entry-description"
              name="manualEntryDescription"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Project Selection */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-3">
              <FolderOpen className="w-4 h-4" />
              Project
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="input-field w-full text-left flex items-center justify-between hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  {selectedProjectId ? (
                    <>
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                        style={{
                          backgroundColor:
                            projects.find((p) => p.id === selectedProjectId)
                              ?.color || "#3B82F6",
                        }}
                      />
                      <span className="font-medium">
                        {projects.find((p) => p.id === selectedProjectId)
                          ?.name || "Select Project"}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full bg-surface-secondary flex-shrink-0" />
                      <span className="text-muted">No Project</span>
                    </>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted transition-transform duration-200 ${
                    showProjectDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showProjectDropdown && (
                <div className="absolute z-[999] w-full mt-2 bg-surface border border-theme rounded-lg shadow-xl max-h-60 overflow-auto scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId("");
                      setShowProjectDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-surface-hover flex items-center gap-3 border-b border-theme/10 last:border-b-0"
                  >
                    <div className="w-4 h-4 rounded-full bg-surface-secondary flex-shrink-0" />
                    <span className="text-muted font-medium">No Project</span>
                  </button>
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(project.id!);
                        setShowProjectDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-surface-hover flex items-center gap-3 border-b border-theme/10 last:border-b-0"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: project.color || "#3B82F6" }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="truncate text-primary font-medium block">
                          {project.name}
                        </span>
                        {project.client?.name && (
                          <span className="text-xs text-muted truncate block">
                            {project.client.name}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Spacer element to push content down when dropdown is open */}
            {showProjectDropdown && (
              <div className="h-60 transition-all duration-300 ease-in-out" />
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving || manualEntry.duration <= 0 || showSuccess}
            className={`w-full btn-primary transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center ${
              showSuccess
                ? "!bg-green-500 hover:!bg-green-600 !text-white !opacity-100"
                : "disabled:opacity-50"
            }`}
          >
            {showSuccess ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>Added Successfully!</span>
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2 flex-shrink-0" />
                <span>Adding Entry...</span>
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>Add Time Entry</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Timer Mode */
        <div>
          {/* Timer Display */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 font-mono">
              {secondsToHMS(elapsedTime)}
            </div>
            {activeTimer && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Recording</span>
              </div>
            )}
          </div>

          {/* Description Input */}
          <div className="mb-6">
            <label
              htmlFor="timer-description"
              className="flex items-center gap-2 text-sm font-medium text-primary mb-3"
            >
              <Edit3 className="w-4 h-4" />
              Description
            </label>
            <input
              type="text"
              id="timer-description"
              name="timerDescription"
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => updateDescription(e.target.value)}
              className="input-field"
              disabled={isSaving}
            />
          </div>

          {/* Project Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-3">
              <FolderOpen className="w-4 h-4" />
              Project
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="input-field w-full text-left flex items-center justify-between hover:bg-surface-hover transition-colors"
                disabled={activeTimer !== null || isSaving}
              >
                <div className="flex items-center gap-3">
                  {selectedProjectId ? (
                    <>
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                        style={{
                          backgroundColor:
                            projects.find((p) => p.id === selectedProjectId)
                              ?.color || "#3B82F6",
                        }}
                      />
                      <span className="font-medium">
                        {projects.find((p) => p.id === selectedProjectId)
                          ?.name || "Select Project"}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full bg-surface-secondary flex-shrink-0" />
                      <span className="text-muted">No Project</span>
                    </>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted transition-transform duration-200 ${
                    showProjectDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showProjectDropdown && !(activeTimer !== null || isSaving) && (
                <div className="absolute z-[999] w-full mt-2 bg-surface border border-theme rounded-lg shadow-xl max-h-60 overflow-auto scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId("");
                      setShowProjectDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-surface-hover flex items-center gap-3 border-b border-theme/10 last:border-b-0"
                  >
                    <div className="w-4 h-4 rounded-full bg-surface-secondary flex-shrink-0" />
                    <span className="text-muted font-medium">No Project</span>
                  </button>
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(project.id!);
                        setShowProjectDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-surface-hover flex items-center gap-3 border-b border-theme/10 last:border-b-0"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: project.color || "#3B82F6" }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="truncate text-primary font-medium block">
                          {project.name}
                        </span>
                        {project.client?.name && (
                          <span className="text-xs text-muted truncate block">
                            {project.client.name}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Spacer element to push content down when dropdown is open */}
            {showProjectDropdown && !(activeTimer !== null || isSaving) && (
              <div className="h-60 transition-all duration-300 ease-in-out" />
            )}
          </div>

          {/* Timer Controls */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleStartStop}
              disabled={isSaving}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTimer
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : activeTimer ? (
                <>
                  <Square className="w-5 h-5" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start
                </>
              )}
            </button>
          </div>

          {/* Current Project Display */}
          {activeTimer?.project && (
            <div className="p-4 bg-surface rounded-lg border border-theme">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full ring-2 ring-white shadow-sm"
                  style={{ backgroundColor: activeTimer.project.color }}
                ></div>
                <div>
                  <span className="text-sm font-medium text-primary block">
                    {activeTimer.project.name}
                  </span>
                  <span className="text-xs text-muted">Currently tracking</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Timer;
