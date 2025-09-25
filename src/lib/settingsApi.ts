import { supabase } from "./supabase";
import { UserSettingsSchema } from "./validation";
import {
  validateApiResponse,
  validateWithToast,
  sanitizeUserInput,
} from "./validationUtils";

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
  // Business info fields
  business_name?: string;
  business_email?: string;
  business_phone?: string;
  business_address?: string;
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
      theme: "light",
      language: "en",
      date_format: "MM/DD/YYYY",
      time_format: "12h",
      auto_start: false,
      reminder_interval: 15,
      business_name: "",
      business_email: "",
      business_phone: "",
      business_address: "",
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

      // Sanitize string fields
      const sanitizedSettings = { ...settings };
      if (sanitizedSettings.full_name) {
        sanitizedSettings.full_name = sanitizeUserInput(
          sanitizedSettings.full_name
        );
      }
      if (sanitizedSettings.business_name) {
        sanitizedSettings.business_name = sanitizeUserInput(
          sanitizedSettings.business_name
        );
      }
      if (sanitizedSettings.business_email) {
        sanitizedSettings.business_email = sanitizeUserInput(
          sanitizedSettings.business_email
        );
      }
      if (sanitizedSettings.business_phone) {
        sanitizedSettings.business_phone = sanitizeUserInput(
          sanitizedSettings.business_phone
        );
      }
      if (sanitizedSettings.business_address) {
        sanitizedSettings.business_address = sanitizeUserInput(
          sanitizedSettings.business_address
        );
      }

      // Sanitize date_format to ensure it's valid
      if (sanitizedSettings.date_format) {
        const validFormats = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
        if (!validFormats.includes(sanitizedSettings.date_format)) {
          sanitizedSettings.date_format = "MM/DD/YYYY"; // Default to valid format
        }
      }

      // Validate settings using partial schema
      const validatedSettings = validateWithToast(
        UserSettingsSchema.partial(),
        sanitizedSettings,
        "Settings Update"
      );
      if (!validatedSettings) {
        throw new Error("Settings validation failed");
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...validatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Validate response data
      const validatedResponse = validateApiResponse(
        UserSettingsSchema,
        data,
        "/profiles/update"
      );
      if (!validatedResponse.success || !validatedResponse.data) {
        throw new Error("Invalid response from server");
      }

      return validatedResponse.data as UserSettings;
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

  // Export user data as CSV files in a ZIP archive
  async exportUserDataAsCSV() {
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

      // Helper function to escape CSV values
      const escapeCsvValue = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      // Convert data to CSV format
      const createCSV = (
        data: Record<string, unknown>[],
        headers: string[]
      ) => {
        if (!data || data.length === 0) return headers.join(",") + "\n";

        const rows = data.map((item) =>
          headers.map((header) => escapeCsvValue(item[header])).join(",")
        );
        return [headers.join(","), ...rows].join("\n");
      };

      // Create CSV content for each data type
      const profileHeaders = [
        "id",
        "full_name",
        "email",
        "timezone",
        "hourly_rate",
        "currency",
        "tax_rate",
        "created_at",
        "updated_at",
      ];
      const clientHeaders = [
        "id",
        "name",
        "email",
        "phone",
        "address",
        "created_at",
        "updated_at",
      ];
      const projectHeaders = [
        "id",
        "name",
        "description",
        "client_id",
        "hourly_rate",
        "color",
        "is_active",
        "created_at",
        "updated_at",
      ];
      const timeEntryHeaders = [
        "id",
        "project_id",
        "description",
        "start_time",
        "end_time",
        "duration",
        "created_at",
        "updated_at",
      ];

      const profileCSV = createCSV(
        profile.data ? [profile.data] : [],
        profileHeaders
      );
      const clientsCSV = createCSV(clients.data || [], clientHeaders);
      const projectsCSV = createCSV(projects.data || [], projectHeaders);
      const timeEntriesCSV = createCSV(
        timeEntries.data || [],
        timeEntryHeaders
      );

      // Create a simple multi-file download approach
      // Since we can't easily create ZIP files without additional libraries,
      // we'll download separate CSV files
      const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob([content], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      const dateStr = new Date().toISOString().split("T")[0];

      // Download each CSV file with a small delay to avoid browser blocking
      setTimeout(() => downloadCSV(profileCSV, `profile-${dateStr}.csv`), 0);
      setTimeout(() => downloadCSV(clientsCSV, `clients-${dateStr}.csv`), 200);
      setTimeout(
        () => downloadCSV(projectsCSV, `projects-${dateStr}.csv`),
        400
      );
      setTimeout(
        () => downloadCSV(timeEntriesCSV, `time-entries-${dateStr}.csv`),
        600
      );

      return true;
    } catch (error) {
      console.error("Error exporting CSV data:", error);
      throw error;
    }
  },
};
