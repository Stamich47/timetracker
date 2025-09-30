/**
 * Goals Component
 *
 * Main goals management interface with list view and creation modal.
 */

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { useGoals } from "../hooks/useGoals";
import type { TimeGoal, RevenueGoal, ProjectGoal } from "../lib/goals";
import GoalCreationModal from "./GoalCreationModal";

const Goals: React.FC = () => {
  const { goalsWithProgress, loading, error } = useGoals();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      if (status === "behind" || status === "overdue") {
        return <TrendingDown className="h-4 w-4 text-red-500" />;
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
          onClick={() => setShowCreateModal(true)}
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
          </h3>
          <select className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-secondary">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
        </div>
        <div className="h-64 flex items-end justify-between space-x-1">
          {/* Mock progress data - replace with real data later */}
          {[20, 35, 28, 45, 52, 48, 65, 72, 68, 78, 85, 82, 90, 95, 98].map(
            (value, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-emerald-500 rounded-t transition-all duration-500 hover:bg-emerald-600"
                  style={{ height: `${value}%` }}
                ></div>
                <span className="text-xs text-secondary mt-1">{index + 1}</span>
              </div>
            )
          )}
        </div>
        <div className="flex justify-between text-xs text-secondary mt-2">
          <span>Goal Progress (%)</span>
          <span>Days</span>
        </div>
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
                  strokeDasharray={`${2 * Math.PI * 50 * 0.6} ${
                    2 * Math.PI * 50 * 0.4
                  }`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">60%</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Billable Hours</span>
              <span className="text-primary">120h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Non-billable</span>
              <span className="text-primary">80h</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGoals.map((goalWithProgress) => {
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
                    {goal.description && (
                      <p className="text-secondary text-sm mt-1 line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
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
                          {(goal as TimeGoal).currentHours.toFixed(1)}h /{" "}
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
                          {(goal as ProjectGoal).currentHours.toFixed(1)}h /{" "}
                          {(goal as ProjectGoal).targetHours || "N/A"}
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
                            width: `${Math.min(progress.percentage, 100)}%`,
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
                    {goal.type === "revenue" && (goal as RevenueGoal).period}
                    {goal.type === "project" &&
                      (goal as ProjectGoal).targetCompletionDate &&
                      `Due: ${new Date(
                        (goal as ProjectGoal).targetCompletionDate!
                      ).toLocaleDateString()}`}
                  </div>
                  <div>
                    {progress.daysRemaining && progress.daysRemaining > 0 && (
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
                    {progress.daysRemaining && progress.daysRemaining <= 0 && (
                      <span className="text-red-600 font-medium">Overdue</span>
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

      {/* Goal Creation Modal */}
      <GoalCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default Goals;
