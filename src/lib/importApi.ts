import { supabase } from "./supabase";
import { projectsApi } from "./projectsApi";
import { timeEntriesApi } from "./timeEntriesApi";
import { getRandomProjectColor } from "../utils/colorUtils";

// Types for Clockify data (actual export format)
export interface ClockifyTimeEntry {
  Project: string;
  Client: string;
  Description: string;
  Task: string;
  User: string;
  Group: string;
  Email: string;
  Tags: string;
  Billable: string;
  "Start Date": string;
  "Start Time": string;
  "End Date": string;
  "End Time": string;
  "Duration (h)": string;
  "Duration (decimal)": string;
  "Billable Rate (USD)": string;
  "Billable Amount (USD)": string;
}

export interface PreviewClient {
  id: string;
  name: string;
  isNew: boolean;
  originalName?: string;
}

export interface PreviewProject {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  color: string;
  billable: boolean;
  hourlyRate?: number;
  description?: string;
  isNew: boolean;
  originalName?: string;
}

export interface PreviewTimeEntry {
  id: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  tags: string[];
  billable: boolean;
  originalRow: Record<string, string>;
}

export interface ImportPreview {
  clients: PreviewClient[];
  projects: PreviewProject[];
  timeEntries: PreviewTimeEntry[];
  stats: {
    newClients: number;
    newProjects: number;
    totalTimeEntries: number;
  };
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    clients: number;
    projects: number;
    timeEntries: number;
  };
  errors: string[];
}

// Helper function to parse CSV
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n");
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;

    const values: string[] = [];
    let currentValue = "";
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    data.push(row);
  }

  return data;
}

