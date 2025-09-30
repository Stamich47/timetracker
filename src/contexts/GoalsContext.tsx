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
import { loadMockGoals, saveMockGoals } from "../test-data/mockGoals";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate goals with progress
  const goalsWithProgress = goals.map((goal) => ({
    ...goal,
    progress: calculateGoalProgress(goal),
  }));

  const refreshGoals = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // TEMPORARY: Use mock data for testing until database is set up
      const mockGoals = loadMockGoals();
      setGoals(mockGoals);

      // TODO: Replace with actual API call when database is ready
      // const fetchedGoals = await goalsApi.getGoals();
      // setGoals(fetchedGoals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createGoal = async (goalData: CreateGoalData): Promise<Goal> => {
    try {
      // TEMPORARY: Mock goal creation for testing
      const baseGoal = {
        id: `goal-${Date.now()}`,
        name: goalData.name,
        description: goalData.description,
        type: goalData.type,
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: goalData.priority || "medium",
        color: goalData.color,
      };

      let newGoal: Goal;

      if (goalData.type === "time") {
        newGoal = {
          ...baseGoal,
          type: "time",
          period: goalData.period!,
          targetHours: goalData.targetHours!,
          currentHours: 0,
          startDate: new Date().toISOString(),
          endDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        };
      } else if (goalData.type === "project") {
        newGoal = {
          ...baseGoal,
          type: "project",
          projectId: goalData.projectId!,
          targetHours: goalData.targetHours,
          targetCompletionDate: goalData.targetCompletionDate,
          currentHours: 0,
          completionPercentage: 0,
        };
      } else {
        newGoal = {
          ...baseGoal,
          type: "revenue",
          period: goalData.period!,
          targetAmount: goalData.targetAmount!,
          currentAmount: 0,
          currency: goalData.currency || "USD",
          startDate: new Date().toISOString(),
          endDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        };
      }

      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      saveMockGoals(updatedGoals);

      return newGoal;

      // TODO: Replace with actual API call when database is ready
      // const newGoal = await goalsApi.createGoal(goalData);
      // setGoals(prev => [newGoal, ...prev]);
      // return newGoal;
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
      // TEMPORARY: Mock goal update for testing
      const existingGoal = goals.find((g) => g.id === id);
      if (!existingGoal) throw new Error("Goal not found");

      const updatedGoal = {
        ...existingGoal,
        ...updates,
        updatedAt: new Date().toISOString(),
      } as Goal;
      const updatedGoals = goals.map((goal) =>
        goal.id === id ? updatedGoal : goal
      );
      setGoals(updatedGoals);
      saveMockGoals(updatedGoals);

      return updatedGoal;

      // TODO: Replace with actual API call when database is ready
      // const updatedGoal = await goalsApi.updateGoal(id, updates);
      // setGoals(prev => prev.map(goal =>
      //   goal.id === id ? updatedGoal : goal
      // ));
      // return updatedGoal;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update goal";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteGoal = async (id: string): Promise<void> => {
    try {
      // TEMPORARY: Mock goal deletion for testing
      const updatedGoals = goals.filter((goal) => goal.id !== id);
      setGoals(updatedGoals);
      saveMockGoals(updatedGoals);

      // TODO: Replace with actual API call when database is ready
      // await goalsApi.deleteGoal(id);
      // setGoals(prev => prev.filter(goal => goal.id !== id));
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
      setGoals([]);
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
