import { useState, useEffect } from "react";
import { settingsApi } from "../lib/settingsApi";

export const useTimeFormat = () => {
  const [is24Hour, setIs24Hour] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeFormat();

    // Listen for storage changes (in case settings are updated elsewhere)
    const handleStorageChange = () => {
      loadTimeFormat();
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for settings updates within the same tab
    const handleSettingsUpdate = () => {
      loadTimeFormat();
    };

    window.addEventListener("settingsUpdated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settingsUpdated", handleSettingsUpdate);
    };
  }, []);

  const loadTimeFormat = async () => {
    try {
      const settings = await settingsApi.getSettings();
      setIs24Hour(settings?.time_format === "24h");
    } catch (error) {
      console.error("Error loading time format:", error);
      // Default to 12h format
      setIs24Hour(false);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeFormat = async (use24Hour: boolean) => {
    try {
      const settings = await settingsApi.getSettings();
      await settingsApi.updateSettings({
        ...settings,
        time_format: use24Hour ? "24h" : "12h",
      });
      setIs24Hour(use24Hour);

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("settingsUpdated"));
    } catch (error) {
      console.error("Error updating time format:", error);
    }
  };

  return {
    is24Hour,
    loading,
    updateTimeFormat,
    refreshTimeFormat: loadTimeFormat,
  };
};
