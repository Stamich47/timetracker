import { supabase } from "./supabase";

// Types for settings
export interface UserSettings {
  id?: string;
  email?: string;
  full_name?: string;
  timezone?: string;
  hourly_rate?: number;
  currency?: string;
  tax_rate?: number;
  email_notifications?: boolean;
  reminder_notifications?: boolean;
  weekly_reports?: boolean;
  theme?: string;
  language?: string;
  date_format?: string;
  time_format?: string;
  auto_start?: boolean;
  reminder_interval?: number;
}

// Settings API functions
export const settingsApi = {
  // Get current user's settings
  async getSettings(): Promise<UserSettings | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Profile doesn't exist, create default one
          return await this.createDefaultProfile(user);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error getting settings:", error);
      return null;
    }
  },

  // Create default profile for new user
  async createDefaultProfile(user: {
    id: string;
    email?: string;
    user_metadata?: { full_name?: string };
  }): Promise<UserSettings> {
    const defaultProfile: UserSettings = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
      timezone: "UTC",
      hourly_rate: 0,
      currency: "USD",
      tax_rate: 0,
      email_notifications: true,
      reminder_notifications: true,
      weekly_reports: true,
      theme: "system",
      language: "en",
      date_format: "MM/dd/yyyy",
      time_format: "12h",
      auto_start: false,
      reminder_interval: 15,
    };

    const { data, error } = await supabase
      .from("profiles")
      .insert(defaultProfile)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update user settings
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  },

  // Export user data
  async exportUserData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Get all user data
      const [profile, projects, timeEntries, clients] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("projects").select("*").eq("user_id", user.id),
        supabase.from("time_entries").select("*").eq("user_id", user.id),
        supabase.from("clients").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        profile: profile.data,
        projects: projects.data || [],
        timeEntries: timeEntries.data || [],
        clients: clients.data || [],
        exportedAt: new Date().toISOString(),
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timetracker-data-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Error exporting data:", error);
      throw error;
    }
  },
};
