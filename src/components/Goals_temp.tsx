/**
 * Goals Component
 *
 * Main goals management interface with list view and creation modal.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  Timer,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Edit,
  Trash2,
  Building,
  Globe,
} from "lucide-react";
import { useGoals } from "../hooks/useGoals";
import { useTimeEntries } from "../hooks/useTimeEntries";
import { projectsApi } from "../lib/projectsApi";
import type {
  TimeGoal,
  RevenueGoal,
  ProjectGoal,
  BaseGoal,
} from "../lib/goals";
import type { Project } from "../lib/projectsApi";
import type { Client } from "../lib/projectsApi";

interface GoalsProps {
  onShowCreateModal: (show: boolean, editingGoal?: BaseGoal | null) => void;
}

const Goals: React.FC<GoalsProps> = ({ onShowCreateModal }) => {
  const { goalsWithProgress, loading, error } = useGoals();
  const { timeEntries } = useTimeEntries();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [timeRange, setTimeRange] = useState<string>("30days");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [chartTracking, setChartTracking] = useState<Record<string, boolean>>({});

  const { deleteGoal } = useGoals();

  // Initialize chart tracking: active goals = ON, completed goals = OFF
  useEffect(() => {
    const tracking: Record<string, boolean> = {};
    goalsWithProgress.forEach((goal) => {
      // Only initialize if not already set (preserves user changes)
      if (chartTracking[goal.id] === undefined) {
        tracking[goal.id] = goal.progress.status !== "completed";
      }
    });
    
    if (Object.keys(tracking).length > 0) {
      setChartTracking((prev) => ({ ...prev, ...tracking }));
    }
  }, [goalsWithProgress, chartTracking]);

  // Toggle chart tracking for a goal
  const toggleChartTracking = useCallback((goalId: string) => {
    setChartTracking((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  }, []);

  // Fetch projects for displaying project names
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await projectsApi.getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };

    const fetchClients = async () => {
      try {
        const clientsData = await projectsApi.getClients();
        setClients(clientsData);
      } catch (error) {
        console.error("Failed to fetch clients:", error);
      }
    };

    fetchProjects();
    fetchClients();
  }, []);

  // Helper function to get project name by ID
  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  // Helper function to get client name by ID
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  // Define available colors for goals (constant array)
  const GOAL_COLORS = useMemo(() => 
    ["emerald", "blue", "purple", "orange", "pink", "cyan", "indigo", "rose"],
    []
  );

  // Create stable color mapping based on goal IDs
  const goalColorMap = useMemo(() => {
    const colorMap = new Map<string, string>();
    const timeGoals = goalsWithProgress
      .filter((goal) => goal.type === "time")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Sort by creation date

    timeGoals.forEach((goal, index) => {
      colorMap.set(goal.id, GOAL_COLORS[index % GOAL_COLORS.length]);
    });

    return colorMap;
  }, [goalsWithProgress, GOAL_COLORS]);

  // Helper function to get consistent color for a goal
  const getGoalColor = useCallback((goalId: string): string => {
    return goalColorMap.get(goalId) || "gray";
  }, [goalColorMap]);

  // Calculate date range based on selected time range option
  const getDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    let startDate: Date;
    let endDate: Date = today;

    switch (timeRange) {
      case "30days":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "90days":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "thisyear":
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
        startDate.setHours(0, 0, 0, 0);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Default to last 30 days if custom dates not set
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
        }
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }, [timeRange, customStartDate, customEndDate]);

  const handleEditGoal = (goal: BaseGoal) => {
    onShowCreateModal(true, goal);
  };

  const handleDeleteGoal = async (goal: BaseGoal) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteGoal(goal.id);
      } catch (error) {
        console.error("Failed to delete goal:", error);
        // You might want to show a toast notification here
      }
    }
  };

  // Filter goals based on active filters
  const filteredGoals = useMemo(() => {
    return goalsWithProgress.filter((goalWithProgress) => {
      // Type filter
      if (typeFilter !== "all" && goalWithProgress.type !== typeFilter) {
        return false;
      }

      // Time period filter
      if (activeFilter !== "all") {
        const now = new Date();
        const goalDate =
          goalWithProgress.type === "time"
            ? new Date((goalWithProgress as TimeGoal).endDate)
            : goalWithProgress.type === "revenue"
            ? new Date((goalWithProgress as RevenueGoal).endDate)
            : goalWithProgress.type === "project" &&
              (goalWithProgress as ProjectGoal).targetCompletionDate
            ? new Date((goalWithProgress as ProjectGoal).targetCompletionDate!)
            : null;

        if (!goalDate) return true;

        switch (activeFilter) {
          case "this-week": {
            const weekFromNow = new Date(
              now.getTime() + 7 * 24 * 60 * 60 * 1000
            );
            return goalDate <= weekFromNow;
          }
          case "this-month": {
            const monthFromNow = new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              now.getDate()
            );
            return goalDate <= monthFromNow;
          }
          case "this-quarter": {
            const quarterFromNow = new Date(
              now.getFullYear(),
              now.getMonth() + 3,
              now.getDate()
            );
            return goalDate <= quarterFromNow;
          }
          default:
            return true;
        }
      }

      return true;
    });
  }, [goalsWithProgress, activeFilter, typeFilter]);

  // Separate goals into active and completed
  const activeGoals = filteredGoals.filter(
    (goal) => goal.progress.status !== "completed"
  );
  const completedGoals = filteredGoals.filter(
    (goal) => goal.progress.status === "completed"
  );

  // Helper to calculate progress over time data (shows individual time entries as % of goal progress)
  const getProgressOverTimeData = useMemo(() => {
    const timeGoals = activeGoals.filter(
      (goal) => goal.type === "time" && chartTracking[goal.id] !== false
    );
    if (timeGoals.length === 0) return [];

    // Get data for each time goal
    return timeGoals.map((goal) => {
      const timeGoal = goal as TimeGoal;
      const targetHours = timeGoal.targetHours;

      // Filter time entries based on goal scope
      let relevantEntries = timeEntries;
      if (timeGoal.scope === "project" && timeGoal.scopeId) {
        relevantEntries = timeEntries.filter(
          (entry) => entry.project_id === timeGoal.scopeId
        );
      } else if (timeGoal.scope === "client" && timeGoal.scopeId) {
        // Find projects that belong to this client
        const clientProjects = projects.filter(
          (project) => project.client_id === timeGoal.scopeId
        );
        const clientProjectIds = clientProjects.map((project) => project.id);
        relevantEntries = timeEntries.filter(
          (entry) =>
            entry.project_id && clientProjectIds.includes(entry.project_id)
        );
      }
      // For 'general' scope, use all entries (already set above)

      // Filter entries to only those within the goal's date range
      const goalStartDate = new Date(timeGoal.startDate);
      const goalEndDate = new Date(timeGoal.endDate);
      const entriesInRange = relevantEntries.filter((entry) => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= goalStartDate && entryDate <= goalEndDate;
      });

      // Sort entries by date and create cumulative progress data points
      const sortedEntries = entriesInRange.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      // Group entries by day (YYYY-MM-DD) using local timezone
      const entriesByDay = new Map<string, typeof sortedEntries>();
      for (const entry of sortedEntries) {
        const entryDate = new Date(entry.start_time);
        // Use local date to avoid timezone shifts
        const year = entryDate.getFullYear();
        const month = String(entryDate.getMonth() + 1).padStart(2, "0");
        const day = String(entryDate.getDate()).padStart(2, "0");
        const dayKey = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone

        if (!entriesByDay.has(dayKey)) {
          entriesByDay.set(dayKey, []);
        }
        entriesByDay.get(dayKey)!.push(entry);
      }

      // Create cumulative data points (one per day)
      const dataPoints: Array<{
        date: Date;
        cumulativeHours: number;
        entryHours: number;
        percentage: number;
        goalId: string;
        goalName: string;
        entryId: string | undefined;
        description: string | undefined;
        color: string;
      }> = [];
      let cumulativeHours = 0;

      // Process days in chronological order
      const sortedDays = Array.from(entriesByDay.keys()).sort();

      for (const dayKey of sortedDays) {
        const dayEntries = entriesByDay.get(dayKey)!;

        // Sum all hours for this day
        const dayHours = dayEntries.reduce((sum, entry) => {
          return sum + (entry.duration || 0) / 3600;
        }, 0);

        cumulativeHours += dayHours;
        const progressPercent = Math.min(
          (cumulativeHours / targetHours) * 100,
          100
        );

        // Parse the dayKey (YYYY-MM-DD) and create date at noon in local timezone
        const [year, month, day] = dayKey.split("-").map(Number);
        const dayDate = new Date(year, month - 1, day, 12, 0, 0, 0); // Local timezone, noon

        // Combine descriptions from all entries on this day
        const descriptions = dayEntries
          .map((e) => e.description)
          .filter((d) => d)
          .join(", ");

        dataPoints.push({
          date: dayDate,
          cumulativeHours,
          entryHours: dayHours,
          percentage: progressPercent,
          goalId: goal.id,
          goalName: goal.name,
          entryId: dayEntries[0].id, // Use first entry ID for the day
          description: descriptions || undefined,
          color: getGoalColor(goal.id),
        });
      }

      // Filter data points to only show those within the chart's visible date range
      const { startDate: chartStartDate, endDate: chartEndDate } = getDateRange;
      const visibleDataPoints = dataPoints.filter((point) => {
        return point.date >= chartStartDate && point.date <= chartEndDate;
      });

      // Track if there are points before/after the visible range for line extension
      const hasPointsBefore = dataPoints.some(
        (point) => point.date < chartStartDate
      );
      const hasPointsAfter = dataPoints.some(
        (point) => point.date > chartEndDate
      );
      const lastPointBeforeRange = hasPointsBefore
        ? dataPoints.filter((point) => point.date < chartStartDate).slice(-1)[0]
        : null;

      return {
        goalId: goal.id,
        goalName: goal.name,
        startDate: timeGoal.startDate,
        endDate: timeGoal.endDate,
        targetHours,
        color: getGoalColor(goal.id),
        data: visibleDataPoints,
        hasPointsBefore,
        hasPointsAfter,
        progressAtRangeStart: lastPointBeforeRange?.percentage || 0,
      };
    });
  }, [activeGoals, timeEntries, projects, getDateRange, getGoalColor, chartTracking]);

  const getTimeDistribution = useMemo(() => {
    const timeGoals = activeGoals.filter((goal) => goal.type === "time");
    if (timeGoals.length === 0) {
      // Fallback to last 30 days if no time goals
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentEntries = timeEntries.filter(
        (entry) => new Date(entry.start_time) >= thirtyDaysAgo
      );

      const billable =
        recentEntries
          .filter((entry) => entry.billable)
          .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600;

      const nonBillable =
        recentEntries
          .filter((entry) => !entry.billable)
          .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600;

      const total = billable + nonBillable;
      return {
        billable,
        nonBillable,
        total,
        billablePercentage: total > 0 ? (billable / total) * 100 : 0,
      };
    }

    // Use the first time goal's period
    const timeGoal = timeGoals[0] as TimeGoal;
    const startDate = new Date(timeGoal.startDate || timeGoal.createdAt);
    const endDate = new Date(timeGoal.endDate);

    const goalPeriodEntries = timeEntries.filter((entry) => {
      const entryDate = new Date(entry.start_time);
      return entryDate >= startDate && entryDate <= endDate;
    });

    const billable =
      goalPeriodEntries
        .filter((entry) => entry.billable)
        .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600;

    const nonBillable =
      goalPeriodEntries
        .filter((entry) => !entry.billable)
        .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600;

    const total = billable + nonBillable;
    const billablePercentage = total > 0 ? (billable / total) * 100 : 0;

    return { billable, nonBillable, total, billablePercentage };
  }, [activeGoals, timeEntries]);

  // Ring Chart Component
  const RingChart: React.FC<{
    percentage: number;
    status: string;
    size?: number;
    strokeWidth?: number;
  }> = ({ percentage, status, size = 80, strokeWidth = 6 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={
              status === "overdue"
                ? "#EF4444"
                : status === "completed"
                ? "#22C55E"
                : status === "ahead"
                ? "#10B981"
                : status === "on-track"
                ? "#3B82F6"
                : status === "behind"
                ? "#F59E0B"
                : "#10B981"
            }
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {Math.floor(percentage)}%
          </span>
        </div>
      </div>
    );
  };

  // Trend Indicator Component - minimal icon only
  const TrendIndicator: React.FC<{ status: string }> = ({ status }) => {
    const getTrendIcon = () => {
      if (status === "completed") {
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      }
      if (status === "ahead") {
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      }
      if (status === "behind") {
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      }
      if (status === "overdue") {
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      }
      return <TrendingUp className="h-4 w-4 text-blue-500" />;
    };

    return (
      <div className="flex items-center justify-center w-6 h-6 rounded-full border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
        {getTrendIcon()}
      </div>
    );
  };

  // Helper functions for type-safe goal property access

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-secondary">Loading goals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-primary mb-2">
          Error Loading Goals
        </h3>
        <p className="text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center">
            <Target className="h-8 w-8 mr-3 text-primary" />
            Goals
          </h1>
          <p className="text-secondary mt-1">
            Track your progress toward time, project, and revenue targets
          </p>
        </div>
        
                          
                          <button
                            onClick={() => handleEditGoal(goal)}
                            className="p-1 text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Edit goal"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal)}
                            className="p-1 text-secondary hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Delete goal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <TrendIndicator status={progress.status} />
                        </div>
                      </div>

                      {/* Ring Chart and Key Metrics */}
                      <div className="flex items-center justify-between mb-4">
                        <RingChart
                          percentage={progress.percentage}
                          status={progress.status}
                        />
                        <div className="flex-1 ml-4">
                          <div className="text-sm text-secondary mb-1">
                            {goal.type === "time" && (
                              <>
                                <Timer className="h-3 w-3 inline mr-1" />
                                Hours
                              </>
                            )}
                            {goal.type === "revenue" && (
                              <>
                                <DollarSign className="h-3 w-3 inline mr-1" />
                                Revenue
                              </>
                            )}
                            {goal.type === "project" && (
                              <>
                                <Target className="h-3 w-3 inline mr-1" />
                                Project
                              </>
                            )}
                          </div>
                          <div className="text-lg font-bold text-primary">
                            {goal.type === "time" && (
                              <>
                                {progress.currentValue.toFixed(1)}h /{" "}
                                {(goal as TimeGoal).targetHours}h
                              </>
                            )}
                            {goal.type === "revenue" && (
                              <>
                                ${(goal as RevenueGoal).currentAmount} / $
                                {(goal as RevenueGoal).targetAmount}
                              </>
                            )}
                            {goal.type === "project" && (
                              <>
                                {(goal as ProjectGoal).currentHours.toFixed(1)}h
                                / {(goal as ProjectGoal).targetHours || "N/A"}
                              </>
                            )}
                          </div>
                          {/* Progress Bar */}
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-1000 ${
                                  progress.status === "overdue"
                                    ? "bg-red-500"
                                    : progress.status === "completed"
                                    ? "bg-green-500"
                                    : progress.status === "ahead"
                                    ? "bg-emerald-500"
                                    : progress.status === "on-track"
                                    ? "bg-blue-500"
                                    : "bg-yellow-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    progress.percentage,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Period/Deadline Info */}
                      <div className="flex items-center justify-between text-xs text-secondary mb-3">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {goal.type === "time" && (goal as TimeGoal).period}
                          {goal.type === "revenue" &&
                            (goal as RevenueGoal).period}
                          {goal.type === "project" &&
                            (goal as ProjectGoal).targetCompletionDate &&
                            `Due: ${new Date(
                              (goal as ProjectGoal).targetCompletionDate!
                            ).toLocaleDateString()}`}
                        </div>
                        <div>
                          {progress.daysRemaining &&
                            progress.daysRemaining > 0 && (
                              <span
                                className={
                                  progress.daysRemaining <= 7
                                    ? "text-orange-600 font-medium"
                                    : ""
                                }
                              >
                                {progress.daysRemaining} days left
                              </span>
                            )}
                          {progress.daysRemaining &&
                            progress.daysRemaining <= 0 && (
                              <span className="text-red-600 font-medium">
                                Overdue
                              </span>
                            )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            goal.status
                          )}`}
                        >
                          {goal.status.replace("-", " ").toUpperCase()}
                        </div>
                        <div className="text-xs text-secondary">
                          Priority:{" "}
                          <span className="capitalize font-medium">
                            {goal.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;

