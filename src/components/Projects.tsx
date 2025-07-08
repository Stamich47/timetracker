import React, { useState, useEffect } from "react";
import {
  Plus,
  FolderOpen,
  Edit2,
  Trash2,
  Users,
  Clock,
  DollarSign,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  projectsApi,
  type Project as ApiProject,
  type Client,
} from "../lib/projectsApi";
import { useTimeEntries } from "../hooks/useTimeEntries";
import { getRandomProjectColor } from "../utils/colorUtils";
import CustomDropdown from "./CustomDropdown";

const Projects: React.FC = () => {
  const { projects, refreshTimeEntries } = useTimeEntries();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [showQuickClientForm, setShowQuickClientForm] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    color: getRandomProjectColor(),
    description: "",
    billable: true,
    hourly_rate: 50,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const clientsData = await projectsApi.getClients();
      setClients(clientsData);
      // Projects are loaded via useTimeEntries hook
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (formData.name.trim()) {
      try {
        if (editingProject) {
          // Update existing project
          await projectsApi.updateProject(editingProject.id!, {
            name: formData.name,
            client_id: formData.client_id || undefined,
            color: formData.color,
            description: formData.description,
            billable: formData.billable,
            hourly_rate: formData.hourly_rate,
          });
        } else {
          // Add new project
          await projectsApi.createProject({
            name: formData.name,
            client_id: formData.client_id || undefined,
            color: formData.color,
            description: formData.description,
            billable: formData.billable,
            hourly_rate: formData.hourly_rate,
          });
        }

        // Refresh projects in the shared context
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
        setEditingProject(null);
      } catch (err) {
        console.error("Error saving project:", err);
        setError("Failed to save project. Please try again.");
      }
    }
  };

  const handleEdit = (project: ApiProject) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client_id: project.client_id || "",
      color: project.color || "#3B82F6",
      description: project.description || "",
      billable: project.billable ?? true,
      hourly_rate: project.hourly_rate || 50,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await projectsApi.deleteProject(projectId);
        // Refresh projects in the shared context
        await refreshTimeEntries();
      } catch (err) {
        console.error("Error deleting project:", err);
        setError("Failed to delete project. Please try again.");
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      client_id: "",
      color: getRandomProjectColor(),
      description: "",
      billable: true,
      hourly_rate: 50,
    });
    setShowAddForm(false);
    setEditingProject(null);
    setShowQuickClientForm(false);
    setQuickClientName("");
  };

  const handleQuickAddClient = async () => {
    if (quickClientName.trim()) {
      try {
        const newClient = await projectsApi.createClient({
          name: quickClientName.trim(),
        });

        // Refresh clients list
        await loadData();

        // Select the new client in the form
        setFormData({ ...formData, client_id: newClient.id! });

        // Reset and hide quick add form
        setQuickClientName("");
        setShowQuickClientForm(false);
      } catch (err) {
        console.error("Error creating client:", err);
        setError("Failed to create client. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-primary" />
        <span className="ml-2 text-primary">{error}</span>
        <button onClick={loadData} className="btn-primary ml-4">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Projects</h1>
            <p className="text-secondary mt-1">
              Manage your projects and track time efficiently
            </p>
          </div>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Add/Edit Project Form */}
      {showAddForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">
            {editingProject ? "Edit Project" : "Add New Project"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input-field"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Client
              </label>
              <div className="flex items-center">
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
                  className="flex-1"
                />
                <button
                  onClick={() => setShowQuickClientForm(!showQuickClientForm)}
                  className="btn-primary ml-2 p-2"
                  title="Add new client"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {showQuickClientForm && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={quickClientName}
                    onChange={(e) => setQuickClientName(e.target.value)}
                    placeholder="Client name"
                    className="input-field flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickAddClient();
                      } else if (e.key === "Escape") {
                        setShowQuickClientForm(false);
                        setQuickClientName("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddClient}
                    className="btn-primary px-3 py-2 text-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickClientForm(false);
                      setQuickClientName("");
                    }}
                    className="btn-secondary text-sm border-theme"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="input-field h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Hourly Rate ($)
              </label>
              <input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hourly_rate: Number(e.target.value),
                  })
                }
                className="input-field"
                placeholder="50"
                min="0"
                step="0.01"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="input-field"
                rows={3}
                placeholder="Project description..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.billable}
                  onChange={(e) =>
                    setFormData({ ...formData, billable: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-primary">
                  Billable project
                </span>
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={handleCancel}
              className="btn-secondary border-theme"
            >
              Cancel
            </button>
            <button onClick={handleSubmit} className="btn-primary">
              {editingProject ? "Update Project" : "Create Project"}
            </button>
          </div>

          {/* Quick Client Form */}
          {showQuickClientForm && (
            <div className="card mt-4 p-4">
              <h4 className="text-sm font-semibold text-primary mb-2">
                Add New Client
              </h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Enter client name"
                />
                <button
                  onClick={handleQuickAddClient}
                  className="btn-primary bg-green-500 hover:bg-green-600"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">
            No projects yet
          </h3>
          <p className="text-secondary mb-4">
            Get started by creating your first project.
          </p>
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: project.color || "#3B82F6" }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-primary truncate">
                        {project.name}
                      </h3>
                      {project.client && (
                        <div className="flex items-center text-sm text-muted mt-1">
                          <Users className="h-3 w-3 mr-1" />
                          {project.client.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-1 text-muted hover:text-secondary"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id!)}
                      className="p-1 text-muted hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="text-secondary text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>0h tracked</span>
                  </div>
                  {project.billable && project.hourly_rate && (
                    <div className="flex items-center text-primary">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span>${project.hourly_rate}/hr</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
