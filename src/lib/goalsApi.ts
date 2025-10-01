/**
 * Goals API
 *
 * CRUD operations for goal management with Supabase integration.
 */

import { supabase } from "./supabase";
import { getUserIdWithFallback } from "./auth-utils";
import type {
  Goal,
  GoalProgress,
  TimeGoalPeriod,
  TimeGoal,
  ProjectGoal,
  RevenueGoal,
} from "./goals";
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
  startDate?: string;
  endDate?: string;
  // New scope fields for time goals
  scope?: "client" | "project" | "general";
  scopeId?: string;
}

export interface UpdateGoalData extends Partial<CreateGoalData> {
  status?: Goal["status"];
  currentHours?: number;
  currentAmount?: number;
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
  period TEXT CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  target_hours DECIMAL,
  current_hours DECIMAL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  scope TEXT CHECK (scope IN ('client', 'project', 'general')),
  scope_id UUID,

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
   * Get goals with real-time progress calculations from time entries
   */
  async getGoalsWithProgress(): Promise<(Goal & { progress: GoalProgress })[]> {
    const goals = await this.getGoals();

    // Calculate real progress for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const realProgress = await this.calculateRealGoalProgress(goal);
        return {
          ...goal,
          progress: realProgress,
        };
      })
    );

    return goalsWithProgress;
  }

  /**
   * Calculate real-time progress for a goal by querying time entries
   */
  private async calculateRealGoalProgress(goal: Goal): Promise<GoalProgress> {
    const userId = await getUserIdWithFallback();

    switch (goal.type) {
      case "time":
        return await this.calculateTimeGoalProgress(goal as TimeGoal, userId);

      case "project":
        return await this.calculateProjectGoalProgress(
          goal as ProjectGoal,
          userId
        );

      case "revenue":
        return await this.calculateRevenueGoalProgress(
          goal as RevenueGoal,
          userId
        );

      default:
        return calculateGoalProgress(goal);
    }
  }

  /**
   * Calculate real progress for time goals by summing time entries
   */
  private async calculateTimeGoalProgress(
    goal: TimeGoal,
    userId: string
  ): Promise<GoalProgress> {
    try {
      // Build query for time entries within the goal period
      let query = supabase
        .from("time_entries")
        .select("duration, project_id")
        .eq("user_id", userId)
        .gte("start_time", goal.startDate)
        .lte("start_time", goal.endDate)
        .not("duration", "is", null);

      // Apply scope filtering
      if (goal.scope === "project" && goal.scopeId) {
        // Filter by specific project
        query = query.eq("project_id", goal.scopeId);
      } else if (goal.scope === "client" && goal.scopeId) {
        // Filter by projects belonging to specific client
        // First get all projects for this client
        const { data: clientProjects, error: projectsError } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", userId)
          .eq("client_id", goal.scopeId);

        if (projectsError) throw projectsError;

        const projectIds = clientProjects?.map((p) => p.id) || [];
        if (projectIds.length > 0) {
          query = query.in("project_id", projectIds);
        } else {
          // No projects for this client, return zero progress
          const realGoal = { ...goal, currentHours: 0 };
          return calculateGoalProgress(realGoal);
        }
      }
      // For "general" scope or legacy goals, no additional filtering needed

      const { data: timeEntries, error } = await query;

      if (error) throw error;

      // Sum up all durations (in seconds) and convert to hours
      const totalSeconds = (timeEntries || []).reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      );
      const currentHours = totalSeconds / 3600; // Convert seconds to hours

      // Update the goal's current hours in database if different
      if (Math.abs(currentHours - (goal.currentHours || 0)) > 0.01) {
        await this.updateGoal(goal.id, { currentHours });
      }

      // Calculate progress using the real current hours
      const realGoal = { ...goal, currentHours };
      return calculateGoalProgress(realGoal);
    } catch (error) {
      console.error("Error calculating time goal progress:", error);
      // Fallback to stored progress
      return calculateGoalProgress(goal);
    }
  }

  /**
   * Calculate real progress for project goals by summing time entries for the project
   */
  private async calculateProjectGoalProgress(
    goal: ProjectGoal,
    userId: string
  ): Promise<GoalProgress> {
    try {
      // Query time entries for this project
      const { data: timeEntries, error } = await supabase
        .from("time_entries")
        .select("duration")
        .eq("user_id", userId)
        .eq("project_id", goal.projectId)
        .not("duration", "is", null);

      if (error) throw error;

      // Sum up all durations (in seconds) and convert to hours
      const totalSeconds = (timeEntries || []).reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      );
      const currentHours = totalSeconds / 3600; // Convert seconds to hours

      // Update the goal's current hours in database if different
      if (Math.abs(currentHours - (goal.currentHours || 0)) > 0.01) {
        await this.updateGoal(goal.id, { currentHours });
      }

      // Calculate progress using the real current hours
      const realGoal = { ...goal, currentHours };
      return calculateGoalProgress(realGoal);
    } catch (error) {
      console.error("Error calculating project goal progress:", error);
      // Fallback to stored progress
      return calculateGoalProgress(goal);
    }
  }

  /**
   * Calculate real progress for revenue goals by summing billable amounts
   */
  private async calculateRevenueGoalProgress(
    goal: RevenueGoal,
    userId: string
  ): Promise<GoalProgress> {
    try {
      // Query time entries within the goal period with hourly rates
      const { data: timeEntries, error } = await supabase
        .from("time_entries")
        .select("duration, hourly_rate, billable")
        .eq("user_id", userId)
        .eq("billable", true)
        .gte("start_time", goal.startDate)
        .lte("start_time", goal.endDate)
        .not("duration", "is", null)
        .not("hourly_rate", "is", null);

      if (error) throw error;

      // Calculate revenue: (duration in hours) * hourly_rate
      const currentAmount = (timeEntries || []).reduce((sum, entry) => {
        if (entry.duration && entry.hourly_rate) {
          const hours = entry.duration / 3600; // Convert seconds to hours
          return sum + hours * entry.hourly_rate;
        }
        return sum;
      }, 0);

      // Update the goal's current amount in database if different
      if (Math.abs(currentAmount - (goal.currentAmount || 0)) > 0.01) {
        await this.updateGoal(goal.id, { currentAmount });
      }

      // Calculate progress using the real current amount
      const realGoal = { ...goal, currentAmount };
      return calculateGoalProgress(realGoal);
    } catch (error) {
      console.error("Error calculating revenue goal progress:", error);
      // Fallback to stored progress
      return calculateGoalProgress(goal);
    }
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
          projectId: dbRow.project_id,
          scope: dbRow.scope,
          scopeId: dbRow.scope_id,
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
      dbData.project_id = goal.projectId; // Optional project restriction
      dbData.scope = goal.scope || "general"; // Default to general if not set (for backward compatibility)
      dbData.scope_id =
        dbData.scope === "general" || !goal.scopeId || goal.scopeId === ""
          ? null
          : goal.scopeId;

      // Calculate start_date and end_date based on period, or use provided dates for custom
      if (goal.period === "custom") {
        if (goal.startDate && goal.endDate) {
          // Convert date strings to full ISO timestamps
          dbData.start_date = new Date(goal.startDate).toISOString();
          dbData.end_date = new Date(
            goal.endDate + "T23:59:59.999Z"
          ).toISOString(); // End of day
        } else {
          throw new Error(
            "Custom period goals must provide startDate and endDate"
          );
        }
      } else if (goal.period) {
        const { startDate, endDate } = this.calculatePeriodDates(goal.period);
        dbData.start_date = startDate;
        dbData.end_date = endDate;
      }
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

      // Calculate start_date and end_date based on period, or use provided dates for custom
      if (goal.period === "custom") {
        if (goal.startDate && goal.endDate) {
          // Convert date strings to full ISO timestamps
          dbData.start_date = new Date(goal.startDate).toISOString();
          dbData.end_date = new Date(
            goal.endDate + "T23:59:59.999Z"
          ).toISOString(); // End of day
        } else {
          throw new Error(
            "Custom period goals must provide startDate and endDate"
          );
        }
      } else if (goal.period) {
        const { startDate, endDate } = this.calculatePeriodDates(goal.period);
        dbData.start_date = startDate;
        dbData.end_date = endDate;
      }
    }

    if (goal.targetDate) {
      dbData.target_date = goal.targetDate;
    }

    return dbData;
  }

  /**
   * Calculate start and end dates for a given period
   */
  private calculatePeriodDates(period: TimeGoalPeriod): {
    startDate: string;
    endDate: string;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        break;

      case "weekly": {
        // Start of week (Sunday)
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);

        // End of week (Saturday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }

      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        break;

      case "quarterly": {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        endDate = new Date(
          now.getFullYear(),
          quarterStartMonth + 3,
          0,
          23,
          59,
          59,
          999
        );
        break;
      }

      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;

      default:
        // Fallback to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
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
  scope?: "client" | "project" | "general";
  scope_id?: string | null;
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
  scope?: "client" | "project" | "general";
  scope_id?: string | null;
  target_completion_date?: string;
  estimated_hours_remaining?: number;
  completion_percentage?: number;
  target_amount?: number;
  current_amount?: number;
  currency?: string;
}
