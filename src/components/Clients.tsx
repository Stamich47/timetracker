import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Users,
  Edit2,
  Trash2,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { projectsApi } from "../lib/projectsApi";
import type { Client } from "../lib/projectsApi";
import { validateData } from "../lib/validationUtils";
import { ClientCreateSchema, ClientUpdateSchema } from "../lib/validation";
import type { ClientCreate, ClientUpdate } from "../lib/validation";

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // State for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    clientId: string | null;
  }>({ isOpen: false, clientId: null });

  // State for form validation errors
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const clientsData = await projectsApi.getClients();
      setClients(clientsData);
    } catch (err) {
      console.error("Error loading clients:", err);
      setError("Failed to load clients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Clear previous validation errors
    setValidationErrors({});

    // Prepare data for validation
    const submitData = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
    };

    // Validate the data
    const validationResult = editingClient
      ? validateData(ClientUpdateSchema, submitData, "Client Update")
      : validateData(ClientCreateSchema, submitData, "Client Creation");

    if (!validationResult.success) {
      // Set field-specific validation errors
      const fieldErrors: { name?: string; email?: string; phone?: string } = {};
      if (validationResult.errors) {
        Object.entries(validationResult.errors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            fieldErrors[field as keyof typeof fieldErrors] = messages[0];
          }
        });
      }
      setValidationErrors(fieldErrors);
      return;
    }

    try {
      if (editingClient) {
        // Update existing client
        await projectsApi.updateClient(
          editingClient.id!,
          validationResult.data as ClientUpdate
        );
      } else {
        // Add new client
        await projectsApi.createClient(validationResult.data as ClientCreate);
      }

      // Refresh clients list
      await loadClients();

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
      });
      setValidationErrors({});
      setShowAddForm(false);
      setEditingClient(null);
    } catch (err) {
      console.error("Error saving client:", err);
      setError("Failed to save client. Please try again.");
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
    });
    setShowAddForm(true);
  };

  const handleDelete = (clientId: string) => {
    setDeleteConfirmation({ isOpen: true, clientId });
    // Prevent background scrolling
    document.body.style.overflow = "hidden";
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.clientId) {
      try {
        await projectsApi.deleteClient(deleteConfirmation.clientId);
        await loadClients();
      } catch (err) {
        console.error("Error deleting client:", err);
        setError("Failed to delete client. Please try again.");
      }
    }
    setDeleteConfirmation({ isOpen: false, clientId: null });
    // Restore scrolling
    document.body.style.overflow = "unset";
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, clientId: null });
    // Restore scrolling
    document.body.style.overflow = "unset";
  };

  // Keyboard handling for delete confirmation modal
  useEffect(() => {
    if (!deleteConfirmation.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelDelete();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteConfirmation.isOpen]);

  const handleCancel = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
    });
    setShowAddForm(false);
    setEditingClient(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-secondary">Loading clients...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
        <button
          onClick={loadClients}
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
          <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Clients</h1>
            <p className="text-purple-100 mt-1">
              Manage your clients and their contact information
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Client
        </button>
      </div>

      {/* Add/Edit Client Form */}
      {showAddForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">
            {editingClient ? "Edit Client" : "Add New Client"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={`input-field ${
                  validationErrors.name
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                placeholder="Enter client name"
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {validationErrors.name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={`input-field ${
                  validationErrors.email
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                placeholder="client@example.com"
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {validationErrors.email}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className={`input-field ${
                  validationErrors.phone
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                placeholder="+1 (555) 123-4567"
              />
              {validationErrors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {validationErrors.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={handleCancel}
              className="btn-secondary border-theme"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {editingClient ? "Update Client" : "Create Client"}
            </button>
          </div>
        </div>
      )}

      {/* Clients Grid */}
      {clients.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No clients yet
          </h3>
          <p className="text-secondary mb-4">
            Get started by adding your first client.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div
              key={client.id}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-primary truncate">
                        {client.name}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-1 text-muted hover:text-secondary"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id!)}
                      className="p-1 text-muted hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {client.email && (
                    <div className="flex items-center text-sm text-secondary">
                      <Mail className="h-4 w-4 mr-2 text-muted" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center text-sm text-secondary">
                      <Phone className="h-4 w-4 mr-2 text-muted" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {!client.email && !client.phone && (
                    <p className="text-sm text-muted italic">
                      No contact information
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transform transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Delete Client
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete this client? This will affect
                all associated projects and time entries.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Clients;
