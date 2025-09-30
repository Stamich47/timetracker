/**
 * Goals API
 *
 * CRUD operations for goal management with Supabase integration.
 */

import { supabase } from "./supabase";
import type { Goal, GoalProgress, TimeGoalPeriod } from "./goals";
import { calculateGoalProgress } from "./goals";

export interface CreateGoalData {
  name: string;
  description?: string;
  type: Goal["type"];
  priority: Goal["priority"];
  color?: string;
  // Type-specific fields
  period?: TimeGoalPeriod;
  targetHours?: number;
  projectId?: string;
  targetCompletionDate?: string;
  targetAmount?: number;
  currency?: string;
  targetDate?: string;
}

export interface UpdateGoalData extends Partial<CreateGoalData> {
  status?: Goal["status"];
}

// Database table structure (for reference)
/*
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('time', 'project', 'revenue')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  target_date TIMESTAMP WITH TIME ZONE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  color TEXT,

  -- Time goal fields
  period TEXT CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  target_hours DECIMAL,
  current_hours DECIMAL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Project goal fields
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  target_completion_date TIMESTAMP WITH TIME ZONE,
  estimated_hours_remaining DECIMAL,
  completion_percentage DECIMAL DEFAULT 0,

  -- Revenue goal fields
  target_amount DECIMAL,
  current_amount DECIMAL DEFAULT 0,
  currency TEXT DEFAULT 'USD'
);
*/

class GoalsApi {
  /**
   * Get all goals for the current user
   */
  async getGoals(): Promise<Goal[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(this.transformFromDb);
  }

  /**
   * Get a single goal by ID
   */
  async getGoal(id: string): Promise<Goal | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return this.transformFromDb(data);
  }

  /**
   * Create a new goal
   */
  async createGoal(goalData: CreateGoalData): Promise<Goal> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const dbData = this.transformToDb(goalData, user.id);

    const { data, error } = await supabase
      .from("goals")
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    return this.transformFromDb(data);
  }

  /**
   * Update an existing goal
   */
  async updateGoal(id: string, updates: UpdateGoalData): Promise<Goal> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const dbUpdates = this.transformToDb(updates);

    const { data, error } = await supabase
      .from("goals")
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return this.transformFromDb(data);
  }

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  }

  /**
   * Get goals with progress calculations
   */
  async getGoalsWithProgress(): Promise<(Goal & { progress: GoalProgress })[]> {
    const goals = await this.getGoals();

    return goals.map((goal) => ({
      ...goal,
      progress: calculateGoalProgress(goal),
    }));
  }

  /**
   * Update goal progress (called when time entries or projects change)
   */
  async updateGoalProgress(id: string): Promise<Goal> {
    const goal = await this.getGoal(id);
    if (!goal) throw new Error("Goal not found");

    // Progress is calculated on-demand, no need to update status here
    // Status updates should be handled by the UI based on progress calculations
    return goal;
  }

  /**
   * Transform database row to Goal object
   */
  private transformFromDb(dbRow: GoalDbRow): Goal {
    const baseGoal = {
      id: dbRow.id,
      name: dbRow.name,
      description: dbRow.description,
      type: dbRow.type,
      status: dbRow.status,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
      targetDate: dbRow.target_date,
      priority: dbRow.priority,
      color: dbRow.color,
    };

    switch (dbRow.type) {
      case "time":
        return {
          ...baseGoal,
          type: "time",
          period: dbRow.period,
          targetHours: dbRow.target_hours || 0,
          currentHours: dbRow.current_hours || 0,
          startDate: dbRow.start_date,
          endDate: dbRow.end_date,
        } as Goal;

      case "project":
        return {
          ...baseGoal,
          type: "project",
          projectId: dbRow.project_id,
          targetHours: dbRow.target_hours,
          targetCompletionDate: dbRow.target_completion_date,
          currentHours: dbRow.current_hours || 0,
          estimatedHoursRemaining: dbRow.estimated_hours_remaining,
          completionPercentage: dbRow.completion_percentage || 0,
        } as Goal;

      case "revenue":
        return {
          ...baseGoal,
          type: "revenue",
          period: dbRow.period,
          targetAmount: dbRow.target_amount || 0,
          currentAmount: dbRow.current_amount || 0,
          currency: dbRow.currency || "USD",
          startDate: dbRow.start_date,
          endDate: dbRow.end_date,
        } as Goal;

      default:
        throw new Error(`Unknown goal type: ${dbRow.type}`);
    }
  }

  /**
   * Transform Goal object to database format
   */
  private transformToDb(
    goal: Partial<CreateGoalData>,
    userId?: string
  ): GoalDbData {
    const dbData: GoalDbData = {
      user_id: userId,
      name: goal.name,
      description: goal.description,
      type: goal.type,
      priority: goal.priority || "medium",
      color: goal.color,
    };

    if (goal.type === "time") {
      dbData.period = goal.period;
      dbData.target_hours = goal.targetHours;
      // start_date and end_date will be calculated based on period
    }

    if (goal.type === "project") {
      dbData.project_id = goal.projectId;
      dbData.target_hours = goal.targetHours;
      dbData.target_completion_date = goal.targetCompletionDate;
    }

    if (goal.type === "revenue") {
      dbData.period = goal.period;
      dbData.target_amount = goal.targetAmount;
      dbData.currency = goal.currency || "USD";
      // start_date and end_date will be calculated based on period
    }

    if (goal.targetDate) {
      dbData.target_date = goal.targetDate;
    }

    return dbData;
  }
}

export const goalsApi = new GoalsApi();

// Database row type
interface GoalDbRow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: Goal["type"];
  status: Goal["status"];
  created_at: string;
  updated_at: string;
  target_date?: string;
  priority: Goal["priority"];
  color?: string;
  period?: TimeGoalPeriod;
  target_hours?: number;
  current_hours?: number;
  start_date?: string;
  end_date?: string;
  project_id?: string;
  target_completion_date?: string;
  estimated_hours_remaining?: number;
  completion_percentage?: number;
  target_amount?: number;
  current_amount?: number;
  currency?: string;
}

// Database insert/update type
interface GoalDbData {
  user_id?: string;
  name?: string;
  description?: string;
  type?: Goal["type"];
  status?: Goal["status"];
  updated_at?: string;
  target_date?: string;
  priority?: Goal["priority"];
  color?: string;
  period?: TimeGoalPeriod;
  target_hours?: number;
  current_hours?: number;
  start_date?: string;
  end_date?: string;
  project_id?: string;
  target_completion_date?: string;
  estimated_hours_remaining?: number;
  completion_percentage?: number;
  target_amount?: number;
  current_amount?: number;
  currency?: string;
}
