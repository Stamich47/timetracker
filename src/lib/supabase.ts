import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Singleton pattern for Supabase client
let supabaseInstance: SupabaseClient | null = null;

// Get or create the single Supabase client instance
const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return supabaseInstance;
};

// Export the singleton instance
export const supabase = getSupabaseClient();

// Client management utilities (without reset to prevent multiple instances)
export const supabaseClientManager = {
  getInstance: () => supabase,

  // Test if client is responsive
  testClient: async (timeoutMs = 5000): Promise<boolean> => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Client test timeout")), timeoutMs);
      });

      const testPromise = supabase.auth.getSession();

      await Promise.race([testPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.warn("[SupabaseManager] Client test failed:", error);
      return false;
    }
  },

  // Health check for the client
  getClientHealth: async (): Promise<{
    responsive: boolean;
    sessionValid: boolean;
    error?: string;
  }> => {
    try {
      const { data: session, error } = await supabase.auth.getSession();

      return {
        responsive: true,
        sessionValid: !!session?.session && !error,
        error: error?.message,
      };
    } catch (error) {
      return {
        responsive: false,
        sessionValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

// Database table names
export const TABLES = {
  PROFILES: "profiles",
  CLIENTS: "clients",
  PROJECTS: "projects",
  TIME_ENTRIES: "time_entries",
  TAGS: "tags",
  TIME_ENTRY_TAGS: "time_entry_tags",
  INVOICES: "invoices",
  INVOICE_LINE_ITEMS: "invoice_line_items",
} as const;

// Helper functions for common database operations
export const dbHelpers = {
  // Get current user's profile
  async getCurrentProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get user's projects with client info
  async getProjectsWithClients(userId: string) {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        clients (
          id,
          name,
          email
        )
      `
      )
      .eq("user_id", userId)
      .eq("archived", false)
      .order("name");

    if (error) throw error;
    return data;
  },

  // Get time entries with project info
  async getTimeEntriesWithProjects(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from("time_entries")
      .select(
        `
        *,
        projects (
          id,
          name,
          color,
          clients (
            name
          )
        )
      `
      )
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Start a new timer
  async startTimer(userId: string, projectId?: string, description?: string) {
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        user_id: userId,
        project_id: projectId,
        description: description,
        start_time: new Date().toISOString(),
        is_running: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Stop the currently running timer
  async stopTimer(userId: string) {
    const { data, error } = await supabase
      .from("time_entries")
      .update({
        end_time: new Date().toISOString(),
        is_running: false,
      })
      .eq("user_id", userId)
      .eq("is_running", true)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get currently running timer
  async getRunningTimer(userId: string) {
    const { data, error } = await supabase
      .from("time_entries")
      .select(
        `
        *,
        projects (
          id,
          name,
          color
        )
      `
      )
      .eq("user_id", userId)
      .eq("is_running", true)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows returned"
    return data;
  },

  // Get time tracking statistics
  async getTimeStats(userId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from("time_entries")
      .select("duration, billable, start_time")
      .eq("user_id", userId)
      .not("duration", "is", null);

    if (startDate) {
      query = query.gte("start_time", startDate);
    }
    if (endDate) {
      query = query.lte("start_time", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalTime = data.reduce(
      (sum, entry) => sum + (entry.duration || 0),
      0
    );
    const billableTime = data.reduce(
      (sum, entry) => (entry.billable ? sum + (entry.duration || 0) : sum),
      0
    );

    return {
      totalTime,
      billableTime,
      entryCount: data.length,
      entries: data,
    };
  },
};

export default supabase;
