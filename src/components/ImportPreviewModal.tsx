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
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Preview</h2>
            <p className="text-gray-600 mt-1">
              Review and edit the data before importing to your time tracker
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Clients</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900">
                  {editedPreview.stats.newClients}
                </span>
                <span className="text-gray-500 text-sm ml-1">new</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-green-600" />
                <span className="font-medium">Projects</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900">
                  {editedPreview.stats.newProjects}
                </span>
                <span className="text-gray-500 text-sm ml-1">new</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Time Entries</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900">
                  {editedPreview.stats.totalTimeEntries}
                </span>
                <span className="text-gray-500 text-sm ml-1">total</span>
              </div>
            </div>

            {editedPreview.errors.length > 0 && (
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Errors</span>
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
              <h4 className="font-medium text-red-900 mb-2">Import Errors:</h4>
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
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("clients")}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "clients"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Clients ({editedPreview.clients.length})
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "projects"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Projects ({editedPreview.projects.length})
            </button>
            <button
              onClick={() => setActiveTab("entries")}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "entries"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Time Entries ({editedPreview.timeEntries.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Clients Tab */}
          {activeTab === "clients" && (
            <div className="space-y-4">
              {editedPreview.clients.map((client) => (
                <div
                  key={client.id}
                  className={`p-4 border rounded-lg ${
                    client.isNew
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-400" />
                      {editingClientId === client.id ? (
                        <input
                          type="text"
                          value={client.name}
                          onChange={(e) =>
                            handleClientEdit(client.id, "name", e.target.value)
                          }
                          className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="p-1 hover:bg-gray-100 rounded"
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
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200"
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
                              className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-12 h-8 border border-gray-300 rounded"
                              />
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
                                className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Hourly rate"
                                min="0"
                                step="0.01"
                              />
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
                              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                <Users className="w-3 h-3" />
                                {project.clientName}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
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
                      className="p-1 hover:bg-gray-100 rounded"
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
            <div className="space-y-2">
              {editedPreview.timeEntries.map((entry) => {
                const isExpanded = expandedEntries.has(entry.id);
                const isEditing = editingEntryId === entry.id;

                return (
                  <div key={entry.id} className="border rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div className="flex-1">
                            <div className="font-medium">
                              {entry.description || "No description"}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-4">
                              <span>{formatDateTime(entry.startTime)}</span>
                              <span>{formatDuration(entry.duration)}</span>
                              {entry.projectName && (
                                <span className="flex items-center gap-1">
                                  <FolderOpen className="w-3 h-3" />
                                  {entry.projectName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setEditingEntryId(isEditing ? null : entry.id)
                            }
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleEntryExpansion(entry.id)}
                            className="p-1 hover:bg-gray-100 rounded"
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
                        <div className="mt-4 pt-4 border-t border-gray-100">
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Tags (comma separated)"
                              />

                              <button
                                onClick={() => setEditingEntryId(null)}
                                className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm">
                              {entry.tags.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Tag className="w-3 h-3 text-gray-400" />
                                  <div className="flex gap-1">
                                    {entry.tags.map((tag, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {entry.clientName && (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Users className="w-3 h-3" />
                                  <span>Client: {entry.clientName}</span>
                                </div>
                              )}
                              {entry.billable && (
                                <div className="text-green-600 text-xs font-medium">
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

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Review all data carefully before importing. Changes cannot be
            undone.
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
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
