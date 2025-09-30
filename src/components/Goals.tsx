/**
 * Goals Component
 *
 * Main goals management interface with list view and creation modal.
 */

import React from "react";
import {
  Target,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useGoals } from "../hooks/useGoals";
import type { Goal, TimeGoal, RevenueGoal, ProjectGoal } from "../lib/goals";

const Goals: React.FC = () => {
  const { goalsWithProgress, loading, error } = useGoals();

  // Helper functions for type-safe goal property access
  const getTimeGoalHoursRemaining = (goal: Goal): number | null => {
    if (goal.type === "time") {
      const timeGoal = goal as TimeGoal;
      return Math.max(0, timeGoal.targetHours - timeGoal.currentHours);
    }
    return null;
  };

  const getRevenueGoalAmountRemaining = (goal: Goal): number | null => {
    if (goal.type === "revenue") {
      const revenueGoal = goal as RevenueGoal;
      return Math.max(0, revenueGoal.targetAmount - revenueGoal.currentAmount);
    }
    return null;
  };

  const getProjectGoalHoursRemaining = (goal: Goal): number | null => {
    if (goal.type === "project") {
      const projectGoal = goal as ProjectGoal;
      return projectGoal.targetHours
        ? Math.max(0, projectGoal.targetHours - projectGoal.currentHours)
        : null;
    }
    return null;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "paused":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-400" />;
    }
  };

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
        <button onClick={() => {}} className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </button>
      </div>

      {/* Goals Grid */}
      {goalsWithProgress.length === 0 ? (
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
          {goalsWithProgress.map((goalWithProgress) => {
            const { progress, ...goal } = goalWithProgress;
            return (
              <div key={goal.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary text-lg">
                      {goal.name}
                    </h3>
                    {goal.description && (
                      <p className="text-secondary text-sm mt-1">
                        {goal.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(goal.status)}
                  </div>
                </div>

                {/* Progress Bar - Always visible */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-secondary">Progress</span>
                    <span className="font-medium text-primary">
                      {Math.round(progress.percentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out relative"
                      style={{
                        width: `${Math.min(
                          Math.max(progress.percentage, 0),
                          100
                        )}%`,
                        backgroundColor:
                          progress.status === "completed"
                            ? "#10B981"
                            : progress.status === "overdue"
                            ? "#F97316"
                            : progress.status === "ahead"
                            ? "#3B82F6"
                            : progress.percentage > 75
                            ? "#10B981"
                            : progress.percentage > 50
                            ? "#F59E0B"
                            : "#3B82F6",
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-20 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Progress status text and metrics */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary">
                      {progress.status === "on-track"
                        ? "On track"
                        : progress.status === "ahead"
                        ? "Ahead of schedule"
                        : progress.status === "behind"
                        ? "Behind schedule"
                        : progress.status === "completed"
                        ? "Completed"
                        : progress.status === "overdue"
                        ? "Overdue"
                        : "Unknown"}
                    </span>
                    <div className="text-right">
                      {goal.type === "time" &&
                        (() => {
                          const hoursRemaining =
                            getTimeGoalHoursRemaining(goal);
                          return (
                            <>
                              <div className="text-secondary">
                                {hoursRemaining && hoursRemaining > 0
                                  ? `${hoursRemaining.toFixed(1)}h left`
                                  : "Target reached"}
                              </div>
                              {progress.daysRemaining &&
                                progress.daysRemaining > 0 && (
                                  <div className="text-secondary">
                                    {progress.daysRemaining} days left
                                  </div>
                                )}
                              {progress.daysRemaining &&
                                progress.daysRemaining <= 0 &&
                                progress.status === "overdue" && (
                                  <div className="text-secondary">Past due</div>
                                )}
                            </>
                          );
                        })()}
                      {goal.type === "revenue" &&
                        (() => {
                          const amountRemaining =
                            getRevenueGoalAmountRemaining(goal);
                          return (
                            <>
                              <div className="text-secondary">
                                {amountRemaining && amountRemaining > 0
                                  ? `$${amountRemaining} left`
                                  : "Target reached"}
                              </div>
                              {progress.daysRemaining &&
                                progress.daysRemaining > 0 && (
                                  <div className="text-secondary">
                                    {progress.daysRemaining} days left
                                  </div>
                                )}
                              {progress.daysRemaining &&
                                progress.daysRemaining <= 0 &&
                                progress.status === "overdue" && (
                                  <div className="text-secondary">Past due</div>
                                )}
                            </>
                          );
                        })()}
                      {goal.type === "project" &&
                        (() => {
                          const hoursRemaining =
                            getProjectGoalHoursRemaining(goal);
                          return (
                            <>
                              {hoursRemaining && hoursRemaining > 0 && (
                                <div className="text-secondary">
                                  {hoursRemaining.toFixed(1)}h left
                                </div>
                              )}
                              {progress.daysRemaining &&
                                progress.daysRemaining > 0 && (
                                  <div className="text-secondary">
                                    {progress.daysRemaining} days left
                                  </div>
                                )}
                              {progress.daysRemaining &&
                                progress.daysRemaining <= 0 &&
                                progress.status === "overdue" && (
                                  <div className="text-secondary">Past due</div>
                                )}
                            </>
                          );
                        })()}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    goal.status
                  )}`}
                >
                  {goal.status.replace("-", " ").toUpperCase()}
                </div>

                {/* Goal Type & Details */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Type:</span>
                    <span className="font-medium text-primary capitalize">
                      {goal.type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Goals;
