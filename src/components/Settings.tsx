import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from "react";
import {
  Settings as SettingsIcon,
  User,
  Users,
  Clock,
  DollarSign,
  Download,
  Upload,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Check,
  ChevronDown,
} from "lucide-react";
import { settingsApi, type UserSettings } from "../lib/settingsApi";
import {
  importApi,
  type ImportResult,
  type ImportPreview,
} from "../lib/importApi";
import ImportPreviewModal from "./ImportPreviewModal";
import { useTheme } from "../hooks/useTheme";
import { useTimeEntries } from "../hooks/useTimeEntries";
import { toast } from "../hooks/useToast";

// Minimalist Theme Selector Component
const MinimalThemeSelector: React.FC = () => {
  const { themeType, setTheme, availableThemes } = useTheme();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-primary">App Theme</div>
          <div className="text-sm text-secondary">
            Choose your preferred color scheme
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
              themeType === theme.id
                ? "border-success bg-success/10 text-success"
                : "border-theme hover:border-theme hover:bg-surface-hover text-secondary hover:text-primary"
            }`}
            title={theme.name}
          >
            {/* Simple color indicator */}
            <div
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <span className="font-medium">{theme.name}</span>

            {/* Selected indicator */}
            {themeType === theme.id && (
              <Check className="w-3 h-3 text-success ml-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

interface SettingsProps {
  showUnsavedModal: boolean;
  setShowUnsavedModal: (open: boolean) => void;
  handleSaveAndLeave: () => void;
  handleDiscardAndLeave: () => void;
  hasUnsavedChanges: boolean;
  setPendingNavigation: (cb: null | (() => void)) => void;
  initialSettings: UserSettings | null;
  setInitialSettings: (settings: UserSettings | null) => void;
  settingsDirty: boolean; // NEW: track dirty state from App
  setSettingsDirty: (dirty: boolean) => void; // NEW: update dirty state from App
}

const Settings = forwardRef<SettingsHandle, Partial<SettingsProps>>(
  (props, ref) => {
    // Helper to log differences between two UserSettings objects
    // Exclude backend-only fields from dirty check and diff logger
    const EXCLUDED_FIELDS: (keyof UserSettings | string)[] = useMemo(
      () => ["updated_at", "created_at"],
      []
    );
    // Diff logger removed

    const defaultSettings: UserSettings = useMemo(
      () => ({
        full_name: "",
        email: "",
        timezone: "UTC",
        email_notifications: true,
        reminder_notifications: true,
        weekly_reports: true,
        auto_start: false,
        reminder_interval: 15,
        hourly_rate: 0,
        currency: "USD",
        tax_rate: 0,
        theme: "light",
        language: "en",
        date_format: "MM/DD/YYYY",
        time_format: "12h",
        // Add missing business fields for type safety
        business_name: "",
        business_email: "",
        business_phone: "",
        business_address: "",
      }),
      []
    );
    const [settings, setSettings] = useState<UserSettings>(
      props.initialSettings || defaultSettings
    );

    // Sync settings state with initialSettings prop after save
    useEffect(() => {
      if (props.initialSettings) {
        setSettings(props.initialSettings);
      }
    }, [props.initialSettings]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(
      null
    );
    const [showQuickStartGuide, setShowQuickStartGuide] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [dataManagementCollapsed, setDataManagementCollapsed] =
      useState(true); // Collapsed by default
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { refreshTimeEntries } = useTimeEntries();

    // Load settings on component mount
    useEffect(() => {
      const loadSettings = async () => {
        try {
          setLoading(true);
          const userSettings = await settingsApi.getSettings();
          if (userSettings) {
            setSettings(userSettings);
            props.setInitialSettings?.(userSettings);
          }
        } catch (error) {
          console.error("Error loading settings:", error);
          toast.error("Error loading settings. Please try again.");
        } finally {
          setLoading(false);
        }
      };

      loadSettings();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    const handleSettingChange = (
      key: keyof UserSettings,
      value: string | number | boolean
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
      try {
        setSaving(true);
        await settingsApi.updateSettings(settings);
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent("settingsUpdated"));
        // Update initialSettings after successful save
        props.setInitialSettings?.(settings);
        props.setSettingsDirty?.(false); // Reset dirty state after save
        toast.success("Settings saved successfully!");
        return settings; // Return the saved settings
      } catch (error) {
        console.error("Error saving settings:", error);
        toast.error("Error saving settings. Please try again.");
        return null;
      } finally {
        setSaving(false);
      }
    };

    const handleExport = async (format: "json" | "csv") => {
      try {
        setShowExportModal(false);
        if (format === "csv") {
          await settingsApi.exportUserDataAsCSV();
        } else {
          await settingsApi.exportUserData();
        }
        toast.success("Data exported successfully!");
      } catch (error) {
        console.error("Error exporting data:", error);
        toast.error("Error exporting data. Please try again.");
      }
    };

    const handleShowExportModal = () => setShowExportModal(true);

    const handleImport = () => {
      fileInputRef.current?.click();
    };

    const handleFileUpload = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset previous results
      setImportResult(null);
      setImportPreview(null);

      try {
        setImporting(true);
        // Read file content
        const text = await file.text();
        // Validate CSV format (new format)
        const validation = importApi.validateTimeTrackerCSV(text);
        if (!validation.valid) {
          setImportResult({
            success: false,
            message: validation.message,
            imported: { clients: 0, projects: 0, timeEntries: 0 },
            errors: [validation.message],
          });
          return;
        }
        // Generate preview (new format)
        const preview = await importApi.previewTimeTrackerData(text);
        setImportPreview(preview);
        setShowPreviewModal(true);
      } catch (error) {
        setImportResult({
          success: false,
          message: `Preview failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          imported: { clients: 0, projects: 0, timeEntries: 0 },
          errors: [String(error)],
        });
      } finally {
        setImporting(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    const handleConfirmImport = async (editedPreview: ImportPreview) => {
      try {
        setImporting(true);
        const result = await importApi.importFromPreview(editedPreview);
        setImportResult(result);
        // Refresh all time entries and projects after import
        await refreshTimeEntries();
        setShowPreviewModal(false);
      } catch (error) {
        setImportResult({
          success: false,
          message: `Import failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          imported: { clients: 0, projects: 0, timeEntries: 0 },
          errors: [String(error)],
        });
      } finally {
        setImporting(false);
      }
    };

    // Save initial settings for dirty check
    // Destructure props for useEffect dependencies
    const { initialSettings, setInitialSettings } = props;
    useEffect(() => {
      if (!loading && initialSettings === null) {
        setInitialSettings?.(settings);
      }
    }, [loading, settings, initialSettings, setInitialSettings]);

    // Check for unsaved changes
    // Compare only user-editable fields for dirty check
    const getComparableSettings = useCallback(
      (obj: UserSettings | null | undefined) => {
        if (!obj) return obj;
        // Use Record<string, unknown> to allow deleting arbitrary fields
        const clone: Record<string, unknown> = { ...obj };
        EXCLUDED_FIELDS.forEach((field) => {
          delete clone[field as string];
        });
        return clone;
      },
      [EXCLUDED_FIELDS]
    );
    const hasUnsavedChanges =
      props.initialSettings &&
      JSON.stringify(getComparableSettings(settings)) !==
        JSON.stringify(getComparableSettings(props.initialSettings));
    // Removed debug logs

    // Intercept navigation away (tab change)
    useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue =
            "You have unsaved changes. Are you sure you want to leave?";
          return e.returnValue;
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Intercept internal navigation (tab change)
    useEffect(() => {
      const handleTabChange = (e: CustomEvent) => {
        if (hasUnsavedChanges) {
          e.preventDefault?.();
          props.setShowUnsavedModal?.(true);
          props.setPendingNavigation?.(() => () => {
            window.dispatchEvent(new CustomEvent("proceedTabChange"));
          });
        }
      };
      window.addEventListener(
        "settingsTabChange",
        handleTabChange as EventListener
      );
      return () =>
        window.removeEventListener(
          "settingsTabChange",
          handleTabChange as EventListener
        );
    }, [hasUnsavedChanges, props]);

    // Update dirty state in App when settings change
    useEffect(() => {
      const { setSettingsDirty, initialSettings } = props;
      if (setSettingsDirty) {
        const dirty =
          initialSettings &&
          JSON.stringify(getComparableSettings(settings)) !==
            JSON.stringify(getComparableSettings(initialSettings));
        // Only set dirty if initialSettings is not null
        setSettingsDirty(!!dirty);
      }
    }, [settings, props, getComparableSettings]);

    // Expose saveSettings method to parent component
    useImperativeHandle(ref, () => ({
      saveSettings: async () => {
        const result = await handleSave();
        return result;
      },
    }));

    return (
      <>
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-primary">Loading settings...</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-surface rounded-lg border border-theme">
                  <SettingsIcon className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile Settings + Theme */}
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="w-5 h-5 text-warning" />
                    <h2 className="text-lg font-semibold text-primary">
                      Profile
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="settings-full-name"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Full Name
                      </label>
                      <input
                        id="settings-full-name"
                        name="full_name"
                        type="text"
                        value={settings.full_name || ""}
                        onChange={(e) =>
                          handleSettingChange("full_name", e.target.value)
                        }
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="settings-email"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Email
                      </label>
                      <input
                        id="settings-email"
                        name="email"
                        type="email"
                        value={settings.email}
                        onChange={(e) =>
                          handleSettingChange("email", e.target.value)
                        }
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="settings-timezone"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Timezone
                      </label>
                      <select
                        id="settings-timezone"
                        name="timezone"
                        value={settings.timezone}
                        onChange={(e) =>
                          handleSettingChange("timezone", e.target.value)
                        }
                        className="input-field"
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">
                          Pacific Time
                        </option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>

                    {/* App Theme moved here */}
                    <div className="pt-2">
                      <MinimalThemeSelector />
                    </div>
                  </div>
                </div>

                {/* Business Information (now next to Profile) */}
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-primary">
                      Business Information
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="settings-business-name"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Business Name
                      </label>
                      <input
                        id="settings-business-name"
                        name="business_name"
                        type="text"
                        value={settings.business_name || ""}
                        onChange={(e) =>
                          handleSettingChange("business_name", e.target.value)
                        }
                        className="input-field"
                        placeholder="Your business or company name"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="settings-business-email"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Business Email
                      </label>
                      <input
                        id="settings-business-email"
                        name="business_email"
                        type="email"
                        value={settings.business_email || ""}
                        onChange={(e) =>
                          handleSettingChange("business_email", e.target.value)
                        }
                        className="input-field"
                        placeholder="contact@yourbusiness.com"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="settings-business-phone"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Business Phone
                      </label>
                      <input
                        id="settings-business-phone"
                        name="business_phone"
                        type="tel"
                        value={settings.business_phone || ""}
                        onChange={(e) =>
                          handleSettingChange("business_phone", e.target.value)
                        }
                        className="input-field"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="settings-business-address"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Business Address
                      </label>
                      <textarea
                        id="settings-business-address"
                        name="business_address"
                        value={settings.business_address || ""}
                        onChange={(e) =>
                          handleSettingChange(
                            "business_address",
                            e.target.value
                          )
                        }
                        className="input-field"
                        placeholder="123 Main St, City, Country"
                        rows={2}
                      />
                    </div>
                    <div className="text-xs text-secondary">
                      This information will be used to auto-populate your
                      invoices. You can override it per-invoice.
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Tracking and Billing side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Time Tracking Settings */}
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-primary">
                      Time Tracking
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-primary">
                          Auto-start Timer
                        </div>
                        <div className="text-sm text-secondary">
                          Start timer when opening app
                        </div>
                      </div>
                      <input
                        id="settings-auto-start"
                        name="auto_start"
                        type="checkbox"
                        checked={settings.auto_start || false}
                        onChange={(e) =>
                          handleSettingChange("auto_start", e.target.checked)
                        }
                        className="w-4 h-4 text-primary border-theme rounded focus:ring-primary focus:ring-2"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="settings-reminder-interval"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Reminder Interval (minutes)
                      </label>
                      <select
                        id="settings-reminder-interval"
                        name="reminder_interval"
                        value={settings.reminder_interval || 15}
                        onChange={(e) =>
                          handleSettingChange(
                            "reminder_interval",
                            Number(e.target.value)
                          )
                        }
                        className="input-field"
                      >
                        <option value={5}>5 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="settings-time-format"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Time Format
                      </label>
                      <select
                        id="settings-time-format"
                        name="time_format"
                        value={settings.time_format || "12h"}
                        onChange={(e) =>
                          handleSettingChange("time_format", e.target.value)
                        }
                        className="input-field"
                      >
                        <option value="12h">12 Hour (AM/PM)</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Billing Settings */}
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-primary">
                      Billing
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="settings-hourly-rate"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Default Hourly Rate
                      </label>
                      <div className="relative">
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-muted">
                          $
                        </span>
                        <input
                          id="settings-hourly-rate"
                          name="hourly_rate"
                          type="number"
                          value={settings.hourly_rate || 0}
                          onChange={(e) =>
                            handleSettingChange(
                              "hourly_rate",
                              Number(e.target.value)
                            )
                          }
                          className="input-field pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="settings-currency"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Currency
                      </label>
                      <select
                        id="settings-currency"
                        name="currency"
                        value={settings.currency}
                        onChange={(e) =>
                          handleSettingChange("currency", e.target.value)
                        }
                        className="input-field"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD (C$)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="settings-tax-rate"
                        className="block text-sm font-medium text-primary mb-2"
                      >
                        Tax Rate (%)
                      </label>
                      <input
                        id="settings-tax-rate"
                        name="tax_rate"
                        type="number"
                        value={settings.tax_rate || 0}
                        onChange={(e) =>
                          handleSettingChange(
                            "tax_rate",
                            Number(e.target.value)
                          )
                        }
                        className="input-field"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="card overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-surface-hover transition-colors"
                  onClick={() =>
                    setDataManagementCollapsed(!dataManagementCollapsed)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-red-600" />
                      <h2 className="text-lg font-semibold text-primary">
                        Data Management
                      </h2>
                    </div>
                    <div
                      className={`transition-transform duration-300 ease-in-out ${
                        dataManagementCollapsed ? "rotate-0" : "rotate-180"
                      }`}
                    >
                      <ChevronDown className="h-5 w-5 text-muted" />
                    </div>
                  </div>
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    dataManagementCollapsed
                      ? "max-h-0 opacity-0"
                      : "max-h-[2000px] opacity-100"
                  }`}
                >
                  <div className="px-6 pb-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <button
                            onClick={handleShowExportModal}
                            className="btn-secondary justify-center w-full"
                          >
                            <Upload className="w-4 h-4" />
                            Export All Data
                          </button>
                          <p className="text-xs text-secondary text-center">
                            Complete backup (choose format)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <button
                            onClick={handleImport}
                            disabled={importing}
                            className="btn-secondary justify-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {importing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                Import Data
                              </>
                            )}
                          </button>
                          <p className="text-xs text-secondary text-center">
                            From CSV file (time entries)
                          </p>
                        </div>
                      </div>

                      {/* Export vs Reports Export Clarification */}
                      <div className="p-3 bg-info/10 border border-info/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-info mt-0.5" />
                          <div className="text-xs text-info">
                            <p className="font-medium mb-1">Export Options:</p>
                            <ul className="space-y-1">
                              <li>
                                <strong>Export All Data:</strong> Complete
                                backup including all settings, clients,
                                projects, and time entries in your choice of
                                format
                              </li>
                              <li>
                                <strong>Reports Export:</strong> For filtered
                                time entries only, go to Reports → Export CSV
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Import Instructions */}
                    <div className="mt-4 p-4 bg-info/10 border border-info/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-info mt-0.5" />
                        <div className="text-sm text-info">
                          <strong>CSV Import Instructions:</strong>
                          <div className="mt-2 space-y-3">
                            <div>
                              <p className="font-medium mb-1">
                                Required CSV Columns (exact names):
                              </p>
                              <ul className="ml-4 list-disc space-y-1 text-xs font-mono bg-white/20 p-2 rounded">
                                <li>
                                  <span className="font-semibold">Project</span>{" "}
                                  - Project name
                                </li>
                                <li>
                                  <span className="font-semibold">Client</span>{" "}
                                  - Client name (optional)
                                </li>
                                <li>
                                  <span className="font-semibold">
                                    Description
                                  </span>{" "}
                                  - Task description (optional)
                                </li>
                                <li>
                                  <span className="font-semibold">
                                    start_time
                                  </span>{" "}
                                  - Start time (ISO 8601, e.g.
                                  2024-05-01T09:00:00Z)
                                </li>
                                <li>
                                  <span className="font-semibold">
                                    end_time
                                  </span>{" "}
                                  - End time (ISO 8601, e.g.
                                  2024-05-01T10:00:00Z)
                                </li>
                                <li>
                                  <span className="font-semibold">Tags</span> -
                                  Comma-separated tags (optional)
                                </li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium">Steps:</p>
                              <ol className="mt-1 ml-4 list-decimal space-y-1">
                                <li>
                                  Export your time tracking data as a CSV file
                                  from Reports
                                </li>
                                <li>
                                  Ensure your CSV has the exact column names
                                  listed above
                                </li>
                                <li>Import the file here</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Import Result */}
                    {importResult && (
                      <div
                        className={`mt-4 p-4 rounded-lg border ${
                          importResult.success
                            ? "bg-success/10 border-success/30"
                            : "bg-error/10 border-error/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {importResult.success ? (
                            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-error mt-0.5" />
                          )}
                          <div
                            className={`text-sm ${
                              importResult.success
                                ? "text-success"
                                : "text-error"
                            }`}
                          >
                            <p className="font-medium">
                              {importResult.message}
                            </p>
                            {importResult.success && (
                              <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="font-medium">Clients:</span>{" "}
                                  {importResult.imported.clients}
                                </div>
                                <div>
                                  <span className="font-medium">Projects:</span>{" "}
                                  {importResult.imported.projects}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Time Entries:
                                  </span>{" "}
                                  {importResult.imported.timeEntries}
                                </div>
                              </div>
                            )}
                            {importResult.errors.length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer font-medium">
                                  View Errors ({importResult.errors.length})
                                </summary>
                                <ul className="mt-1 ml-4 list-disc space-y-1">
                                  {importResult.errors
                                    .slice(0, 10)
                                    .map((error, index) => (
                                      <li key={index}>{error}</li>
                                    ))}
                                  {importResult.errors.length > 10 && (
                                    <li>
                                      ... and {importResult.errors.length - 10}{" "}
                                      more errors
                                    </li>
                                  )}
                                </ul>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                      <div className="text-sm text-warning">
                        <strong>Note:</strong> "Export All Data" creates a
                        complete backup of your account including settings,
                        clients, projects, and ALL time entries. You can choose
                        between JSON (technical format) or CSV (spreadsheet
                        format). For filtered time reports, use the CSV export
                        in the Reports section instead.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Help & Support Section */}
              <div className="col-span-1 lg:col-span-2">
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-5 h-5 text-info" />
                    <h2 className="text-lg font-semibold text-primary">
                      Help & Support
                    </h2>
                  </div>

                  {!showQuickStartGuide ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-theme">
                        <div>
                          <div className="font-medium text-primary">
                            Quick Start Guide
                          </div>
                          <div className="text-sm text-secondary">
                            Learn how to use Time Tracker effectively
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowQuickStartGuide(true);
                          }}
                          className="btn-secondary"
                        >
                          View Guide
                        </button>
                      </div>

                      <div className="p-4 bg-surface rounded-lg border border-theme">
                        <h4 className="font-medium text-primary mb-2">
                          Tips & Tricks
                        </h4>
                        <ul className="space-y-1 text-sm text-secondary">
                          <li>• Use project colors for quick identification</li>
                          <li>
                            • Add detailed descriptions for better invoicing
                          </li>
                          <li>• Set up clients before creating projects</li>
                          <li>• Export data regularly for backup</li>
                          <li>• Use the timer for accurate time tracking</li>
                          <li>
                            • Review reports regularly to track productivity
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-primary">
                          Quick Start Guide
                        </h3>
                        <button
                          onClick={() => setShowQuickStartGuide(false)}
                          className="btn-secondary text-sm"
                        >
                          Close Guide
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-surface rounded-lg border border-theme">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-medium text-primary">
                              Welcome to Time Tracker
                            </h4>
                          </div>
                          <p className="text-sm text-secondary mb-3">
                            Time Tracker helps you monitor your work hours,
                            manage projects, and generate professional invoices.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <h5 className="font-medium text-primary text-sm">
                                Track Time
                              </h5>
                              <p className="text-xs text-secondary">
                                Start/stop timers for different projects
                              </p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                              <h5 className="font-medium text-primary text-sm">
                                Generate Invoices
                              </h5>
                              <p className="text-xs text-secondary">
                                Create professional invoices from tracked time
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-surface rounded-lg border border-theme">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="font-medium text-primary">
                              Create Your First Client
                            </h4>
                          </div>
                          <p className="text-sm text-secondary mb-3">
                            Clients help you organize your work and generate
                            accurate invoices.
                          </p>
                          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded border">
                            <h5 className="font-medium text-primary text-sm mb-2">
                              Steps to add a client:
                            </h5>
                            <ol className="text-xs text-secondary space-y-1 list-decimal list-inside">
                              <li>Go to the "Clients" tab</li>
                              <li>Click "Add Client"</li>
                              <li>
                                Fill in client details (name, email, etc.)
                              </li>
                              <li>Set billing preferences</li>
                            </ol>
                          </div>
                        </div>

                        <div className="p-4 bg-surface rounded-lg border border-theme">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="font-medium text-primary">
                              Set Up Your First Project
                            </h4>
                          </div>
                          <p className="text-sm text-secondary mb-3">
                            Projects help you organize your time entries and set
                            billing rates.
                          </p>
                          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded border">
                            <h5 className="font-medium text-primary text-sm mb-2">
                              Project setup tips:
                            </h5>
                            <ul className="text-xs text-secondary space-y-1 list-disc list-inside">
                              <li>Choose a descriptive project name</li>
                              <li>Select the appropriate client</li>
                              <li>Set your hourly rate for billing</li>
                              <li>Choose a color for easy identification</li>
                            </ul>
                          </div>
                        </div>

                        <div className="p-4 bg-surface rounded-lg border border-theme">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                              <SettingsIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <h4 className="font-medium text-primary">
                              Configure Your Settings
                            </h4>
                          </div>
                          <p className="text-sm text-secondary mb-3">
                            Personalize your experience and set up billing
                            defaults.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                              <h5 className="font-medium text-primary text-sm mb-1">
                                Personal Settings
                              </h5>
                              <ul className="text-xs text-secondary space-y-1">
                                <li>• Choose theme (Dark/Light)</li>
                                <li>• Set timezone</li>
                                <li>• Configure date formats</li>
                              </ul>
                            </div>
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                              <h5 className="font-medium text-primary text-sm mb-1">
                                Billing Settings
                              </h5>
                              <ul className="text-xs text-secondary space-y-1">
                                <li>• Default hourly rate</li>
                                <li>• Currency preference</li>
                                <li>• Tax rate setup</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="font-medium text-success">
                              You're All Set!
                            </h4>
                          </div>
                          <p className="text-sm text-success mb-3">
                            Congratulations! You're ready to start using Time
                            Tracker effectively.
                          </p>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                            <h5 className="font-medium text-success text-sm mb-2">
                              Next Steps:
                            </h5>
                            <ul className="text-xs text-success space-y-1 list-disc list-inside">
                              <li>Click the timer button to start tracking</li>
                              <li>Add descriptions to your time entries</li>
                              <li>Review your time in the Reports section</li>
                              <li>Generate your first invoice when ready</li>
                            </ul>
                          </div>
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              💡 Tip: Navigate to the Timer tab to access the
                              start/stop timer controls and project selection!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </>
          )}

          {/* Hidden file input for CSV upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Import Preview Modal */}
          {importPreview && (
            <ImportPreviewModal
              isOpen={showPreviewModal}
              preview={importPreview}
              onClose={() => {
                setShowPreviewModal(false);
                setImportPreview(null);
              }}
              onConfirmImport={handleConfirmImport}
              isImporting={importing}
            />
          )}

          {/* Export Format Selection Modal */}
          {showExportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-surface border border-theme rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <Download className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-primary">
                    Choose Export Format
                  </h3>
                </div>

                <p className="text-sm text-secondary mb-6">
                  Select the format for your complete data backup:
                </p>

                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full p-4 text-left border border-theme rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-info" />
                      <div>
                        <div className="font-medium text-primary">
                          JSON Format
                        </div>
                        <div className="text-xs text-secondary">
                          Single file, technical format, ideal for backups
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full p-4 text-left border border-theme rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-success" />
                      <div>
                        <div className="font-medium text-primary">
                          CSV Format
                        </div>
                        <div className="text-xs text-secondary">
                          4 spreadsheet files, easy to import into Excel/Sheets
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
);

export interface SettingsHandle {
  saveSettings: () => Promise<UserSettings | null>;
}

export default Settings;
