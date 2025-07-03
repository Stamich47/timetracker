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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
        <button
          onClick={loadData}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
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
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="text-blue-100 mt-1">
              Manage your projects and track time efficiently
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Add/Edit Project Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingProject ? "Edit Project" : "Add New Project"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <div className="flex items-center">
                <select
                  value={formData.client_id}
                  onChange={(e) =>
                    setFormData({ ...formData, client_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowQuickClientForm(!showQuickClientForm)}
                  className="ml-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
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
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickClientForm(false);
                      setQuickClientName("");
                    }}
                    className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50"
                min="0"
                step="0.01"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <span className="text-sm font-medium text-gray-700">
                  Billable project
                </span>
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {editingProject ? "Update Project" : "Create Project"}
            </button>
          </div>

          {/* Quick Client Form */}
          {showQuickClientForm && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Add New Client
              </h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter client name"
                />
                <button
                  onClick={handleQuickAddClient}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
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
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No projects yet
          </h3>
          <p className="text-gray-300 mb-4">
            Get started by creating your first project.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: project.color || "#3B82F6" }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {project.name}
                      </h3>
                      {project.client && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Users className="h-3 w-3 mr-1" />
                          {project.client.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id!)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>0h tracked</span>
                  </div>
                  {project.billable && project.hourly_rate && (
                    <div className="flex items-center text-green-600">
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
