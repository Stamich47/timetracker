/**
 * Goals Component
 *
 * Main goals management interface with list view and creation modal.
 */

import React, { useState, useMemo, useEffect } from "react";
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
  Bug,
} from "lucide-react";
import { useGoals } from "../hooks/useGoals";
import { useTimeEntries } from "../hooks/useTimeEntries";
import { projectsApi } from "../lib/projectsApi";
import { timeEntriesApi } from "../lib/timeEntriesApi";
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

  const { deleteGoal } = useGoals();

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

  const handleDebugGoal = async (goal: BaseGoal) => {
    console.log("=== GOAL DEBUG INFO ===");
    console.log("Goal:", goal);

    if (goal.type === "time") {
      const timeGoal = goal as TimeGoal;
      console.log("Goal Type: Time/Productivity Goal");
      console.log("Date Range:", {
        startDate: timeGoal.startDate,
        endDate: timeGoal.endDate,
        period: timeGoal.period,
      });
      console.log("Target Hours:", timeGoal.targetHours);
      console.log("Scope:", timeGoal.scope);

      // Fetch time entries for the goal's date range
      try {
        const entries = await timeEntriesApi.getTimeEntriesForRange(
          timeGoal.startDate,
          timeGoal.endDate
        );

        console.log(
          "All time entries in date range:",
          entries.length,
          "entries"
        );
        console.log("Raw time entries:", entries);

        // Filter entries based on goal scope
        let filteredEntries = entries;
        if (timeGoal.scope === "project" && timeGoal.scopeId) {
          filteredEntries = entries.filter(
            (entry) => entry.project_id === timeGoal.scopeId
          );
          console.log(
            `Filtered for project "${getProjectName(timeGoal.scopeId!)}":`,
            filteredEntries.length,
            "entries"
          );
        } else if (timeGoal.scope === "client" && timeGoal.scopeId) {
          // Find projects that belong to this client
          const clientProjects = projects.filter(
            (project) => project.client_id === timeGoal.scopeId
          );
          const clientProjectIds = clientProjects.map((project) => project.id);
          filteredEntries = entries.filter(
            (entry) =>
              entry.project_id && clientProjectIds.includes(entry.project_id)
          );
          console.log(
            `Filtered for client "${getClientName(timeGoal.scopeId!)}":`,
            filteredEntries.length,
            "entries"
          );
        } else {
          // General scope - all entries
          console.log(
            "General scope - using all entries:",
            filteredEntries.length,
            "entries"
          );
        }

        console.log("Filtered time entries for this goal:", filteredEntries);

        // Calculate total hours from filtered entries
        const totalHours = filteredEntries.reduce((sum, entry) => {
          return sum + (entry.duration || 0) / 3600;
        }, 0);
        console.log(
          "Total hours from filtered entries:",
          totalHours.toFixed(2),
          "hours"
        );
      } catch (error) {
        console.error("Error fetching time entries:", error);
      }
    } else {
      console.log("Goal Type: Non-time goal (revenue or project)");
      console.log(
        "This debug function is designed for time/productivity goals"
      );
    }

    console.log("=== END GOAL DEBUG ===");
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
    const timeGoals = activeGoals.filter((goal) => goal.type === "time");
    if (timeGoals.length === 0) return [];

    // Get data for each time goal
    return timeGoals.map((goal, goalIndex) => {
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

      // Create data points for each individual time entry
      const dataPoints = entriesInRange.map((entry) => {
        const entryDate = new Date(entry.start_time);
        const entryHours = (entry.duration || 0) / 3600;
        const progressPercent = (entryHours / targetHours) * 100;

        return {
          date: entryDate,
          hours: entryHours,
          percentage: progressPercent,
          goalId: goal.id,
          goalName: goal.name,
          entryId: entry.id,
          description: entry.description,
          color:
            goalIndex === 0
              ? "emerald"
              : goalIndex === 1
              ? "blue"
              : goalIndex === 2
              ? "purple"
              : "gray",
        };
      });

      return {
        goalId: goal.id,
        goalName: goal.name,
        startDate: timeGoal.startDate,
        endDate: timeGoal.endDate,
        targetHours,
        color:
          goalIndex === 0
            ? "emerald"
            : goalIndex === 1
            ? "blue"
            : goalIndex === 2
            ? "purple"
            : "gray",
        data: dataPoints,
      };
    });
  }, [activeGoals, timeEntries, projects]);

  const getDotColorClass = (color: string) => {
    switch (color) {
      case "emerald":
        return "bg-emerald-500";
      case "blue":
        return "bg-blue-500";
      case "purple":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };
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
          onClick={() => onShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter className="h-4 w-4 text-secondary" />
        <span className="text-sm text-secondary mr-2">Filter:</span>

        {/* Time Period Filters */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              activeFilter === "all"
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-gray-800 text-secondary border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("this-week")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              activeFilter === "this-week"
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-gray-800 text-secondary border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setActiveFilter("this-month")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              activeFilter === "this-month"
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-gray-800 text-secondary border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setActiveFilter("this-quarter")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              activeFilter === "this-quarter"
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-gray-800 text-secondary border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            This Quarter
          </button>
        </div>

        {/* Type Filters */}
        <div className="flex gap-1 ml-4">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              typeFilter === "all"
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white dark:bg-gray-800 text-secondary border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setTypeFilter("time")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              typeFilter === "time"
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white dark:bg-gray-800 text-secondary border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Time
          </button>
          <button
            onClick={() => setTypeFilter("revenue")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              typeFilter === "revenue"
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white dark:bg-gray-800 text-secondary border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => setTypeFilter("project")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              typeFilter === "project"
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white dark:bg-gray-800 text-secondary border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Project
          </button>
        </div>
      </div>

      {/* Progress Over Time Chart */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary flex items-center">
            <LineChart className="h-5 w-5 mr-2" />
            Progress Over Time
            {getProgressOverTimeData.length === 1 && (
              <span className="text-sm font-normal ml-2">
                (
                {new Date(
                  getProgressOverTimeData[0].startDate
                ).toLocaleDateString()}{" "}
                -{" "}
                {new Date(
                  getProgressOverTimeData[0].endDate
                ).toLocaleDateString()}
                )
              </span>
            )}
            {getProgressOverTimeData.length > 1 && (
              <span className="text-sm font-normal ml-2">(Multiple Goals)</span>
            )}
          </h3>
        </div>
        <div className="flex">
          {/* Y-axis */}
          <div
            className="flex flex-col justify-between pr-2 text-xs text-secondary"
            style={{ height: "256px" }}
          >
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          {/* Chart area */}
          <div className="flex-1">
            {/* Chart area with individual time entries as points */}
            <div className="h-64 relative mb-2">
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="border-t border-gray-200 dark:border-gray-700 w-full"></div>
                <div className="border-t border-gray-200 dark:border-gray-700 w-full"></div>
                <div className="border-t border-gray-200 dark:border-gray-700 w-full"></div>
                <div className="border-t border-gray-200 dark:border-gray-700 w-full"></div>
                <div className="border-t border-gray-200 dark:border-gray-700 w-full"></div>
              </div>

              {getProgressOverTimeData.length > 0 &&
              getProgressOverTimeData.some(
                (goalData) => goalData.data.length > 0
              ) ? (
                <div className="relative h-full">
                  {getProgressOverTimeData.map((goalData) =>
                    goalData.data.map((entryData, index) => {
                      // Calculate position based on date within the range
                      const startDate = new Date(2025, 10, 3); // November 3, 2025
                      const endDate = new Date(2025, 11, 3); // December 3, 2025
                      const totalRange =
                        endDate.getTime() - startDate.getTime();
                      const entryPosition =
                        (entryData.date.getTime() - startDate.getTime()) /
                        totalRange;
                      const leftPosition = Math.max(
                        0,
                        Math.min(100, entryPosition * 100)
                      );

                      return (
                        <div
                          key={`${goalData.goalId}-${
                            entryData.entryId || index
                          }`}
                          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-sm"
                          style={{
                            left: `${leftPosition}%`,
                            bottom: `${entryData.percentage}%`,
                            backgroundColor:
                              entryData.color === "emerald"
                                ? "#10b981"
                                : entryData.color === "blue"
                                ? "#3b82f6"
                                : entryData.color === "purple"
                                ? "#8b5cf6"
                                : "#6b7280",
                            transform: "translateX(-50%) translateY(50%)", // Center the dot
                          }}
                          title={`${entryData.hours.toFixed(
                            1
                          )}h (${entryData.percentage.toFixed(1)}% of goal) - ${
                            entryData.description || "No description"
                          } on ${entryData.date.toLocaleDateString()} (${
                            goalData.goalName
                          })`}
                        ></div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-secondary">
                  No time entries found for this goal in the date range
                </div>
              )}
            </div>

            {/* X-axis labels - show key dates in the range */}
            <div className="flex justify-between space-x-1 pl-1">
              <div className="flex flex-col items-center flex-1">
                <span className="text-xs text-secondary">Nov 3</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <span className="text-xs text-secondary">Nov 10</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <span className="text-xs text-secondary">Nov 17</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <span className="text-xs text-secondary">Nov 24</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <span className="text-xs text-secondary">Dec 1</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <span className="text-xs text-secondary">Dec 3</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-secondary mt-2 pl-6">
          <span></span>
          <span>
            {getProgressOverTimeData.length === 1
              ? `${new Date(
                  getProgressOverTimeData[0].startDate
                ).toLocaleDateString()} - ${new Date(
                  getProgressOverTimeData[0].endDate
                ).toLocaleDateString()}`
              : getProgressOverTimeData.length > 1
              ? "Multiple Goals"
              : "Nov 3 - Dec 3, 2025"}
          </span>
        </div>
        {getProgressOverTimeData.length > 0 && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {getProgressOverTimeData.map((goalData) => (
                <div
                  key={goalData.goalId}
                  className="flex items-center space-x-2"
                >
                  <div
                    className={`w-3 h-3 ${getDotColorClass(
                      goalData.color
                    )} rounded`}
                  ></div>
                  <span className="text-sm text-secondary">
                    {goalData.goalName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pacing Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Expected vs Actual Progress
          </h3>
          <div className="space-y-4">
            {filteredGoals.slice(0, 3).map((goalWithProgress) => {
              const { progress, ...goal } = goalWithProgress;
              const expectedProgress = Math.min(
                100,
                progress.daysRemaining
                  ? Math.max(0, 100 - (progress.daysRemaining / 30) * 100)
                  : 50
              );

              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary truncate">{goal.name}</span>
                    <span className="text-primary font-medium">
                      {progress.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <div
                      className="h-3 bg-green-200 dark:bg-green-800 rounded"
                      style={{ width: `${expectedProgress}%` }}
                    ></div>
                    <div
                      className={`h-3 rounded ${
                        progress.status === "overdue"
                          ? "bg-red-500"
                          : progress.status === "ahead"
                          ? "bg-emerald-500"
                          : progress.status === "on-track"
                          ? "bg-blue-500"
                          : "bg-yellow-500"
                      }`}
                      style={{
                        width: `${Math.abs(
                          progress.percentage - expectedProgress
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-secondary">
                    <span>Expected</span>
                    <span>Actual</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Time Distribution
          </h3>
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <svg width="120" height="120" className="transform -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#E5E7EB"
                  strokeWidth="20"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#3B82F6"
                  strokeWidth="20"
                  fill="none"
                  strokeDasharray={`${
                    2 *
                    Math.PI *
                    50 *
                    (getTimeDistribution.billable /
                      Math.max(getTimeDistribution.total, 1))
                  } ${
                    2 *
                    Math.PI *
                    50 *
                    (getTimeDistribution.nonBillable /
                      Math.max(getTimeDistribution.total, 1))
                  }`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {Math.round(getTimeDistribution.billablePercentage)}%
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Billable Hours</span>
              <span className="text-primary">
                {getTimeDistribution.billable.toFixed(1)}h
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Non-billable</span>
              <span className="text-primary">
                {getTimeDistribution.nonBillable.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>
      </div>

      {filteredGoals.length === 0 ? (
        <div className="card p-12 text-center">
          <Target className="h-16 w-16 text-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-primary mb-2">
            No Goals Yet
          </h3>
          <p className="text-secondary mb-6">
            Create your first goal to start tracking your progress and achieving
            your targets.
          </p>
          <button onClick={() => {}} className="btn-primary">
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Goals Section */}
          <div>
            <h2 className="text-xl font-semibold text-primary mb-4 flex items-center">
              <Target className="h-6 w-6 mr-2" />
              Active Goals ({activeGoals.length})
            </h2>
            {activeGoals.length === 0 ? (
              <div className="card p-8 text-center">
                <Target className="h-12 w-12 text-secondary mx-auto mb-3" />
                <p className="text-secondary">No active goals</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeGoals.map((goalWithProgress) => {
                  const { progress, ...goal } = goalWithProgress;
                  return (
                    <div
                      key={goal.id}
                      className="card p-6 hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-primary text-lg leading-tight">
                            {goal.name}
                          </h3>
                          {/* Show scope information for productivity goals */}
                          {goal.type === "time" ? (
                            <div className="text-secondary text-sm mt-1 space-y-1">
                              <p className="flex items-center">
                                {(goal as TimeGoal).scope === "client" &&
                                  (goal as TimeGoal).scopeId && (
                                    <>
                                      <Building className="h-3 w-3 mr-1" />
                                      Client:{" "}
                                      {getClientName(
                                        (goal as TimeGoal).scopeId!
                                      )}
                                    </>
                                  )}
                                {(goal as TimeGoal).scope === "project" &&
                                  (goal as TimeGoal).scopeId && (
                                    <>
                                      <Target className="h-3 w-3 mr-1" />
                                      {getProjectName(
                                        (goal as TimeGoal).scopeId!
                                      )}
                                    </>
                                  )}
                                {((goal as TimeGoal).scope === "general" ||
                                  !(goal as TimeGoal).scope) && (
                                  <>
                                    <Globe className="h-3 w-3 mr-1" />
                                    All Hours
                                  </>
                                )}
                              </p>
                              <p className="flex items-center text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(
                                  (goal as TimeGoal).startDate
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(
                                  (goal as TimeGoal).endDate
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            goal.description && (
                              <p className="text-secondary text-sm mt-1 line-clamp-2">
                                {goal.description}
                              </p>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleDebugGoal(goal)}
                            className="p-1 text-secondary hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Debug goal data"
                          >
                            <Bug className="h-4 w-4" />
                          </button>
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

          {/* Completed Goals Section */}
          <div>
            <h2 className="text-xl font-semibold text-primary mb-4 flex items-center">
              <CheckCircle className="h-6 w-6 mr-2 text-green-500" />
              Completed Goals ({completedGoals.length})
            </h2>
            {completedGoals.length === 0 ? (
              <div className="card p-8 text-center">
                <CheckCircle className="h-12 w-12 text-secondary mx-auto mb-3" />
                <p className="text-secondary">No completed goals yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {completedGoals.map((goalWithProgress) => {
                  const { progress, ...goal } = goalWithProgress;
                  return (
                    <div
                      key={goal.id}
                      className="card p-6 hover:shadow-lg transition-shadow duration-200 opacity-75"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-primary text-lg leading-tight">
                            {goal.name}
                          </h3>
                          {/* Show scope information for productivity goals */}
                          {goal.type === "time" ? (
                            <div className="text-secondary text-sm mt-1 space-y-1">
                              <p className="flex items-center">
                                {(goal as TimeGoal).scope === "client" &&
                                  (goal as TimeGoal).scopeId && (
                                    <>
                                      <Building className="h-3 w-3 mr-1" />
                                      Client:{" "}
                                      {getClientName(
                                        (goal as TimeGoal).scopeId!
                                      )}
                                    </>
                                  )}
                                {(goal as TimeGoal).scope === "project" &&
                                  (goal as TimeGoal).scopeId && (
                                    <>
                                      <Target className="h-3 w-3 mr-1" />
                                      {getProjectName(
                                        (goal as TimeGoal).scopeId!
                                      )}
                                    </>
                                  )}
                                {((goal as TimeGoal).scope === "general" ||
                                  !(goal as TimeGoal).scope) && (
                                  <>
                                    <Globe className="h-3 w-3 mr-1" />
                                    All Hours
                                  </>
                                )}
                              </p>
                              <p className="flex items-center text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(
                                  (goal as TimeGoal).startDate
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(
                                  (goal as TimeGoal).endDate
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            goal.description && (
                              <p className="text-secondary text-sm mt-1 line-clamp-2">
                                {goal.description}
                              </p>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleDebugGoal(goal)}
                            className="p-1 text-secondary hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Debug goal data"
                          >
                            <Bug className="h-4 w-4" />
                          </button>
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
