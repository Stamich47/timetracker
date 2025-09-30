/**
 * Goals Context
 *
 * React context for managing goals state across the application.
 */

import React, { createContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import type { Goal } from "../lib/goals";
import type { CreateGoalData, UpdateGoalData } from "../lib/goalsApi";
import { calculateGoalProgress } from "../lib/goals";
import type { GoalProgress } from "../lib/goals";
import { goalsApi } from "../lib/goalsApi";

interface GoalsContextType {
  goals: Goal[];
  goalsWithProgress: (Goal & { progress: GoalProgress })[];
  loading: boolean;
  error: string | null;
  createGoal: (goalData: CreateGoalData) => Promise<Goal>;
  updateGoal: (id: string, updates: UpdateGoalData) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export { GoalsContext };

interface GoalsProviderProps {
  children: ReactNode;
}

export const GoalsProvider: React.FC<GoalsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [goalsWithProgress, setGoalsWithProgress] = useState<
    (Goal & { progress: GoalProgress })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract goals from goalsWithProgress for backward compatibility
  const goals = goalsWithProgress.map((goalWithProgress) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { progress, ...goal } = goalWithProgress;
    return goal;
  });

  const refreshGoals = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const goalsWithRealProgress = await goalsApi.getGoalsWithProgress();
      setGoalsWithProgress(goalsWithRealProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createGoal = async (goalData: CreateGoalData): Promise<Goal> => {
    try {
      const newGoal = await goalsApi.createGoal(goalData);
      // Add the new goal with calculated progress
      const progress = calculateGoalProgress(newGoal);
      const newGoalWithProgress = { ...newGoal, progress };
      setGoalsWithProgress((prev) => [newGoalWithProgress, ...prev]);
      return newGoal;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create goal";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateGoal = async (
    id: string,
    updates: UpdateGoalData
  ): Promise<Goal> => {
    try {
      const updatedGoal = await goalsApi.updateGoal(id, updates);
      // Update the goal with recalculated progress
      const progress = calculateGoalProgress(updatedGoal);
      const updatedGoalWithProgress = { ...updatedGoal, progress };
      setGoalsWithProgress((prev) =>
        prev.map((goalWithProgress) =>
          goalWithProgress.id === id
            ? updatedGoalWithProgress
            : goalWithProgress
        )
      );
      return updatedGoal;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update goal";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteGoal = async (id: string): Promise<void> => {
    try {
      await goalsApi.deleteGoal(id);
      setGoalsWithProgress((prev) =>
        prev.filter((goalWithProgress) => goalWithProgress.id !== id)
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete goal";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Load goals when user changes
  useEffect(() => {
    if (user) {
      refreshGoals();
    } else {
      setGoalsWithProgress([]);
      setError(null);
    }
  }, [user, refreshGoals]);

  const value: GoalsContextType = {
    goals,
    goalsWithProgress,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refreshGoals,
  };

  return (
    <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
  );
};
