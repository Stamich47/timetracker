import React, { useState } from "react";
import {
  Clock,
  Play,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { formatDate, formatTime, secondsToHMS } from "../utils/timeUtils";
import { timeEntriesApi, type TimeEntry } from "../lib/timeEntriesApi";
import { type Project } from "../lib/projectsApi";
import { useTimeEntries } from "../hooks/useTimeEntries";
import CustomDropdown from "./CustomDropdown";

const TimeEntries: React.FC = () => {
  const {
    timeEntries,
    projects,
    loading,
    error,
    refreshTimeEntries,
    deleteTimeEntry,
  } = useTimeEntries();

  // State for collapsible dates
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // State for date range filtering
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // Last week
    endDate: new Date().toISOString().split("T")[0], // Today
  });

  // State for editing
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    projectId: "",
    startTime: "",
    endTime: "",
    date: "",
  });

  // Toggle date section collapse
  const toggleDateCollapse = (date: string) => {
    const newCollapsed = new Set(collapsedDates);
    if (newCollapsed.has(date)) {
      newCollapsed.delete(date);
    } else {
      newCollapsed.add(date);
    }
    setCollapsedDates(newCollapsed);
  };

  // Filter time entries by date range
  const filteredTimeEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.start_time).toISOString().split("T")[0];
    return entryDate >= dateRange.startDate && entryDate <= dateRange.endDate;
  });

  // Start editing an entry
  const startEditing = (entry: TimeEntry) => {
    setEditingEntry(entry);
    const startTime = new Date(entry.start_time);
    const endTime = entry.end_time ? new Date(entry.end_time) : new Date();

    setEditForm({
      description: entry.description || "",
      projectId: entry.project_id || "",
      startTime: startTime.toTimeString().slice(0, 5), // HH:MM format
      endTime: endTime.toTimeString().slice(0, 5),
      date: startTime.toISOString().split("T")[0],
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingEntry(null);
    setEditForm({
      description: "",
      projectId: "",
      startTime: "",
      endTime: "",
      date: "",
    });
  };

  // Save edited entry
  const saveEdit = async () => {
    if (!editingEntry) return;

    try {
      const startDateTime = new Date(
        `${editForm.date}T${editForm.startTime}:00`
      );
      const endDateTime = new Date(`${editForm.date}T${editForm.endTime}:00`);

      if (endDateTime <= startDateTime) {
        alert("End time must be after start time");
        return;
      }

      const duration = Math.floor(
        (endDateTime.getTime() - startDateTime.getTime()) / 1000
      );

      await timeEntriesApi.updateTimeEntry(editingEntry.id!, {
        description: editForm.description,
        project_id: editForm.projectId || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration,
      });

      await refreshTimeEntries();
      cancelEditing();
    } catch (error) {
      console.error("Error updating entry:", error);
      alert("Failed to update time entry. Please try again.");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm("Are you sure you want to delete this time entry?")) {
      try {
        await timeEntriesApi.deleteTimeEntry(entryId);
        deleteTimeEntry(entryId); // Update context
      } catch (err) {
        console.error("Error deleting entry:", err);
        // Error will be handled by the context
      }
    }
  };

  const handleRestartEntry = async (entry: TimeEntry) => {
    try {
      // Stop any running timer first
      const activeTimer = await timeEntriesApi.getActiveTimer();
      if (activeTimer) {
        await timeEntriesApi.stopTimer();
      }

      // Start new timer with same details
      await timeEntriesApi.startTimer(
        entry.description || "Continued work",
        entry.project_id
      );

      // Refresh context data to show updated state
      refreshTimeEntries();
    } catch (err) {
      console.error("Error restarting timer:", err);
      // Error will be handled by the context
    }
  };

  const getProjectById = (
    projectId: string | undefined
  ): Project | undefined => {
    return projects.find((p) => p.id === projectId);
  };

  const groupEntriesByDate = (entries: TimeEntry[]) => {
    const groups: { [key: string]: TimeEntry[] } = {};

    entries.forEach((entry) => {
      const date = formatDate(new Date(entry.start_time));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  };

  const calculateDayTotal = (entries: TimeEntry[]): number => {
    return entries.reduce((total, entry) => total + (entry.duration || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-secondary">Loading time entries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
        <button
          onClick={refreshTimeEntries}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const groupedEntries = groupEntriesByDate(filteredTimeEntries);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Time Entries</h1>
          <p className="text-secondary mt-1">
            Track and manage your logged time entries
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-secondary">
            Total:{" "}
            {secondsToHMS(
              filteredTimeEntries.reduce(
                (sum, entry) => sum + (entry.duration || 0),
                0
              )
            )}
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-5 w-5 text-muted" />
            <span className="text-sm font-medium text-primary">
              Date Range:
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="input-field text-sm w-full sm:w-auto h-10"
            />
            <span className="text-muted hidden sm:block">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="input-field text-sm w-full sm:w-auto h-10"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() =>
                setDateRange({
                  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  endDate: new Date().toISOString().split("T")[0],
                })
              }
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium w-full sm:w-auto h-10"
            >
              Last Week
            </button>
            <button
              onClick={() =>
                setDateRange({
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  endDate: new Date().toISOString().split("T")[0],
                })
              }
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium w-full sm:w-auto h-10"
            >
              Last Month
            </button>
          </div>
        </div>
      </div>

      {filteredTimeEntries.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No time entries found
          </h3>
          <p className="text-secondary">
            {timeEntries.length === 0
              ? "Start tracking time to see your entries here."
              : "Try adjusting your date range to see more entries."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEntries.map(([date, entries]) => {
            const isCollapsed = collapsedDates.has(date);
            return (
              <div key={date} className="card overflow-hidden">
                <div
                  className="bg-surface px-6 py-3 border-b border-theme cursor-pointer hover:bg-surface-hover transition-colors"
                  onClick={() => toggleDateCollapse(date)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-muted" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-muted" />
                      )}
                      <h3 className="text-lg font-medium text-primary">
                        {date}
                      </h3>
                    </div>
                    <div className="text-sm text-secondary">
                      Total: {secondsToHMS(calculateDayTotal(entries))} •{" "}
                      {entries.length}{" "}
                      {entries.length === 1 ? "entry" : "entries"}
                    </div>
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="divide-y divide-gray-200">
                    {entries.map((entry) => {
                      const project = getProjectById(entry.project_id);
                      const isEditing = editingEntry?.id === entry.id;

                      if (isEditing) {
                        return (
                          <div key={entry.id} className="p-6 bg-blue-50">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-primary mb-1">
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={editForm.description}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      description: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-theme rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="What did you work on?"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-primary mb-1">
                                  Project
                                </label>
                                <CustomDropdown
                                  value={editForm.projectId}
                                  onChange={(value) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      projectId: value,
                                    }))
                                  }
                                  options={[
                                    { value: "", label: "No Project" },
                                    ...projects
                                      .filter((project) => project.id)
                                      .map((project) => ({
                                        value: project.id!,
                                        label: project.name,
                                      })),
                                  ]}
                                  placeholder="Select project"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-primary mb-1">
                                    Date
                                  </label>
                                  <input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        date: e.target.value,
                                      }))
                                    }
                                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    max={new Date().toISOString().split("T")[0]}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-primary mb-1">
                                    Start Time
                                  </label>
                                  <input
                                    type="time"
                                    value={editForm.startTime}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        startTime: e.target.value,
                                      }))
                                    }
                                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-primary mb-1">
                                    End Time
                                  </label>
                                  <input
                                    type="time"
                                    value={editForm.endTime}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        endTime: e.target.value,
                                      }))
                                    }
                                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={cancelEditing}
                                  className="px-4 py-2 text-sm font-medium text-primary bg-white border border-theme rounded-md hover:bg-surface"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={saveEdit}
                                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={entry.id} className="p-6 hover:bg-surface">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start space-x-3">
                                {project && (
                                  <div
                                    className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                                    style={{
                                      backgroundColor:
                                        project.color || "#3B82F6",
                                    }}
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-primary font-medium">
                                    {entry.description || "No description"}
                                  </p>
                                  {project && (
                                    <p className="text-sm text-secondary mt-1">
                                      {project.name}
                                      {project.client &&
                                        ` • ${project.client.name}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4 ml-4">
                              <div className="text-right">
                                <div className="flex items-center text-sm text-secondary">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatTime(
                                    new Date(entry.start_time)
                                  )} -{" "}
                                  {entry.end_time
                                    ? formatTime(new Date(entry.end_time))
                                    : "Running"}
                                </div>
                                <div className="text-lg font-semibold text-primary mt-1">
                                  {entry.duration
                                    ? secondsToHMS(entry.duration)
                                    : "0:00:00"}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleRestartEntry(entry)}
                                  className="p-2 text-muted hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                  title="Restart timer with same details"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => startEditing(entry)}
                                  className="p-2 text-muted hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit entry"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id!)}
                                  className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Delete entry"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimeEntries;