// Helper function to parse duration from Clockify format (HH:MM:SS or decimal hours)
function parseDuration(durationStr: string, decimalStr?: string): number {
  if (!durationStr && !decimalStr) return 0;

  // Try decimal hours first (more accurate)
  if (decimalStr) {
    const decimal = parseFloat(decimalStr);
    if (!isNaN(decimal)) {
      return Math.round(decimal * 3600); // Convert hours to seconds
    }
  }

  // Fall back to HH:MM:SS format
  if (durationStr) {
    const parts = durationStr.split(":");
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  return 0;
}

// Helper function to parse Clockify date/time
function parseClockifyDateTime(dateStr: string, timeStr: string): Date {
  // Clockify typically exports in MM/DD/YYYY format
  const [month, day, year] = dateStr.split("/").map(Number);
  const [time, ampm] = timeStr.split(" ");
  const [hours, minutes, seconds] = time.split(":").map(Number);

  let hour24 = hours;
  if (ampm === "PM" && hours !== 12) hour24 += 12;
  if (ampm === "AM" && hours === 12) hour24 = 0;

  return new Date(year, month - 1, day, hour24, minutes, seconds || 0);
}

export const importApi = {
  // Preview Clockify CSV data before import
  async previewClockifyData(csvText: string): Promise<ImportPreview> {
    const preview: ImportPreview = {
      clients: [],
      projects: [],
      timeEntries: [],
      stats: {
        newClients: 0,
        newProjects: 0,
        totalTimeEntries: 0,
      },
      errors: [],
    };

    try {
      // Parse CSV data
      const rawData = parseCSV(csvText);

      if (rawData.length === 0) {
        preview.errors.push("No data found in CSV file");
        return preview;
      }

      // Get existing clients and projects
      const existingClients = await projectsApi.getClients();
      const existingProjects = await projectsApi.getProjects();

      const existingClientMap = new Map<string, string>();
      const existingProjectMap = new Map<string, string>();

      // Map existing data
      existingClients.forEach((client) => {
        if (client.name && client.id) {
          existingClientMap.set(client.name.toLowerCase(), client.id);
        }
      });

      existingProjects.forEach((project) => {
        if (project.name && project.id) {
          existingProjectMap.set(project.name.toLowerCase(), project.id);
        }
      });

      // Collect unique clients and projects
      const uniqueClients = new Map<string, PreviewClient>();
      const uniqueProjects = new Map<string, PreviewProject>();

      // Process data to build preview
      rawData.forEach((row, index) => {
        try {
          // Process client
          if (row.Client && row.Client.trim() && row.Client !== "No client") {
            const clientName = row.Client.trim();
            const clientKey = clientName.toLowerCase();

            if (!uniqueClients.has(clientKey)) {
              const existingClientId = existingClientMap.get(clientKey);
              uniqueClients.set(clientKey, {
                id: existingClientId || `new-client-${uniqueClients.size}`,
                name: clientName,
                isNew: !existingClientId,
                originalName: clientName,
              });
            }
          }

          // Process project
          if (row.Project && row.Project.trim()) {
            const projectName = row.Project.trim();
            const projectKey = projectName.toLowerCase();

            if (!uniqueProjects.has(projectKey)) {
              const existingProjectId = existingProjectMap.get(projectKey);
              const clientName = row.Client?.trim();
              const clientKey = clientName?.toLowerCase();
              const clientId =
                clientName && clientName !== "No client"
                  ? existingClientMap.get(clientKey) ||
                    uniqueClients.get(clientKey)?.id
                  : undefined;

              uniqueProjects.set(projectKey, {
                id: existingProjectId || `new-project-${uniqueProjects.size}`,
                name: projectName,
                clientId,
                clientName:
                  clientName && clientName !== "No client"
                    ? clientName
                    : undefined,
                color: getRandomProjectColor(),
                billable: row.Billable === "Yes",
                hourlyRate: row["Billable Rate (USD)"]
                  ? parseFloat(row["Billable Rate (USD)"]) || undefined
                  : undefined,
                isNew: !existingProjectId,
                originalName: projectName,
              });
            }
          }

          // Process time entry
          if (
            row["Start Date"] &&
            row["Start Time"] &&
            (row["Duration (h)"] || row["Duration (decimal)"])
          ) {
            const startDate = parseClockifyDateTime(
              row["Start Date"],
              row["Start Time"]
            );
            const duration = parseDuration(
              row["Duration (h)"],
              row["Duration (decimal)"]
            );
            const endDate = new Date(startDate.getTime() + duration * 1000);

            const projectName = row.Project?.trim();
            const projectKey = projectName?.toLowerCase();
            const projectId = projectName
              ? existingProjectMap.get(projectKey) ||
                uniqueProjects.get(projectKey)?.id
              : undefined;

            const tags = row.Tags
              ? row.Tags.split(",")
                  .map((tag: string) => tag.trim())
                  .filter((tag: string) => tag)
              : [];

            const clientName = row.Client?.trim();

            preview.timeEntries.push({
              id: `preview-entry-${index}`,
              description: row.Description || "",
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              duration,
              projectId,
              projectName,
              clientName:
                clientName && clientName !== "No client"
                  ? clientName
                  : undefined,
              tags,
              billable: row.Billable === "Yes",
              originalRow: row,
            });
          }
        } catch (error) {
          preview.errors.push(
            `Row ${index + 1}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      });

      // Convert maps to arrays
      preview.clients = Array.from(uniqueClients.values());
      preview.projects = Array.from(uniqueProjects.values());

      // Calculate stats
      preview.stats = {
        newClients: preview.clients.filter((c) => c.isNew).length,
        newProjects: preview.projects.filter((p) => p.isNew).length,
        totalTimeEntries: preview.timeEntries.length,
      };
    } catch (error) {
      preview.errors.push(
        `Preview failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return preview;
  },

  // Import data from preview (edited data)
  async importFromPreview(preview: ImportPreview): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      message: "",
      imported: { clients: 0, projects: 0, timeEntries: 0 },
      errors: [],
    };

    try {
      // Create new clients first
      const clientIdMap = new Map<string, string>();

      for (const client of preview.clients) {
        if (client.isNew) {
          try {
            const newClient = await projectsApi.createClient({
              name: client.name,
            });
            if (newClient.id) {
              clientIdMap.set(client.id, newClient.id);
              result.imported.clients++;
            }
          } catch (err) {
            result.errors.push(
              `Failed to create client: ${client.name} - ${
                err instanceof Error ? err.message : "Unknown error"
              }`
            );
          }
        } else {
          // Use existing client ID
          clientIdMap.set(client.id, client.id);
        }
      }

      // Create new projects
      const projectIdMap = new Map<string, string>();

      for (const project of preview.projects) {
        if (project.isNew) {
          try {
            const clientId = project.clientId
              ? clientIdMap.get(project.clientId)
              : undefined;

            const newProject = await projectsApi.createProject({
              name: project.name,
              client_id: clientId,
              color: project.color,
              description: project.description,
              billable: project.billable,
              hourly_rate: project.hourlyRate,
            });

            if (newProject.id) {
              projectIdMap.set(project.id, newProject.id);
              result.imported.projects++;
            }
          } catch (err) {
            result.errors.push(
              `Failed to create project: ${project.name} - ${
                err instanceof Error ? err.message : "Unknown error"
              }`
            );
          }
        } else {
          // Use existing project ID
          projectIdMap.set(project.id, project.id);
        }
      }

      // Import time entries
      for (const entry of preview.timeEntries) {
        try {
          const projectId = entry.projectId
            ? projectIdMap.get(entry.projectId)
            : undefined;

          const timeEntry = {
            description: entry.description,
            start_time: entry.startTime,
            end_time: entry.endTime,
            duration: entry.duration,
            project_id: projectId,
            tags: entry.tags.length > 0 ? entry.tags : undefined,
          };

          await timeEntriesApi.createTimeEntry(timeEntry);
          result.imported.timeEntries++;
        } catch (err) {
          result.errors.push(
            `Failed to import time entry: ${entry.description || "Unknown"} - ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      }

      result.success = true;
      result.message = `Successfully imported ${result.imported.clients} clients, ${result.imported.projects} projects, and ${result.imported.timeEntries} time entries`;

      if (result.errors.length > 0) {
        result.message += `. ${result.errors.length} errors occurred.`;
      }
    } catch (error) {
      result.success = false;
      result.message = `Import failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      result.errors.push(String(error));
    }

    return result;
  },

  // Import Clockify CSV data (legacy function - now uses preview)
  async importClockifyData(csvText: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      message: "",
      imported: { clients: 0, projects: 0, timeEntries: 0 },
      errors: [],
    };

    try {
      // Parse CSV data
      const rawData = parseCSV(csvText);

      if (rawData.length === 0) {
        result.message = "No data found in CSV file";
        return result;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Use hardcoded test user ID when no authentication for local testing
      if (!user?.id && user?.id !== "8c9c14aa-9be6-460c-b3b4-833a97431c4f") {
        throw new Error("No authenticated user");
      }

      // Get existing clients and projects to avoid duplicates
      const existingClients = await projectsApi.getClients();
      const existingProjects = await projectsApi.getProjects();

      const clientMap = new Map<string, string>(); // client name -> client id
      const projectMap = new Map<string, string>(); // project name -> project id

      // Map existing clients
      existingClients.forEach((client) => {
        if (client.name && client.id) {
          clientMap.set(client.name.toLowerCase(), client.id);
        }
      });

      // Map existing projects
      existingProjects.forEach((project) => {
        if (project.name && project.id) {
          projectMap.set(project.name.toLowerCase(), project.id);
        }
      });

      // Process unique clients first
      const uniqueClients = new Set<string>();
      rawData.forEach((row) => {
        if (row.Client && row.Client.trim() && row.Client !== "No client") {
          uniqueClients.add(row.Client.trim());
        }
      });

      // Create missing clients
      for (const clientName of uniqueClients) {
        if (!clientMap.has(clientName.toLowerCase())) {
          try {
            const newClient = await projectsApi.createClient({
              name: clientName,
            });
            if (newClient.id) {
              clientMap.set(clientName.toLowerCase(), newClient.id);
              result.imported.clients++;
            }
          } catch (err) {
            result.errors.push(
              `Failed to create client: ${clientName} - ${
                err instanceof Error ? err.message : "Unknown error"
              }`
            );
          }
        }
      }

      // Process unique projects
      const uniqueProjects = new Set<string>();
      rawData.forEach((row) => {
        if (row.Project && row.Project.trim()) {
          uniqueProjects.add(row.Project.trim());
        }
      });

      // Create missing projects
      for (const projectName of uniqueProjects) {
        if (!projectMap.has(projectName.toLowerCase())) {
          try {
            // Find client for this project from the data
            const projectRow = rawData.find(
              (row) => row.Project === projectName
            );
            const clientName = projectRow?.Client?.trim();
            const clientId =
              clientName && clientName !== "No client"
                ? clientMap.get(clientName.toLowerCase())
                : undefined;

            const newProject = await projectsApi.createProject({
              name: projectName,
              client_id: clientId,
              color: getRandomProjectColor(),
              billable: projectRow?.Billable === "Yes",
              hourly_rate: projectRow?.["Billable Rate (USD)"]
                ? parseFloat(projectRow["Billable Rate (USD)"]) || undefined
                : undefined,
            });

            if (newProject.id) {
              projectMap.set(projectName.toLowerCase(), newProject.id);
              result.imported.projects++;
            }
          } catch (err) {
            result.errors.push(
              `Failed to create project: ${projectName} - ${
                err instanceof Error ? err.message : "Unknown error"
              }`
            );
          }
        }
      }

      // Import time entries
      for (const row of rawData) {
        try {
          if (
            !row["Start Date"] ||
            !row["Start Time"] ||
            (!row["Duration (h)"] && !row["Duration (decimal)"])
          ) {
            continue; // Skip incomplete entries
          }

          const startDate = parseClockifyDateTime(
            row["Start Date"],
            row["Start Time"]
          );
          const duration = parseDuration(
            row["Duration (h)"],
            row["Duration (decimal)"]
          );
          const endDate = new Date(startDate.getTime() + duration * 1000);

          const projectId = row.Project
            ? projectMap.get(row.Project.toLowerCase())
            : undefined;

          // Parse tags
          const tags = row.Tags
            ? row.Tags.split(",")
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag)
            : [];

          const timeEntry = {
            description: row.Description || "",
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            duration: duration,
            project_id: projectId,
            tags: tags.length > 0 ? tags : undefined,
          };

          await timeEntriesApi.createTimeEntry(timeEntry);
          result.imported.timeEntries++;
        } catch (err) {
          result.errors.push(
            `Failed to import time entry: ${row.Description || "Unknown"} - ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      }

      result.success = true;
      result.message = `Successfully imported ${result.imported.clients} clients, ${result.imported.projects} projects, and ${result.imported.timeEntries} time entries`;

      if (result.errors.length > 0) {
        result.message += `. ${result.errors.length} errors occurred.`;
      }
    } catch (error) {
      result.success = false;
      result.message = `Import failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      result.errors.push(String(error));
    }

    return result;
  },

  // Validate CSV format before import
  validateClockifyCSV(csvText: string): { valid: boolean; message: string } {
    try {
      const lines = csvText.split("\n");
      if (lines.length < 2) {
        return {
          valid: false,
          message: "CSV file appears to be empty or has no data rows",
        };
      }

      const headers = lines[0].toLowerCase();
      const requiredFields = [
        "project",
        "start date",
        "start time",
        "duration (h)",
      ];
      const missingFields = requiredFields.filter(
        (field) => !headers.includes(field)
      );

      if (missingFields.length > 0) {
        return {
          valid: false,
          message: `Missing required columns: ${missingFields.join(
            ", "
          )}. This doesn't appear to be a Clockify export.`,
        };
      }

      return { valid: true, message: "CSV format is valid" };
    } catch {
      return { valid: false, message: "Error reading CSV file" };
    }
  },
};
