/**
 * Goals Context
 *
 * Managing goals state across the application.
 */

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [baseGoalsWithProgress, setBaseGoalsWithProgress] = useState<
    (Goal & { progress: GoalProgress })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate live progress when timer changes, without reloading from database
  const goalsWithProgress = useMemo(() => {
    // Don't add timer time in useMemo - the baseGoalsWithProgress already includes
    // saved time entries from the database. The timer calculation is handled server-side
    // when refreshGoals() is called.
    return baseGoalsWithProgress;
  }, [baseGoalsWithProgress]);

  const refreshGoals = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Get goals with real progress from database
      // Don't pass timer since we're saving timer snapshots as real time entries
      const goalsWithRealProgress = await goalsApi.getGoalsWithProgress();
      setBaseGoalsWithProgress(goalsWithRealProgress);
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
  }, [user]);

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

  // Load goals when user changes (NOT when timer changes - use useMemo for live updates)
  useEffect(() => {
    const loadGoals = async () => {
      if (!user) {
        setGoals([]);
        setBaseGoalsWithProgress([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get goals with real progress from database
        // Don't pass timer since we're saving timer snapshots as real time entries
        const goalsWithRealProgress = await goalsApi.getGoalsWithProgress();
        setBaseGoalsWithProgress(goalsWithRealProgress);
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
  }, [user]);

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
