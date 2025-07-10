import React, { useState } from "react";
import {
  X,
  Edit2,
  Check,
  AlertCircle,
  Users,
  FolderOpen,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import {
  type ImportPreview,
  type PreviewClient,
  type PreviewProject,
  type PreviewTimeEntry,
} from "../lib/importApi";

interface ImportPreviewModalProps {
  isOpen: boolean;
  preview: ImportPreview;
  onClose: () => void;
  onConfirmImport: (editedPreview: ImportPreview) => Promise<void>;
  isImporting: boolean;
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  preview,
  onClose,
  onConfirmImport,
  isImporting,
}) => {
  const [editedPreview, setEditedPreview] = useState<ImportPreview>(preview);
  const [activeTab, setActiveTab] = useState<
    "clients" | "projects" | "entries"
  >("clients");
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(
    new Set()
  );

  if (!isOpen) return null;

  const handleClientEdit = (
    clientId: string,
    field: keyof PreviewClient,
    value: string
  ) => {
    setEditedPreview((prev) => ({
      ...prev,
      clients: prev.clients.map((client) =>
        client.id === clientId ? { ...client, [field]: value } : client
      ),
    }));
  };

  const handleProjectEdit = (
    projectId: string,
    field: keyof PreviewProject,
    value: string | boolean | number
  ) => {
    setEditedPreview((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => {
        if (project.id === projectId) {
          const updated = { ...project, [field]: value };

          // If client is changed, update clientName
          if (field === "clientId") {
            const client = prev.clients.find((c) => c.id === value);
            updated.clientName = client?.name;
          }

          return updated;
        }
        return project;
      }),
    }));
  };

  const handleTimeEntryEdit = (
    entryId: string,
    field: keyof PreviewTimeEntry,
    value: string | string[] | boolean
  ) => {
    setEditedPreview((prev) => ({
      ...prev,
      timeEntries: prev.timeEntries.map((entry) => {
        if (entry.id === entryId) {
          const updated = { ...entry, [field]: value };

          // If project is changed, update projectName and clientName
          if (field === "projectId") {
            const project = prev.projects.find((p) => p.id === value);
            updated.projectName = project?.name;
            updated.clientName = project?.clientName;
          }

          return updated;
        }
        return entry;
      }),
    }));
  };

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDateTime = (isoString: string): string => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-primary">Import Preview</h2>
            <p className="text-secondary mt-1">
              Review and edit the data before importing to your time tracker
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Stats Summary */}
          <div className="p-6 bg-surface-hover border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-primary">Clients</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-primary">
                    {editedPreview.stats.newClients}
                  </span>
                  <span className="text-muted text-sm ml-1">new</span>
                </div>
              </div>

              <div className="bg-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-primary">Projects</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-primary">
                    {editedPreview.stats.newProjects}
                  </span>
                  <span className="text-muted text-sm ml-1">new</span>
                </div>
              </div>

              <div className="bg-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-primary">Time Entries</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-primary">
                    {editedPreview.stats.totalTimeEntries}
                  </span>
                  <span className="text-muted text-sm ml-1">total</span>
                  <span className="ml-2 text-green-700 font-semibold">
                    ({editedPreview.stats.newTimeEntries} new)
                  </span>
                </div>
              </div>

              {editedPreview.errors.length > 0 && (
                <div className="bg-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-primary">Errors</span>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => setShowErrors(!showErrors)}
                      className="text-2xl font-bold text-red-600 hover:text-red-700"
                    >
                      {editedPreview.errors.length}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Details */}
            {showErrors && editedPreview.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">
                  Import Errors:
                </h4>
                <ul className="space-y-1 text-sm text-red-700">
                  {editedPreview.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {editedPreview.errors.length > 10 && (
                    <li className="text-red-600 font-medium">
                      ... and {editedPreview.errors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab("clients")}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "clients"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-muted hover:text-secondary"
                }`}
              >
                Clients ({editedPreview.clients.length})
              </button>
              <button
                onClick={() => setActiveTab("projects")}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "projects"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-muted hover:text-secondary"
                }`}
              >
                Projects ({editedPreview.projects.length})
              </button>
              <button
                onClick={() => setActiveTab("entries")}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "entries"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-muted hover:text-secondary"
                }`}
              >
                Time Entries ({editedPreview.timeEntries.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-6 max-h-96 overflow-y-auto scrollbar-thin">
            {/* Clients Tab */}
            {activeTab === "clients" && (
              <div className="space-y-4">
                {editedPreview.clients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 border rounded-lg ${
                      client.isNew
                        ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-muted" />
                        {editingClientId === client.id ? (
                          <input
                            type="text"
                            value={client.name}
                            onChange={(e) =>
                              handleClientEdit(
                                client.id,
                                "name",
                                e.target.value
                              )
                            }
                            className="input-field"
                            onBlur={() => setEditingClientId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingClientId(null);
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{client.name}</span>
                        )}
                        {client.isNew && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingClientId(client.id)}
                        className="p-1 hover:bg-surface-hover rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
              <div className="space-y-4">
                {editedPreview.projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-4 border rounded-lg ${
                      project.isNew
                        ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="w-4 h-4 rounded-full mt-1"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="flex-1">
                          {editingProjectId === project.id ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={project.name}
                                onChange={(e) =>
                                  handleProjectEdit(
                                    project.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className="input-field"
                                placeholder="Project name"
                              />

                              <select
                                value={project.clientId || ""}
                                onChange={(e) =>
                                  handleProjectEdit(
                                    project.id,
                                    "clientId",
                                    e.target.value
                                  )
                                }
                                className="input-field"
                              >
                                <option value="">No client</option>
                                {editedPreview.clients.map((client) => (
                                  <option key={client.id} value={client.id}>
                                    {client.name}
                                  </option>
                                ))}
                              </select>

                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={project.color}
                                  onChange={(e) =>
                                    handleProjectEdit(
                                      project.id,
                                      "color",
                                      e.target.value
                                    )
                                  }
                                  className="w-12 h-8 rounded cursor-pointer border-0"
                                  style={{
                                    height: "2.5rem",
                                    padding: "2px",
                                    backgroundColor: project.color,
                                    borderRadius: "0.375rem",
                                  }}
                                />
                                <div className="flex-1 relative">
                                  <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-muted pointer-events-none">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    value={project.hourlyRate || ""}
                                    onChange={(e) =>
                                      handleProjectEdit(
                                        project.id,
                                        "hourlyRate",
                                        e.target.value
                                          ? parseFloat(e.target.value)
                                          : 0
                                      )
                                    }
                                    className="w-full pl-10 pr-3 py-1 input-field"
                                    placeholder="Hourly rate"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={project.billable}
                                    onChange={(e) =>
                                      handleProjectEdit(
                                        project.id,
                                        "billable",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <span className="text-sm">Billable</span>
                                </label>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingProjectId(null)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {project.name}
                                </span>
                                {project.isNew && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    New
                                  </span>
                                )}
                              </div>
                              {project.clientName && (
                                <div className="flex items-center gap-1 text-sm text-muted mt-1">
                                  <Users className="w-3 h-3" />
                                  {project.clientName}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted mt-1">
                                {project.billable && project.hourlyRate && (
                                  <span>${project.hourlyRate}/hr</span>
                                )}
                                {project.billable && <span>Billable</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingProjectId(project.id)}
                        className="p-1 hover:bg-surface-hover rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Time Entries Tab */}
            {activeTab === "entries" && (
              <div className="space-y-3 sm:space-y-2">
                {editedPreview.timeEntries.map((entry) => {
                  const isExpanded = expandedEntries.has(entry.id);
                  const isEditing = editingEntryId === entry.id;
                  const isNew = entry.isNew;
                  return (
                    <div
                      key={entry.id}
                      className={`border rounded-lg transition-colors ${
                        isNew
                          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10"
                          : "border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-gray-900/10"
                      } hover:bg-surface-hover`}
                    >
                      <div className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Clock className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              {/* Description - Full width on mobile */}
                              <div className="font-medium text-primary mb-2 break-words flex items-center gap-2">
                                {entry.description || "No description"}
                                {isNew ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full ml-2">
                                    New
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full ml-2">
                                    Duplicate
                                  </span>
                                )}
                              </div>

                              {/* Mobile Layout - Stack time info */}
                              <div className="block sm:hidden space-y-1">
                                <div className="text-sm text-muted">
                                  {formatDateTime(entry.startTime)}
                                </div>
                                <div className="text-sm font-medium text-secondary">
                                  {formatDuration(entry.duration)}
                                </div>
                                {entry.projectName && (
                                  <div className="flex items-center gap-1 text-sm text-muted">
                                    <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {entry.projectName}
                                    </span>
                                    {entry.clientName && (
                                      <span className="text-xs">
                                        ({entry.clientName})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Desktop Layout - Horizontal flow */}
                              <div className="hidden sm:flex sm:items-center sm:gap-4 text-sm text-muted">
                                <span className="flex-shrink-0">
                                  {formatDateTime(entry.startTime)}
                                </span>
                                <span className="flex-shrink-0 font-medium text-secondary">
                                  {formatDuration(entry.duration)}
                                </span>
                                {entry.projectName && (
                                  <span className="flex items-center gap-1 min-w-0">
                                    <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {entry.projectName}
                                    </span>
                                    {entry.clientName && (
                                      <span className="text-xs ml-1">
                                        ({entry.clientName})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 flex-shrink-0">
                            <button
                              onClick={() =>
                                setEditingEntryId(isEditing ? null : entry.id)
                              }
                              className="p-1.5 hover:bg-surface-hover rounded transition-colors"
                              title="Edit entry"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleEntryExpansion(entry.id)}
                              className="p-1.5 hover:bg-surface-hover rounded transition-colors"
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {(isExpanded || isEditing) && (
                          <div className="mt-4 pt-4 border-t border-theme">
                            {isEditing ? (
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={entry.description}
                                  onChange={(e) =>
                                    handleTimeEntryEdit(
                                      entry.id,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  className="input-field"
                                  placeholder="Description"
                                />

                                <select
                                  value={entry.projectId || ""}
                                  onChange={(e) =>
                                    handleTimeEntryEdit(
                                      entry.id,
                                      "projectId",
                                      e.target.value
                                    )
                                  }
                                  className="input-field"
                                >
                                  <option value="">No project</option>
                                  {editedPreview.projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                      {project.name}{" "}
                                      {project.clientName &&
                                        `(${project.clientName})`}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="text"
                                  value={entry.tags.join(", ")}
                                  onChange={(e) =>
                                    handleTimeEntryEdit(
                                      entry.id,
                                      "tags",
                                      e.target.value
                                        .split(",")
                                        .map((tag) => tag.trim())
                                        .filter((tag) => tag)
                                    )
                                  }
                                  className="input-field"
                                  placeholder="Tags (comma separated)"
                                />

                                <button
                                  onClick={() => setEditingEntryId(null)}
                                  className="btn-primary text-sm flex items-center gap-2"
                                >
                                  <Check className="w-4 h-4" />
                                  Save Changes
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3 text-sm">
                                {entry.tags.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <Tag className="w-3 h-3 text-muted mt-0.5 flex-shrink-0" />
                                    <div className="flex flex-wrap gap-1">
                                      {entry.tags.map((tag, index) => (
                                        <span
                                          key={index}
                                          className="px-2 py-1 bg-surface-hover text-secondary rounded-full text-xs"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {entry.clientName && (
                                  <div className="flex items-center gap-2 text-secondary">
                                    <Users className="w-3 h-3 flex-shrink-0" />
                                    <span>Client: {entry.clientName}</span>
                                  </div>
                                )}
                                {entry.billable && (
                                  <div className="inline-flex items-center px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full">
                                    Billable
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* End of Scrollable Content Area */}
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-surface-hover flex-shrink-0">
          <div className="text-sm text-secondary">
            Review all data carefully before importing. Changes cannot be
            undone.
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-secondary border border-gray-300 dark:border-gray-600 rounded-md hover:bg-surface-hover transition-colors"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirmImport(editedPreview)}
              disabled={isImporting}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Import Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPreviewModal;
