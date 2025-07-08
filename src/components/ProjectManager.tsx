import React, { useState, useEffect } from "react";
import {
  Plus,
  FolderOpen,
  Play,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTimer } from "../hooks/useTimer";
import { useTimeEntries } from "../hooks/useTimeEntries";
import { projectsApi, type Project, type Client } from "../lib/projectsApi";
import { getRandomProjectColor } from "../utils/colorUtils";
import CustomDropdown from "./CustomDropdown";

const ProjectManager: React.FC = () => {
  const { setProject } = useTimer();
  const { projects, loading, refreshTimeEntries } = useTimeEntries();
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "client" | "recent">("name");
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    color: getRandomProjectColor(),
    description: "",
    billable: true,
    hourly_rate: 50,
  });
  const [isSaving, setIsSaving] = useState(false);

  const MAX_VISIBLE_PROJECTS = 4;

  // Load clients when component mounts
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientsData = await projectsApi.getClients();
        setClients(clientsData);
      } catch (error) {
        console.error("Error loading clients:", error);
      }
    };
    loadClients();
  }, []);

  const handleSelectProject = (project: Project) => {
    setProject({
      id: project.id!,
      name: project.name,
      color: project.color || "#3B82F6",
      description: project.description || "",
      client_name: project.client?.name || "",
      user_id: project.user_id || "",
      created_at: project.created_at || "",
      updated_at: project.updated_at || "",
    });
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSaving(true);
      await projectsApi.createProject({
        name: formData.name,
        client_id: formData.client_id || undefined,
        description: formData.description,
        color: formData.color,
        billable: formData.billable,
        hourly_rate: formData.hourly_rate,
      });

      // Refresh projects list
      await refreshTimeEntries();

      // Reset form
      setFormData({
        name: "",
        client_id: "",
        color: getRandomProjectColor(),
        description: "",
        billable: true,
        hourly_rate: 50,
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Sort projects based on selected criteria
  const sortedProjects = [...projects].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "client": {
        const aClient = a.client?.name || "";
        const bClient = b.client?.name || "";
        if (aClient === bClient) {
          return a.name.localeCompare(b.name);
        }
        return aClient.localeCompare(bClient);
      }
      case "recent": {
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return bDate - aDate; // Most recent first
      }
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading projects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">Projects</h2>
            <p className="text-sm text-gray-600">{projects.length} projects</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-secondary">Sort:</span>
            <div className="h-10">
              <CustomDropdown
                value={sortBy}
                onChange={(value) =>
                  setSortBy(value as "name" | "client" | "recent")
                }
                options={[
                  { value: "name", label: "Project Name" },
                  { value: "client", label: "Client Name" },
                  { value: "recent", label: "Recently Added" },
                ]}
                placeholder="Sort by"
                className="h-10"
              />
            </div>
          </div>
          <button
            className="btn-secondary h-10 px-4 py-2 flex items-center gap-2"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors h-10 w-10 flex items-center justify-center"
            title={isCollapsed ? "Expand projects" : "Collapse projects"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Add Project Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <form onSubmit={handleAddProject} className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">New Project</h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <input
                type="text"
                placeholder="Project name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input-field"
                required
              />
            </div>

            <div>
              <CustomDropdown
                value={formData.client_id}
                onChange={(value) =>
                  setFormData({ ...formData, client_id: value })
                }
                options={[
                  { value: "", label: "No client" },
                  ...clients
                    .filter((client) => client.id)
                    .map((client) => ({
                      value: client.id!,
                      label: client.name,
                    })),
                ]}
                placeholder="Select client"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="input-field"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate
                </label>
                <input
                  type="number"
                  placeholder="50"
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input-field"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billable"
                checked={formData.billable}
                onChange={(e) =>
                  setFormData({ ...formData, billable: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <label htmlFor="billable" className="text-sm text-gray-700">
                Billable project
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSaving || !formData.name.trim()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      {!isCollapsed && (
        <div>
          {projects.length === 0 ? (
            <div className="text-center py-[5.7rem] text-gray-600">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium mb-2 text-gray-700">
                No projects yet
              </p>
              <p className="text-gray-500 text-sm">
                Create your first project to get started!
              </p>
            </div>
          ) : (
            <div>
              <div
                className={`space-y-2 ${
                  sortedProjects.length > MAX_VISIBLE_PROJECTS
                    ? "max-h-80 overflow-y-auto scrollbar-thin"
                    : ""
                }`}
              >
                {sortedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="project-item group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all"
                    onClick={() => handleSelectProject(project)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-primary truncate text-sm">
                          {project.name}
                        </h3>
                        {project.client?.name && (
                          <p className="text-xs text-muted truncate">
                            {project.client.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-primary hover:bg-surface-hover text-xs px-2 py-1 rounded transition-all duration-200 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProject(project);
                      }}
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compact Stats */}
          {projects.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{projects.length} total</span>
                <span>
                  {projects.filter((p) => p.client?.name).length} with clients
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
