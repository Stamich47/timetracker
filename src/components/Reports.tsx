import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  Loader2,
  FileText,
} from "lucide-react";
import { secondsToHMS, formatDate } from "../utils/timeUtils";
import { useTimeEntries } from "../hooks/useTimeEntries";
import CustomDropdown from "./CustomDropdown";
import type { TimeEntry } from "../lib/timeEntriesApi";
import type { Project } from "../lib/projectsApi";
import type { UserSettings } from "../lib/settingsApi";
import { settingsApi } from "../lib/settingsApi";
import {
  calculateTotalRevenue,
  calculateProjectRevenueBreakdown,
  formatCurrency,
} from "../utils/revenueUtils";

// Custom hook for persistent date range state
const usePersistentDateRange = () => {
  const [dateRange, setDateRange] = useState(() => {
    const saved = localStorage.getItem("reports-date-range");
    return saved || "thisWeek";
  });

  const [customStartDate, setCustomStartDate] = useState(() => {
    const saved = localStorage.getItem("reports-custom-start-date");
    if (saved) return saved;

    // Default to start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return startOfMonth.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const saved = localStorage.getItem("reports-custom-end-date");
    if (saved) return saved;

    // Default to today
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

  // Save to localStorage whenever values change
  useEffect(() => {
    localStorage.setItem("reports-date-range", dateRange);
  }, [dateRange]);

  useEffect(() => {
    localStorage.setItem("reports-custom-start-date", customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    localStorage.setItem("reports-custom-end-date", customEndDate);
  }, [customEndDate]);

  return {
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  };
};

interface ReportData {
  totalTime: number;
  billableTime: number;
  totalProjects: number;
  productivity: number;
  // Add revenue fields
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalTaxAmount: number;
  totalBillableHours: number;
  totalNonBillableHours: number;
  billableEntries: number;
  nonBillableEntries: number;
  dailyHours: {
    day: string;
    hours: number;
    date: string;
    formattedDate: string;
    totalSeconds: number;
  }[];
  projectBreakdown: {
    name: string;
    time: number;
    color: string;
    percentage: number;
  }[];
  // Add revenue breakdown
  revenueBreakdown: Array<{
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
  }>;
  filteredEntries: TimeEntry[];
}

interface ReportsProps {
  openInvoiceModal: (data: {
    timeEntries: TimeEntry[];
    projects: Project[];
    userSettings: UserSettings;
    selectedClientId?: string;
    periodStart: string;
    periodEnd: string;
  }) => void;
}

const Reports: React.FC<ReportsProps> = ({ openInvoiceModal }) => {
  const { timeEntries, projects, loading } = useTimeEntries();
  const {
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = usePersistentDateRange();
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return localStorage.getItem("reports-selected-client") || "";
  }); // Client filter state with persistence
  // Add user settings state
  const [userSettings, setUserSettings] = useState<UserSettings>({
    currency: "USD",
    hourly_rate: 0,
    tax_rate: 0,
  });

  // Helper function to get month/year labels
  const getMonthYearLabels = () => {
    const now = new Date();

    // This month
    const thisMonth = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Last month
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    return { thisMonth, lastMonth };
  };

  const monthYearLabels = getMonthYearLabels();
  const [reportData, setReportData] = useState<ReportData>({
    totalTime: 0,
    billableTime: 0,
    totalProjects: 0,
    productivity: 0,
    // Initialize revenue fields
    totalGrossRevenue: 0,
    totalNetRevenue: 0,
    totalTaxAmount: 0,
    totalBillableHours: 0,
    totalNonBillableHours: 0,
    billableEntries: 0,
    nonBillableEntries: 0,
    dailyHours: [],
    projectBreakdown: [],
    // Initialize revenue breakdown
    revenueBreakdown: [],
    filteredEntries: [],
  });

  // Load user settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsApi.getSettings();
        if (settings) {
          setUserSettings(settings);
        }
      } catch (error) {
        console.error("Failed to load user settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Save client selection to localStorage
  useEffect(() => {
    localStorage.setItem("reports-selected-client", selectedClientId);
  }, [selectedClientId]);

  // Handle export functionality
  const handleExport = () => {
    // Helper function to escape CSV values
    const escapeCsvValue = (value: string | number): string => {
      const stringValue = String(value);
      // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // New format: Project, Client, Description, Tags, Billable, start_time, end_time, duration, Start Date, Start Time, End Date, End Time
    const csvContent = [
      [
        "Project",
        "Client",
        "Description",
        "Tags",
        "Billable",
        "start_time",
        "end_time",
        "duration",
        "Start Date",
        "Start Time",
        "End Date",
        "End Time",
      ],
      ...reportData.filteredEntries.map((entry) => {
        const project = projects.find((p) => p.id === entry.project_id);
        let tags = "";
        if (typeof entry === "object" && entry !== null && "tags" in entry) {
          const t = (entry as { tags?: unknown }).tags;
          if (Array.isArray(t)) tags = t.join(",");
        }
        const billable = project?.billable ? "Yes" : "No";
        // Split ISO into date and time (local)
        const startDate = entry.start_time ? new Date(entry.start_time) : null;
        const endDate = entry.end_time ? new Date(entry.end_time) : null;
        const startDateStr = startDate ? startDate.toLocaleDateString() : "";
        const startTimeStr = startDate ? startDate.toLocaleTimeString() : "";
        const endDateStr = endDate ? endDate.toLocaleDateString() : "";
        const endTimeStr = endDate ? endDate.toLocaleTimeString() : "";
        return [
          project?.name || "No Project",
          project?.client?.name || "No Client",
          entry.description || "",
          tags,
          billable,
          entry.start_time || "",
          entry.end_time || "",
          entry.duration?.toString() || "",
          startDateStr,
          startTimeStr,
          endDateStr,
          endTimeStr,
        ];
      }),
    ]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `time-report-${dateRange}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Remove the problematic getCurrentTotals function - use reportData directly

  // Recalculate when dependencies change
  useEffect(() => {
    if (loading || timeEntries.length === 0) return;

    // Calculate date range based on selection
    const getDateRangeLocal = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (dateRange) {
        case "today": {
          return {
            start: today,
            end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
          };
        }
        case "thisWeek": {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0, 0, 0, 0); // Ensure start of day
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999); // Ensure end of day
          return { start: startOfWeek, end: endOfWeek };
        }
        case "thisMonth": {
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
          const endOfMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );
          endOfMonth.setHours(23, 59, 59, 999);
          return { start: startOfMonth, end: endOfMonth };
        }
        case "lastMonth": {
          const startOfLastMonth = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1
          );
          const endOfLastMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            0
          );
          endOfLastMonth.setHours(23, 59, 59, 999);
          return { start: startOfLastMonth, end: endOfLastMonth };
        }
        case "custom": {
          if (customStartDate && customEndDate) {
            // Create dates in local timezone to avoid timezone shift issues
            const [startYear, startMonth, startDay] = customStartDate
              .split("-")
              .map(Number);
            const [endYear, endMonth, endDay] = customEndDate
              .split("-")
              .map(Number);

            const start = new Date(
              startYear,
              startMonth - 1,
              startDay,
              0,
              0,
              0,
              0
            );
            const end = new Date(
              endYear,
              endMonth - 1,
              endDay,
              23,
              59,
              59,
              999
            );

            return { start, end };
          }
          return { start: today, end: today };
        }
        default:
          return { start: today, end: today };
      }
    };

    const { start, end } = getDateRangeLocal();

    // Filter time entries by date range and client - use date string comparison for proper filtering
    const filteredEntries = timeEntries.filter((entry) => {
      const entryDateStr = entry.start_time.split("T")[0]; // "YYYY-MM-DD"
      let inDateRange = false;
      if (dateRange === "custom" && customStartDate && customEndDate) {
        inDateRange =
          entryDateStr >= customStartDate && entryDateStr <= customEndDate;
      } else {
        // For preset ranges, use the original logic
        const [entryYear, entryMonth, entryDay] = entryDateStr
          .split("-")
          .map(Number);
        const startDateStr = start.toISOString().split("T")[0];
        const [startYear, startMonth, startDay] = startDateStr
          .split("-")
          .map(Number);
        const endDateStr = end.toISOString().split("T")[0];
        const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);
        const entryDate = new Date(entryYear, entryMonth - 1, entryDay);
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        inDateRange = entryDate >= startDate && entryDate <= endDate;
      }
      // Client filter (if selected)
      if (selectedClientId && selectedClientId !== "") {
        const project = projects.find((p) => p.id === entry.project_id);
        if (selectedClientId === "NO_CLIENT") {
          // Filter for projects without a client
          const matchesNoClient = !project?.client_id;
          return inDateRange && matchesNoClient;
        } else {
          // Filter for specific client
          const matchesClient = project?.client_id === selectedClientId;
          return inDateRange && matchesClient;
        }
      }
      return inDateRange;
    });

    // Calculate totals
    const totalTime = filteredEntries.reduce(
      (sum, entry) => sum + (entry.duration || 0),
      0
    );
    const billableEntries = filteredEntries.filter((entry) => {
      const project = projects.find((p) => p.id === entry.project_id);
      return project?.billable !== false; // Default to billable if undefined
    });
    const billableTime = billableEntries.reduce(
      (sum, entry) => sum + (entry.duration || 0),
      0
    );

    // Get unique projects in this time range
    const uniqueProjectIds = new Set(
      filteredEntries.map((entry) => entry.project_id).filter(Boolean)
    );
    const totalProjects = uniqueProjectIds.size;

    // Calculate productivity (simple metric: billable time / total time)
    const productivity =
      totalTime > 0 ? Math.round((billableTime / totalTime) * 100) : 0;

    // Calculate daily hours
    const dailyHours: {
      day: string;
      hours: number;
      date: string;
      formattedDate: string;
      totalSeconds: number;
    }[] = [];
    const currentDate = new Date(start);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    while (currentDate <= end) {
      // Use local date formatting to avoid timezone shifts
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const dayEntries = filteredEntries.filter((entry) => {
        // Use the same timezone-safe date extraction as the main filter
        const entryDateStr = entry.start_time.split("T")[0];
        return entryDateStr === dateStr;
      });
      const dayTotal = dayEntries.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      );

      // Format the date as "Jul 2" for display
      const formattedDate = new Date(currentDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      dailyHours.push({
        day: dayNames[currentDate.getDay()],
        hours: Math.round((dayTotal / 3600) * 10) / 10, // Keep for compatibility
        date: dateStr,
        formattedDate,
        totalSeconds: dayTotal,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate project breakdown
    const projectTotals = new Map<string, number>();
    filteredEntries.forEach((entry) => {
      if (entry.project_id) {
        const current = projectTotals.get(entry.project_id) || 0;
        projectTotals.set(entry.project_id, current + (entry.duration || 0));
      }
    });

    const projectBreakdown = Array.from(projectTotals.entries())
      .map(([projectId, time]) => {
        const project = projects.find((p) => p.id === projectId);
        return {
          name: project?.name || "Unknown Project",
          time,
          color: project?.color || "#6B7280",
          percentage:
            totalTime > 0 ? Math.round((time / totalTime) * 100 * 10) / 10 : 0,
        };
      })
      .sort((a, b) => b.time - a.time)
      .slice(0, 10); // Top 10 projects

    // Get all filtered entries sorted by most recent first
    const allFilteredEntries = filteredEntries.sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    // Calculate revenue data
    const revenueData = calculateTotalRevenue(
      filteredEntries,
      projects,
      userSettings
    );

    const revenueBreakdown = calculateProjectRevenueBreakdown(
      filteredEntries,
      projects,
      userSettings
    );

    setReportData({
      totalTime,
      billableTime,
      totalProjects,
      productivity,
      // Set revenue data
      totalGrossRevenue: revenueData.totalGrossRevenue,
      totalNetRevenue: revenueData.totalNetRevenue,
      totalTaxAmount: revenueData.totalTaxAmount,
      totalBillableHours: revenueData.totalBillableHours,
      totalNonBillableHours: revenueData.totalNonBillableHours,
      billableEntries: revenueData.billableEntries,
      nonBillableEntries: revenueData.nonBillableEntries,
      dailyHours,
      projectBreakdown,
      revenueBreakdown,
      filteredEntries: allFilteredEntries,
    });
  }, [
    timeEntries,
    projects,
    dateRange,
    customStartDate,
    customEndDate,
    selectedClientId,
    loading,
    userSettings,
  ]);

  // Get unique clients from projects
  const getUniqueClients = () => {
    const clientsMap = new Map();
    projects.forEach((project) => {
      if (project.client?.id && project.client?.name) {
        clientsMap.set(project.client.id, project.client);
      }
    });
    return Array.from(clientsMap.values());
  };

  const uniqueClients = getUniqueClients();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
            Reports & Analytics
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Client Filter - move to the left */}
          <CustomDropdown
            value={selectedClientId}
            onChange={setSelectedClientId}
            options={[
              { value: "", label: "All Clients" },
              { value: "NO_CLIENT", label: "Unassigned Projects" },
              ...uniqueClients.map((client) => ({
                value: client.id,
                label: client.name,
              })),
            ]}
            size="sm"
            className="w-full sm:w-auto min-w-[140px] h-10"
          />

          {/* Date Range Dropdown */}
          <CustomDropdown
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: "today", label: "Today" },
              { value: "thisWeek", label: "This Week" },
              {
                value: "thisMonth",
                label: `This Month (${monthYearLabels.thisMonth})`,
              },
              {
                value: "lastMonth",
                label: `Last Month (${monthYearLabels.lastMonth})`,
              },
              { value: "custom", label: "Custom Range" },
            ]}
            size="sm"
            className="w-full sm:w-auto min-w-[180px] h-10"
          />

          {/* Custom Date Range Inputs - Inline on Desktop */}
          {dateRange === "custom" && (
            <div className="flex flex-row gap-2 items-center w-full">
              <input
                type="date"
                id="reports-start-date"
                name="reportsStartDate"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input-field text-sm flex-1 h-10"
                title="From Date"
              />
              <span className="text-muted text-sm px-1 flex-shrink-0">to</span>
              <input
                type="date"
                id="reports-end-date"
                name="reportsEndDate"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input-field text-sm flex-1 h-10"
                max={new Date().toISOString().split("T")[0]}
                title="To Date"
              />
            </div>
          )}

          <button
            onClick={handleExport}
            className="h-10 px-3 py-2 btn-primary rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV (Full Data)</span>
          </button>

          <button
            onClick={() =>
              openInvoiceModal({
                timeEntries: reportData.filteredEntries,
                projects,
                userSettings,
                selectedClientId,
                periodStart: (() => {
                  const now = new Date();
                  const today = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                  );

                  switch (dateRange) {
                    case "today": {
                      return today.toISOString();
                    }
                    case "yesterday": {
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      return yesterday.toISOString();
                    }
                    case "thisWeek": {
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - today.getDay());
                      return startOfWeek.toISOString();
                    }
                    case "lastWeek": {
                      const startOfLastWeek = new Date(today);
                      startOfLastWeek.setDate(
                        today.getDate() - today.getDay() - 7
                      );
                      return startOfLastWeek.toISOString();
                    }
                    case "thisMonth": {
                      const startOfMonth = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1
                      );
                      return startOfMonth.toISOString();
                    }
                    case "lastMonth": {
                      const startOfLastMonth = new Date(
                        today.getFullYear(),
                        today.getMonth() - 1,
                        1
                      );
                      return startOfLastMonth.toISOString();
                    }
                    case "custom": {
                      // Create start date in local timezone to avoid timezone shifts
                      if (!customStartDate) return today.toISOString();
                      const [startYear, startMonth, startDay] = customStartDate
                        .split("-")
                        .map(Number);
                      const startDate = new Date(
                        startYear,
                        startMonth - 1,
                        startDay,
                        0,
                        0,
                        0,
                        0
                      );
                      return startDate.toISOString();
                    }
                    default:
                      return today.toISOString();
                  }
                })(),
                periodEnd: (() => {
                  const now = new Date();
                  const today = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                  );

                  switch (dateRange) {
                    case "today": {
                      return new Date(
                        today.getTime() + 24 * 60 * 60 * 1000 - 1
                      ).toISOString();
                    }
                    case "yesterday": {
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      return new Date(
                        yesterday.getTime() + 24 * 60 * 60 * 1000 - 1
                      ).toISOString();
                    }
                    case "thisWeek": {
                      const endOfWeek = new Date(today);
                      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
                      return new Date(
                        endOfWeek.getTime() + 24 * 60 * 60 * 1000 - 1
                      ).toISOString();
                    }
                    case "lastWeek": {
                      const endOfLastWeek = new Date(today);
                      endOfLastWeek.setDate(
                        today.getDate() - today.getDay() - 1
                      );
                      return new Date(
                        endOfLastWeek.getTime() + 24 * 60 * 60 * 1000 - 1
                      ).toISOString();
                    }
                    case "thisMonth": {
                      const endOfMonth = new Date(
                        today.getFullYear(),
                        today.getMonth() + 1,
                        0
                      );
                      return new Date(
                        endOfMonth.getTime() + 24 * 60 * 60 * 1000 - 1
                      ).toISOString();
                    }
                    case "lastMonth": {
                      const endOfLastMonth = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        0
                      );
                      return new Date(
                        endOfLastMonth.getTime() + 24 * 60 * 60 * 1000 - 1
                      ).toISOString();
                    }
                    case "custom": {
                      // Create end date in local timezone to avoid timezone shifts
                      if (!customEndDate) {
                        return new Date(
                          today.getTime() + 24 * 60 * 60 * 1000 - 1
                        ).toISOString();
                      }
                      const [endYear, endMonth, endDay] = customEndDate
                        .split("-")
                        .map(Number);
                      const endDate = new Date(
                        endYear,
                        endMonth - 1,
                        endDay,
                        23,
                        59,
                        59,
                        999
                      );
                      return endDate.toISOString();
                    }
                    default:
                      return new Date(
                        today.getTime() + 24 * 60 * 60 * 1000 - 1
                      ).toISOString();
                  }
                })(),
              })
            }
            className="h-10 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Invoice</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-6">
        <div className="card p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-secondary">
              Total Time
            </div>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-primary">
            {secondsToHMS(reportData.totalTime)}
          </div>
        </div>

        <div className="card p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-secondary">
              Billable Time
            </div>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-primary">
            {secondsToHMS(reportData.billableTime)}
          </div>
        </div>

        <div className="card p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-secondary">
              Active Projects
            </div>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-primary">
            {reportData.totalProjects}
          </div>
        </div>

        <div className="card p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-secondary">
              Productivity
            </div>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-primary">
            {reportData.productivity}%
          </div>
        </div>

        {/* New Revenue Cards */}
        <div className="card p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-secondary">
              Gross Revenue
            </div>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-primary">
            {formatCurrency(
              reportData.totalGrossRevenue,
              userSettings.currency
            )}
          </div>
        </div>

        <div className="card p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-secondary">
              Net Revenue
            </div>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-primary">
            {formatCurrency(reportData.totalNetRevenue, userSettings.currency)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Daily Hours Chart */}
        <div className="card p-3 sm:p-4 lg:p-6">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-primary mb-3 sm:mb-4">
            Daily Hours
          </h3>
          {reportData.dailyHours.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted text-sm">
              No data for selected period
            </div>
          ) : (
            <div
              className={`space-y-2 sm:space-y-3 ${
                reportData.dailyHours.length > 7
                  ? "max-h-64 sm:max-h-72 lg:max-h-80 overflow-y-auto scrollbar-thin"
                  : ""
              }`}
            >
              {reportData.dailyHours.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="text-sm font-medium text-secondary w-14 sm:w-16 lg:w-20 flex-shrink-0">
                    <div className="text-xs sm:text-sm">{day.day}</div>
                    <div className="text-xs text-muted">
                      {day.formattedDate}
                    </div>
                  </div>
                  <div className="flex-1 mx-2 sm:mx-3 lg:mx-4">
                    <div className="w-full bg-surface-secondary rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 sm:h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (day.totalSeconds / (12 * 3600)) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-primary w-10 sm:w-12 lg:w-16 text-right font-mono">
                    {secondsToHMS(day.totalSeconds).substring(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Breakdown */}
        <div className="card p-3 sm:p-4 lg:p-6">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-primary mb-3 sm:mb-4">
            Project Breakdown
          </h3>
          {reportData.projectBreakdown.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted text-sm">
              No project data for selected period
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {reportData.projectBreakdown.map((project, index) => (
                <div key={index} className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <span className="text-xs sm:text-sm font-medium text-primary truncate">
                        {project.name}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-primary font-mono ml-2 flex-shrink-0">
                      {secondsToHMS(project.time)}
                    </span>
                  </div>
                  <div className="w-full bg-surface-secondary rounded-full h-1.5 sm:h-2">
                    <div
                      className="h-1.5 sm:h-2 rounded-full"
                      style={{
                        backgroundColor: project.color,
                        width: `${project.percentage}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Breakdown - New Section */}
      <div className="card p-3 sm:p-4 lg:p-6">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-primary mb-3 sm:mb-4">
          Revenue Breakdown by Project
        </h3>
        {reportData.revenueBreakdown.length === 0 ||
        reportData.totalGrossRevenue === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted text-sm">
            No billable projects or revenue data for selected period
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {reportData.revenueBreakdown
              .filter((project) => project.grossRevenue > 0)
              .map((project, index) => (
                <div
                  key={index}
                  className="border border-theme rounded-lg p-3 sm:p-4 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.projectColor }}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-primary truncate">
                          {project.projectName}
                        </h4>
                        {project.clientName && (
                          <p className="text-xs text-secondary">
                            {project.clientName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(
                          project.grossRevenue,
                          userSettings.currency
                        )}
                      </div>
                      <div className="text-xs text-secondary">
                        {formatCurrency(
                          project.hourlyRate,
                          userSettings.currency
                        )}
                        /hr
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs">
                    <div>
                      <div className="text-muted">Hours</div>
                      <div className="font-medium text-primary">
                        {project.billableHours.toFixed(1)}h
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Entries</div>
                      <div className="font-medium text-primary">
                        {project.entriesCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Net Revenue</div>
                      <div className="font-medium text-primary">
                        {formatCurrency(
                          project.netRevenue,
                          userSettings.currency
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Tax</div>
                      <div className="font-medium text-primary">
                        {formatCurrency(
                          project.grossRevenue - project.netRevenue,
                          userSettings.currency
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Revenue Summary */}
            <div className="border-t border-theme pt-3 sm:pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-primary">
                  Total Revenue Summary
                </h5>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs">
                <div>
                  <div className="text-muted">Billable Hours</div>
                  <div className="font-medium text-primary">
                    {reportData.totalBillableHours.toFixed(1)}h
                  </div>
                </div>
                <div>
                  <div className="text-muted">Gross Revenue</div>
                  <div className="font-medium text-primary">
                    {formatCurrency(
                      reportData.totalGrossRevenue,
                      userSettings.currency
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Tax Amount</div>
                  <div className="font-medium text-primary">
                    {formatCurrency(
                      reportData.totalTaxAmount,
                      userSettings.currency
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Net Revenue</div>
                  <div className="font-medium text-primary">
                    {formatCurrency(
                      reportData.totalNetRevenue,
                      userSettings.currency
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time Entries Table */}
      <div className="card p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-primary">
            Time Entries
          </h3>
          <span className="text-xs sm:text-sm text-muted">
            {reportData.filteredEntries.length} entries
          </span>
        </div>

        {reportData.filteredEntries.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted text-sm">
            No time entries for selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-80 sm:max-h-96 overflow-y-auto scrollbar-thin border border-theme rounded-lg">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-surface border-b border-theme sticky top-0">
                  <tr>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-primary text-xs sm:text-sm">
                      Date
                    </th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-primary text-xs sm:text-sm">
                      Project
                    </th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-primary text-xs sm:text-sm hidden sm:table-cell">
                      Description
                    </th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-primary text-xs sm:text-sm">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.filteredEntries.map((entry) => {
                    const project = projects.find(
                      (p) => p.id === entry.project_id
                    );
                    return (
                      <tr key={entry.id} className="border-b border-theme">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-primary text-xs sm:text-sm">
                          <div className="flex flex-col">
                            <span>
                              {formatDate(new Date(entry.start_time))}
                            </span>
                            {/* Show description on mobile */}
                            {entry.description && (
                              <span className="text-xs text-muted sm:hidden mt-0.5 truncate max-w-[120px]">
                                {entry.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                          {project ? (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div
                                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: project.color }}
                              ></div>
                              <span className="truncate text-xs sm:text-sm">
                                {project.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted text-xs sm:text-sm">
                              No Project
                            </span>
                          )}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-primary text-xs sm:text-sm hidden sm:table-cell">
                          <span className="truncate block max-w-xs">
                            {entry.description || "No description"}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-mono text-xs sm:text-sm">
                          {secondsToHMS(entry.duration || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
