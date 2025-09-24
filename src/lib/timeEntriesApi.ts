import { supabase } from "./supabase";
import { getUserIdWithFallback } from "./auth-utils";

// Types for time entries
export interface TimeEntry {
  id?: string;
  user_id?: string;
  project_id?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration?: number; // in seconds
  billable?: boolean;
  hourly_rate?: number;
  is_running?: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined data
  project?: {
    id: string;
    name: string;
    color: string;
    client?: {
      id: string;
      name: string;
    };
  };
}

export interface ActiveTimer {
  id: string;
  start_time: string;
  description: string;
  project_id?: string;
  project?: {
    id: string;
    name: string;
    color: string;
    client?: {
      id: string;
      name: string;
    };
  };
}

// Time Entries API functions
export const timeEntriesApi = {
  // Get current running timer
  async getActiveTimer(): Promise<ActiveTimer | null> {
    try {
      const userId = await getUserIdWithFallback();

      const { data, error } = await supabase
        .from("time_entries")
        .select(
          `
          id,
          start_time,
          description,
          project_id,
          project:projects!inner(
            id, 
            name, 
            color,
            client:clients(id, name)
          )
        `
        )
        .eq("user_id", userId)
        .eq("is_running", true)
        .maybeSingle();

      if (error) throw error;
      return data as ActiveTimer | null;
    } catch (error) {
      console.error("Error getting active timer:", error);
      return null;
    }
  },

  // Start a new timer
  async startTimer(
    description: string,
    projectId?: string
  ): Promise<TimeEntry> {
    try {
      const userId = await getUserIdWithFallback();

      // First, stop any running timers
      await this.stopActiveTimer();

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          project_id: projectId || null,
          description: description || "",
          start_time: new Date().toISOString(),
          is_running: true,
          billable: true,
        })
        .select(
          `
          *,
          project:projects(
            id, 
            name, 
            color,
            client:clients(id, name)
          )
        `
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error starting timer:", error);
      throw error;
    }
  },

  // Stop the current running timer
  async stopActiveTimer(): Promise<TimeEntry | null> {
    try {
      const userId = await getUserIdWithFallback();

      const { data, error } = await supabase
        .from("time_entries")
        .update({
          end_time: new Date().toISOString(),
          is_running: false,
        })
        .eq("user_id", userId)
        .eq("is_running", true)
        .select(
          `
          *,
          project:projects(
            id, 
            name, 
            color,
            client:clients(id, name)
          )
        `
        )
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error stopping timer:", error);
      throw error;
    }
  },

  // Stop the current running timer (alias for stopActiveTimer)
  async stopTimer(): Promise<TimeEntry | null> {
    return this.stopActiveTimer();
  },

  // Get recent time entries
  async getRecentTimeEntries(limit: number = 10): Promise<TimeEntry[]> {
    try {
      const userId = await getUserIdWithFallback();

      const { data, error } = await supabase
        .from("time_entries")
        .select(
          `
          *,
          project:projects(
            id, 
            name, 
            color,
            client:clients(id, name)
          )
        `
        )
        .eq("user_id", userId)
        .order("start_time", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting time entries:", error);
      return [];
    }
  },

  // Get all time entries for current user
  async getTimeEntries(): Promise<TimeEntry[]> {
    try {
      const userId = await getUserIdWithFallback();

      const { data, error } = await supabase
        .from("time_entries")
        .select(
          `
          *,
          project:projects(
            id, 
            name, 
            color,
            client:clients(id, name)
          )
        `
        )
        .eq("user_id", userId)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting time entries:", error);
      return [];
    }
  },

  // Update time entry
  async updateTimeEntry(
    id: string,
    updates: Partial<TimeEntry>
  ): Promise<TimeEntry> {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          `
          *,
          project:projects(
            id, 
            name, 
            color,
            client:clients(id, name)
          )
        `
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating time entry:", error);
      throw error;
    }
  },

  // Delete time entry
  async deleteTimeEntry(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting time entry:", error);
      throw error;
    }
  },

  // Get time entries for a date range
  async getTimeEntriesForRange(
    startDate: string,
    endDate: string
  ): Promise<TimeEntry[]> {
    try {
      const userId = await getUserIdWithFallback();

      const { data, error } = await supabase
        .from("time_entries")
        .select(
          `
          *,
          project:projects(
            id, 
            name, 
            color,
            client:clients(id, name)
          )
        `
        )
        .eq("user_id", userId)
        .gte("start_time", startDate)
        .lte("start_time", endDate)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting time entries for range:", error);
      return [];
    }
  },

  // Get total time for today
  async getTodayTotal(): Promise<number> {
    try {
      const userId = await getUserIdWithFallback();

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("time_entries")
        .select("duration")
        .eq("user_id", userId)
        .gte("start_time", `${today}T00:00:00.000Z`)
        .lt("start_time", `${today}T23:59:59.999Z`)
        .not("duration", "is", null);

      if (error) throw error;

      const total = (data || []).reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      );
      return total;
    } catch (error) {
      console.error("Error getting today total:", error);
      return 0;
    }
  },

  // Create a completed time entry (for manual entries)
  async createTimeEntry(entry: {
    description: string;
    project_id?: string;
    start_time: string;
    end_time: string;
    duration: number;
    billable?: boolean;
    hourly_rate?: number;
  }): Promise<TimeEntry> {
    try {
      const userId = await getUserIdWithFallback();

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          project_id: entry.project_id || null,
          description: entry.description || "",
          start_time: entry.start_time,
          end_time: entry.end_time,
          duration: entry.duration,
          billable: entry.billable ?? true,
          hourly_rate: entry.hourly_rate || null,
          is_running: false,
        })
        .select(
          `
          *,
          project:projects(
            id, 
            name, 
            color,
            client:clients(id, name)
          )
        `
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating time entry:", error);
      throw error;
    }
  },
};
