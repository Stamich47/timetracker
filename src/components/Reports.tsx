import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  Loader2,
} from "lucide-react";
import { secondsToHMS, formatDate } from "../utils/timeUtils";
import { useTimeEntries } from "../hooks/useTimeEntries";
import type { TimeEntry } from "../lib/timeEntriesApi";

interface ReportData {
  totalTime: number;
  billableTime: number;
  totalProjects: number;
  productivity: number;
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
  filteredEntries: TimeEntry[];
}

const Reports: React.FC = () => {
  const { timeEntries, projects, loading } = useTimeEntries();
  const [dateRange, setDateRange] = useState("thisWeek");
  const [selectedClientId, setSelectedClientId] = useState<string>(""); // New client filter state

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
  const [customStartDate, setCustomStartDate] = useState(() => {
    // Default to start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return startOfMonth.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    // Default to today
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [reportData, setReportData] = useState<ReportData>({
    totalTime: 0,
    billableTime: 0,
    totalProjects: 0,
    productivity: 0,
    dailyHours: [],
    projectBreakdown: [],
    filteredEntries: [],
  });

  // Handle export functionality
  const handleExport = () => {
    const csvContent = [
      [
        "Date",
        "Client",
        "Project",
        "Description",
        "Duration (hours)",
        "Duration (formatted)",
      ],
      ...reportData.filteredEntries.map((entry) => {
        const project = projects.find((p) => p.id === entry.project_id);
        return [
          formatDate(new Date(entry.start_time)),
          project?.client?.name || "No Client",
          project?.name || "No Project",
          entry.description || "No description",
          (entry.duration! / 3600).toFixed(2),
          secondsToHMS(entry.duration || 0),
        ];
      }),
    ]
      .map((row) => row.join(","))
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

    // Filter time entries by date range and client - use date-only comparison for proper filtering
    const filteredEntries = timeEntries.filter((entry) => {
      // Extract date string directly from start_time to avoid timezone issues
      const entryDateStr = entry.start_time.split("T")[0]; // Gets "2025-06-18" format
      const [entryYear, entryMonth, entryDay] = entryDateStr
        .split("-")
        .map(Number);

      // Get start and end date strings in same format
      const startDateStr = start.toISOString().split("T")[0];
      const [startYear, startMonth, startDay] = startDateStr
        .split("-")
        .map(Number);

      const endDateStr = end.toISOString().split("T")[0];
      const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);

      // Create date objects for comparison (all in local timezone)
      const entryDate = new Date(entryYear, entryMonth - 1, entryDay);
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);

      const inDateRange = entryDate >= startDate && entryDate <= endDate;

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

    setReportData({
      totalTime,
      billableTime,
      totalProjects,
      productivity,
      dailyHours,
      projectBreakdown,
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field text-sm w-full sm:w-auto"
          >
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">
              This Month ({monthYearLabels.thisMonth})
            </option>
            <option value="lastMonth">
              Last Month ({monthYearLabels.lastMonth})
            </option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Client Filter */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="input-field text-sm w-full sm:w-auto"
          >
            <option value="">All Clients</option>
            <option value="NO_CLIENT">Unassigned Projects</option>
            {uniqueClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExport}
            className="btn-secondary w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            <span className="sm:hidden ml-2">Export</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range */}
      {dateRange === "custom" && (
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input-field text-sm w-full"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input-field text-sm w-full"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {secondsToHMS(reportData.totalTime)}
          </div>
          <div className="text-sm text-gray-600">Total Time</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {secondsToHMS(reportData.billableTime)}
          </div>
          <div className="text-sm text-gray-600">Billable Time</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {reportData.totalProjects}
          </div>
          <div className="text-sm text-gray-600">Active Projects</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {reportData.productivity}%
          </div>
          <div className="text-sm text-gray-600">Productivity</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Hours Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Daily Hours
          </h3>
          {reportData.dailyHours.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data for selected period
            </div>
          ) : (
            <div className="space-y-3">
              {reportData.dailyHours.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-600 w-20 flex-shrink-0">
                    <div>{day.day}</div>
                    <div className="text-xs text-gray-500">
                      {day.formattedDate}
                    </div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (day.totalSeconds / (12 * 3600)) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right font-mono">
                    {secondsToHMS(day.totalSeconds).substring(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Breakdown */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Project Breakdown
          </h3>
          {reportData.projectBreakdown.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No project data for selected period
            </div>
          ) : (
            <div className="space-y-4">
              {reportData.projectBreakdown.map((project, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">
                        {project.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {secondsToHMS(project.time)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
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

      {/* Time Entries Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Time Entries</h3>
          <span className="text-sm text-gray-500">
            {reportData.filteredEntries.length} entries
          </span>
        </div>

        {reportData.filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No time entries for selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Project
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
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
                      <tr
                        key={entry.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-700">
                          {formatDate(new Date(entry.start_time))}
                        </td>
                        <td className="py-3 px-4">
                          {project ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: project.color }}
                              ></div>
                              {project.name}
                            </div>
                          ) : (
                            <span className="text-gray-500">No Project</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {entry.description || "No description"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
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
