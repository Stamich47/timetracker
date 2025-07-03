import React, { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { timeEntriesApi, type TimeEntry } from "../lib/timeEntriesApi";
import { projectsApi, type Project } from "../lib/projectsApi";
import { useAuth } from "../hooks/useAuth";

interface TimeEntriesContextType {
  timeEntries: TimeEntry[];
  projects: Project[];
  loading: boolean;
  error: string | null;
  refreshTimeEntries: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  addTimeEntry: (entry: TimeEntry) => void;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;
}

const TimeEntriesContext = createContext<TimeEntriesContextType | undefined>(
  undefined
);

// Export the context for use in hooks
export { TimeEntriesContext };

// Hook for consuming the context - moved to separate file to avoid Fast Refresh issues

interface TimeEntriesProviderProps {
  children: React.ReactNode;
}

export const TimeEntriesProvider: React.FC<TimeEntriesProviderProps> = ({
  children,
}) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const refreshTimeEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const [entriesData, projectsData] = await Promise.all([
        timeEntriesApi.getTimeEntries(),
        projectsApi.getProjects(),
      ]);
      setTimeEntries(entriesData);
      setProjects(projectsData);
    } catch (err) {
      console.error("Error loading time entries:", err);
      setError("Failed to load time entries. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    try {
      setError(null);
      const [entriesData, projectsData] = await Promise.all([
        timeEntriesApi.getTimeEntries(),
        projectsApi.getProjects(),
      ]);
      setTimeEntries(entriesData);
      setProjects(projectsData);
    } catch (err) {
      console.error("Error loading time entries:", err);
      setError("Failed to load time entries. Please try again.");
    }
  };

  const addTimeEntry = (entry: TimeEntry) => {
    setTimeEntries((prev) => [entry, ...prev]);
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const deleteTimeEntry = (id: string) => {
    setTimeEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  // Load initial data - only after auth is ready
  useEffect(() => {
    if (!authLoading) {
      refreshTimeEntries();
    }
  }, [authLoading]);

  // Set up real-time subscription for time entries - only after auth is ready
  useEffect(() => {
    if (authLoading) return; // Don't set up subscription until auth is ready

    const userId = user?.id || "8c9c14aa-9be6-460c-b3b4-833a97431c4f"; // Fallback for development

    const subscription = supabase
      .channel("time_entries_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `user_id=eq.${userId}`, // Use dynamic user ID
        },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              // Fetch the full entry with project details
              timeEntriesApi.getTimeEntries().then((entries) => {
                const newEntry = entries.find((e) => e.id === payload.new.id);
                if (newEntry) {
                  setTimeEntries((prev) => {
                    const exists = prev.some((e) => e.id === newEntry.id);
                    if (!exists) {
                      return [newEntry, ...prev];
                    }
                    return prev;
                  });
                }
              });
              break;

            case "UPDATE":
              // Fetch the updated entry with project details
              timeEntriesApi.getTimeEntries().then((entries) => {
                const updatedEntry = entries.find(
                  (e) => e.id === payload.new.id
                );
                if (updatedEntry) {
                  setTimeEntries((prev) =>
                    prev.map((entry) =>
                      entry.id === updatedEntry.id ? updatedEntry : entry
                    )
                  );
                }
              });
              break;

            case "DELETE":
              setTimeEntries((prev) =>
                prev.filter((entry) => entry.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [authLoading, user?.id]);

  const value: TimeEntriesContextType = {
    timeEntries,
    projects,
    loading,
    error,
    refreshTimeEntries,
    silentRefresh,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
  };

  return (
    <TimeEntriesContext.Provider value={value}>
      {children}
    </TimeEntriesContext.Provider>
  );
};
