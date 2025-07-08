import type { TimeEntry } from "../lib/timeEntriesApi";
import type { Project } from "../lib/projectsApi";
import type { UserSettings } from "../lib/settingsApi";

// Revenue calculation utilities
export interface RevenueData {
  grossRevenue: number;
  netRevenue: number;
  taxAmount: number;
  hourlyRate: number;
  hours: number;
  isBillable: boolean;
}

/**
 * Calculate revenue for a single time entry
 */
export function calculateTimeEntryRevenue(
  timeEntry: TimeEntry,
  project: Project | undefined,
  userSettings: UserSettings
): RevenueData {
  // Default values
  const defaultRevenue: RevenueData = {
    grossRevenue: 0,
    netRevenue: 0,
    taxAmount: 0,
    hourlyRate: 0,
    hours: 0,
    isBillable: false,
  };

  // No duration means no revenue
  if (!timeEntry.duration) return defaultRevenue;

  // Check if the project is billable
  const isBillable = project?.billable ?? true; // Default to billable if not specified
  if (!isBillable) return { ...defaultRevenue, isBillable: false };

  // Determine hourly rate (precedence: project > user settings > 0)
  const hourlyRate = project?.hourly_rate ?? userSettings.hourly_rate ?? 0;

  // No rate means no revenue
  if (hourlyRate <= 0) return { ...defaultRevenue, isBillable: true };

  // Calculate hours from duration in seconds
  const hours = timeEntry.duration / 3600;

  // Calculate gross revenue
  const grossRevenue = hours * hourlyRate;

  // Apply tax if configured
  const taxRate = userSettings.tax_rate ?? 0;
  const taxAmount = grossRevenue * (taxRate / 100);
  const netRevenue = grossRevenue - taxAmount;

  return {
    grossRevenue,
    netRevenue,
    taxAmount,
    hourlyRate,
    hours,
    isBillable: true,
  };
}

/**
 * Calculate total revenue for multiple time entries
 */
export function calculateTotalRevenue(
  timeEntries: TimeEntry[],
  projects: Project[],
  userSettings: UserSettings
): {
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalTaxAmount: number;
  totalBillableHours: number;
  totalNonBillableHours: number;
  billableEntries: number;
  nonBillableEntries: number;
} {
  let totalGrossRevenue = 0;
  let totalNetRevenue = 0;
  let totalTaxAmount = 0;
  let totalBillableHours = 0;
  let totalNonBillableHours = 0;
  let billableEntries = 0;
  let nonBillableEntries = 0;

  timeEntries.forEach((entry) => {
    const project = projects.find((p) => p.id === entry.project_id);
    const revenue = calculateTimeEntryRevenue(entry, project, userSettings);

    if (revenue.isBillable) {
      totalGrossRevenue += revenue.grossRevenue;
      totalNetRevenue += revenue.netRevenue;
      totalTaxAmount += revenue.taxAmount;
      totalBillableHours += revenue.hours;
      billableEntries++;
    } else {
      totalNonBillableHours += revenue.hours;
      nonBillableEntries++;
    }
  });

  return {
    totalGrossRevenue,
    totalNetRevenue,
    totalTaxAmount,
    totalBillableHours,
    totalNonBillableHours,
    billableEntries,
    nonBillableEntries,
  };
}

/**
 * Format currency amount based on user settings
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD"
): string {
  const currencySymbols: { [key: string]: string } = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
  };

  const symbol = currencySymbols[currency] || "$";
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get effective hourly rate for a time entry
 */
export function getEffectiveHourlyRate(
  project: Project | undefined,
  userSettings: UserSettings
): number {
  return project?.hourly_rate ?? userSettings.hourly_rate ?? 0;
}

/**
 * Check if a time entry is billable
 */
export function isTimeEntryBillable(project: Project | undefined): boolean {
  return project?.billable ?? true; // Default to billable if not specified
}

/**
 * Calculate revenue breakdown by project
 */
export function calculateProjectRevenueBreakdown(
  timeEntries: TimeEntry[],
  projects: Project[],
  userSettings: UserSettings
): Array<{
  projectId: string;
  projectName: string;
  projectColor: string;
  clientName?: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  grossRevenue: number;
  netRevenue: number;
  hourlyRate: number;
  entriesCount: number;
}> {
  const projectMap = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      projectColor: string;
      clientName?: string;
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      grossRevenue: number;
      netRevenue: number;
      hourlyRate: number;
      entriesCount: number;
    }
  >();

  timeEntries.forEach((entry) => {
    const projectId = entry.project_id || "no-project";
    const project = projects.find((p) => p.id === entry.project_id);
    const revenue = calculateTimeEntryRevenue(entry, project, userSettings);

    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, {
        projectId,
        projectName: project?.name || "No Project",
        projectColor: project?.color || "#6B7280",
        clientName: project?.client?.name,
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        grossRevenue: 0,
        netRevenue: 0,
        hourlyRate: revenue.hourlyRate,
        entriesCount: 0,
      });
    }

    const projectData = projectMap.get(projectId)!;
    projectData.totalHours += revenue.hours;
    projectData.entriesCount++;

    if (revenue.isBillable) {
      projectData.billableHours += revenue.hours;
      projectData.grossRevenue += revenue.grossRevenue;
      projectData.netRevenue += revenue.netRevenue;
    } else {
      projectData.nonBillableHours += revenue.hours;
    }
  });

  return Array.from(projectMap.values()).sort(
    (a, b) => b.grossRevenue - a.grossRevenue
  );
}
