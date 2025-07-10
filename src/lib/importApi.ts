import { projectsApi } from "./projectsApi";
import { timeEntriesApi } from "./timeEntriesApi";
import { getRandomProjectColor } from "../utils/colorUtils";

// Types for new CSV import format (ISO 8601)
export interface TimeEntryCSVRow {
  Project: string;
  Client?: string;
  Description?: string;
  Tags?: string;
  Billable?: string;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  duration?: string; // seconds or ISO 8601 duration (optional)
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
  isNew?: boolean; // <-- Add this property to mark new/duplicate
}

export interface ImportPreview {
  clients: PreviewClient[];
  projects: PreviewProject[];
  timeEntries: PreviewTimeEntry[];
  stats: {
    newClients: number;
    newProjects: number;
    totalTimeEntries: number;
    newTimeEntries: number; // add newTimeEntries
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

// New validation for required columns in new format
function validateTimeTrackerCSV(csvText: string): {
  valid: boolean;
  message: string;
} {
  try {
    const lines = csvText.split("\n");
    if (lines.length < 2) {
      return {
        valid: false,
        message: "CSV file appears to be empty or has no data rows",
      };
    }
    const headers = lines[0].toLowerCase();
    const requiredFields = ["project", "start_time", "end_time"];
    const missingFields = requiredFields.filter(
      (field) => !headers.includes(field)
    );
    if (missingFields.length > 0) {
      return {
        valid: false,
        message: `Missing required columns: ${missingFields.join(
          ", "
        )}. Please export your data using the Reports CSV export.`,
      };
    }
    return { valid: true, message: "CSV format is valid" };
  } catch {
    return { valid: false, message: "Error reading CSV file" };
  }
}

// New preview function for new format
async function previewTimeTrackerData(csvText: string): Promise<ImportPreview> {
  const preview: ImportPreview = {
    clients: [],
    projects: [],
    timeEntries: [],
    stats: {
      newClients: 0,
      newProjects: 0,
      totalTimeEntries: 0,
      newTimeEntries: 0,
    }, // add newTimeEntries
    errors: [],
  };
  try {
    const rawData = parseCSV(csvText);
    if (rawData.length === 0) {
      preview.errors.push("No data found in CSV file");
      return preview;
    }
    const existingClients = await projectsApi.getClients();
    const existingProjects = await projectsApi.getProjects();
    const existingClientMap = new Map<string, string>();
    const existingProjectMap = new Map<string, string>();
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
    const uniqueClients = new Map<string, PreviewClient>();
    const uniqueProjects = new Map<string, PreviewProject>();
    // Fetch all existing time entries for duplicate checking
    const existingEntries = await timeEntriesApi.getTimeEntries();
    type EntryKeyFields = {
      project_id?: string;
      start_time?: string;
      end_time?: string;
      description?: string;
    };
    // Helper to normalize ISO date string to 'YYYY-MM-DDTHH:mm:ss' (ignore ms/tz)
    function normalizeIsoDate(date: string | undefined): string {
      if (!date) return "";
      // Always use first 19 chars (YYYY-MM-DDTHH:mm:ss)
      return new Date(date).toISOString().slice(0, 19);
    }
    const entryKey = (entry: EntryKeyFields) =>
      [
        entry.project_id,
        normalizeIsoDate(entry.start_time),
        normalizeIsoDate(entry.end_time),
        entry.description || "",
      ].join("||");
    const existingKeys = new Set(existingEntries.map((e) => entryKey(e)));
    let newTimeEntriesCount = 0;
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
              isNew: !existingProjectId,
              originalName: projectName,
            });
          }
        }
        // Process time entry
        if (row.start_time && row.end_time) {
          const startTime = new Date(row.start_time);
          const endTime = new Date(row.end_time);
          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            throw new Error(
              "Invalid start_time or end_time format (must be ISO 8601)"
            );
          }
          const duration = Math.floor(
            (endTime.getTime() - startTime.getTime()) / 1000
          );
          const projectName = row.Project?.trim();
          const projectKey = projectName?.toLowerCase();
          // Use the real DB project ID if it exists, otherwise the temp one
          const dbProjectId = projectName
            ? existingProjectMap.get(projectKey)
            : undefined;
          const previewProjectId = projectName
            ? uniqueProjects.get(projectKey)?.id
            : undefined;
          const projectId = dbProjectId || previewProjectId;
          const tags = row.Tags
            ? row.Tags.split(",")
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag)
            : [];
          const clientName = row.Client?.trim();
          // Duplicate check for preview (must use DB project ID if available)
          const key = [
            dbProjectId || previewProjectId,
            normalizeIsoDate(startTime.toISOString()),
            normalizeIsoDate(endTime.toISOString()),
            row.Description || "",
          ].join("||");
          const isNew = !existingKeys.has(key);
          if (isNew) newTimeEntriesCount++;
          preview.timeEntries.push({
            id: `preview-entry-${index}`,
            description: row.Description || "",
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration,
            projectId,
            projectName,
            clientName:
              clientName && clientName !== "No client" ? clientName : undefined,
            tags,
            billable: row.Billable === "Yes",
            originalRow: row,
            isNew, // <-- Mark as new/duplicate
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
    preview.clients = Array.from(uniqueClients.values());
    preview.projects = Array.from(uniqueProjects.values());
    preview.stats = {
      newClients: preview.clients.filter((c) => c.isNew).length,
      newProjects: preview.projects.filter((p) => p.isNew).length,
      totalTimeEntries: preview.timeEntries.length,
      newTimeEntries: newTimeEntriesCount, // add newTimeEntries
    };
  } catch (error) {
    preview.errors.push(
      `Preview failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
  return preview;
}

export const importApi = {
  validateTimeTrackerCSV,
  previewTimeTrackerData,
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
            if (newClient && newClient.id) {
              clientIdMap.set(client.name.toLowerCase(), newClient.id);
              result.imported.clients++;
            }
          } catch (err) {
            result.errors.push(
              `Failed to create client '${client.name}': ${
                err instanceof Error ? err.message : err
              }`
            );
          }
        } else if (client.id) {
          clientIdMap.set(client.name.toLowerCase(), client.id);
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
            if (newProject && newProject.id) {
              projectIdMap.set(project.id, newProject.id);
              result.imported.projects++;
            }
          } catch (err) {
            result.errors.push(
              `Failed to create project '${project.name}': ${
                err instanceof Error ? err.message : err
              }`
            );
          }
        } else if (project.id) {
          projectIdMap.set(project.id, project.id);
        }
      }

      // Import new time entries (only those marked isNew)
      for (const entry of preview.timeEntries) {
        if (!entry.isNew) continue;
        try {
          // Map to real project ID
          const projectId = entry.projectId
            ? projectIdMap.get(entry.projectId) || entry.projectId
            : undefined;
          await timeEntriesApi.createTimeEntry({
            description: entry.description,
            start_time: entry.startTime,
            end_time: entry.endTime,
            duration: entry.duration,
            project_id: projectId,
            billable: entry.billable,
            // tags: entry.tags.length > 0 ? entry.tags : undefined, // removed, not supported by API
          });
          result.imported.timeEntries++;
        } catch (err) {
          result.errors.push(
            `Failed to import time entry '${
              entry.description || "No description"
            }': ${err instanceof Error ? err.message : err}`
          );
        }
      }

      result.success = result.errors.length === 0;
      result.message = result.success
        ? "Import completed successfully."
        : "Import completed with some errors.";
      return result;
    } catch (err) {
      result.errors.push(
        `Import failed: ${err instanceof Error ? err.message : err}`
      );
      result.success = false;
      result.message = "Import failed.";
      return result;
    }
  },
};
