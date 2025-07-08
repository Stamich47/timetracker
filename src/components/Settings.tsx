import React, { useState, useEffect, useRef } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Clock,
  DollarSign,
  Download,
  Upload,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Palette,
  Check,
} from "lucide-react";
import { settingsApi, type UserSettings } from "../lib/settingsApi";
import {
  importApi,
  type ImportResult,
  type ImportPreview,
} from "../lib/importApi";
import ImportPreviewModal from "./ImportPreviewModal";
import { useTheme } from "../hooks/useTheme";

// Theme Selector Component
const ThemeSelector: React.FC = () => {
  const { themeType, setTheme, availableThemes } = useTheme();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Choose your preferred color theme for the app
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {availableThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={`group relative p-4 rounded-lg border-2 transition-all ${
              themeType === theme.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {/* Theme Preview */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {theme.name}
                </div>
              </div>
            </div>

            {/* Color palette preview */}
            <div className="flex gap-1 mb-3">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: theme.colors.background }}
              />
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: theme.colors.surface }}
              />
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: theme.colors.secondary }}
              />
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: theme.colors.success }}
              />
            </div>

            {/* Selected indicator */}
            {themeType === theme.id && (
              <div className="absolute top-2 right-2">
                <Check className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
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
    theme: "system",
    language: "en",
    date_format: "MM/dd/yyyy",
    time_format: "12h",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userSettings = await settingsApi.getSettings();
      if (userSettings) {
        setSettings(userSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      alert("Error loading settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await settingsApi.exportUserData();
      alert("Data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data. Please try again.");
    }
  };

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

      // Validate CSV format
      const validation = importApi.validateClockifyCSV(text);
      if (!validation.valid) {
        setImportResult({
          success: false,
          message: validation.message,
          imported: { clients: 0, projects: 0, timeEntries: 0 },
          errors: [validation.message],
        });
        return;
      }

      // Generate preview
      const preview = await importApi.previewClockifyData(text);
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

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
          <span className="ml-3 text-white">Loading settings...</span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-800 rounded-lg">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Settings */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-primary">Profile</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.full_name || ""}
                    onChange={(e) =>
                      handleSettingChange("full_name", e.target.value)
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) =>
                      handleSettingChange("email", e.target.value)
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) =>
                      handleSettingChange("timezone", e.target.value)
                    }
                    className="input-field"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-yellow-600" />
                <h2 className="text-lg font-semibold text-primary">
                  Notifications
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      Email Notifications
                    </div>
                    <div className="text-sm text-gray-600">
                      Receive updates via email
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications || false}
                    onChange={(e) =>
                      handleSettingChange(
                        "email_notifications",
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      Timer Reminders
                    </div>
                    <div className="text-sm text-gray-600">
                      Get reminded to start/stop timer
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reminder_notifications || false}
                    onChange={(e) =>
                      handleSettingChange(
                        "reminder_notifications",
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      Weekly Reports
                    </div>
                    <div className="text-sm text-gray-600">
                      Receive weekly time summaries
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.weekly_reports || false}
                    onChange={(e) =>
                      handleSettingChange("weekly_reports", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              </div>
            </div>

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
                    <div className="font-medium text-gray-900">
                      Auto-start Timer
                    </div>
                    <div className="text-sm text-gray-600">
                      Start timer when opening app
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_start || false}
                    onChange={(e) =>
                      handleSettingChange("auto_start", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Interval (minutes)
                  </label>
                  <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Format
                  </label>
                  <select
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
                <h2 className="text-lg font-semibold text-primary">Billing</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Hourly Rate
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={settings.hourly_rate || 0}
                      onChange={(e) =>
                        handleSettingChange(
                          "hourly_rate",
                          Number(e.target.value)
                        )
                      }
                      className="input-field pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={settings.tax_rate || 0}
                    onChange={(e) =>
                      handleSettingChange("tax_rate", Number(e.target.value))
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

            {/* Theme Settings */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-primary">Theme</h2>
              </div>

              <ThemeSelector />
            </div>
          </div>

          {/* Data Management */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-primary">
                Data Management
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleExport}
                className="btn-secondary justify-center"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>

              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-secondary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Clockify Data
                  </>
                )}
              </button>
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
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Import Instructions:</strong>
                  <ol className="mt-2 ml-4 list-decimal space-y-1">
                    <li>Export your data from Clockify as a CSV file</li>
                    <li>
                      Make sure the CSV includes columns: Project, Client, Start
                      Date, Start Time, Duration
                    </li>
                    <li>
                      Click "Import Clockify Data" and select your CSV file
                    </li>
                    <li>
                      The import will create missing clients and projects
                      automatically
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Import Result */}
            {importResult && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  importResult.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div
                    className={`text-sm ${
                      importResult.success ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    <p className="font-medium">{importResult.message}</p>
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
                          <span className="font-medium">Time Entries:</span>{" "}
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
                              ... and {importResult.errors.length - 10} more
                              errors
                            </li>
                          )}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> Export includes all your time entries,
                projects, and settings. Import will merge with existing data and
                won't create duplicates.
              </div>
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
    </div>
  );
};

export default Settings;
