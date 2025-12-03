/**
 * Goaimport type { Goal } from "../lib/goals";
import type { CreateGoalData, UpdateGoalData } from "../lib/goalsApi";
import { calculateGoalProgress } from "../lib/goals";
import type { GoalProgress } from "../lib/goals";
import { goalsApi } from "../lib/goalsApi";ontext
 *
 * Managing goals state across the application.
 */

import React, { createContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTimer } from "../hooks/useTimer";
import type { Goal } from "../lib/goals";
import type { CreateGoalData, UpdateGoalData } from "../lib/goalsApi";
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
  const { timer } = useTimer();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsWithProgress, setGoalsWithProgress] = useState<
    (Goal & { progress: GoalProgress })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGoals = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Get goals with real progress from database
      const goalsWithRealProgress = await goalsApi.getGoalsWithProgress(timer);
      setGoalsWithProgress(goalsWithRealProgress);
      // Extract goals from the response for backward compatibility
      const goalsOnly = goalsWithRealProgress.map((goalWithProgress) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { progress, ...goal } = goalWithProgress;
        return goal;
      });
      setGoals(goalsOnly);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [user, timer]);

  const createGoal = async (goalData: CreateGoalData): Promise<Goal> => {
    try {
      const newGoal = await goalsApi.createGoal(goalData);
      // Refresh goals to get updated progress
      await refreshGoals();
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
      // Refresh goals to get updated progress
      await refreshGoals();
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
      // Refresh goals to get updated progress
      await refreshGoals();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete goal";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Load goals when user changes
  useEffect(() => {
    const loadGoals = async () => {
      if (!user) {
        setGoals([]);
        setGoalsWithProgress([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get goals with real progress from database
        const goalsWithRealProgress = await goalsApi.getGoalsWithProgress(
          timer
        );
        setGoalsWithProgress(goalsWithRealProgress);
        // Extract goals from the response for backward compatibility
        const goalsOnly = goalsWithRealProgress.map((goalWithProgress) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { progress, ...goal } = goalWithProgress;
          return goal;
        });
        setGoals(goalsOnly);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load goals");
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [user, timer]); // Include timer in dependency to update when timer changes

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
