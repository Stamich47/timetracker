import { supabase } from "./supabase";
import { getUserIdWithFallback } from "./auth-utils";
import {
  ProjectSchema,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  ClientSchema,
  ClientCreateSchema,
} from "./validation";
import {
  validateApiResponse,
  validateWithToast,
  sanitizeUserInput,
} from "./validationUtils";

// Types for projects
export interface Project {
  id?: string;
  user_id?: string;
  client_id?: string;
  name: string;
  description?: string;
  color?: string;
  billable?: boolean;
  hourly_rate?: number;
  status?: "active" | "completed" | "on_hold" | "cancelled";
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined data
  client?: {
    id: string;
    name: string;
  };
}

export interface Client {
  id?: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Projects API functions
export const projectsApi = {
  // Get all projects for current user
  async getProjects(): Promise<Project[]> {
    try {
      const userId = await getUserIdWithFallback();

      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          client:clients(id, name)
        `
        )
        .eq("user_id", userId)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting projects:", error);
      return [];
    }
  },

  // Create new project
  async createProject(
    project: Omit<Project, "id" | "user_id" | "created_at" | "updated_at">
  ): Promise<Project> {
    try {
      const userId = await getUserIdWithFallback();

      // Sanitize project inputs
      const sanitizedProject = {
        ...project,
        name: sanitizeUserInput(project.name),
        description: project.description
          ? sanitizeUserInput(project.description)
          : undefined,
      };

      // Validate project creation data
      const validatedProject = validateWithToast(
        ProjectCreateSchema,
        sanitizedProject,
        "Project Creation"
      );
      if (!validatedProject) {
        throw new Error("Project validation failed");
      }

      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...validatedProject,
          user_id: userId,
        })
        .select(
          `
          *,
          client:clients(id, name)
        `
        )
        .single();

      if (error) throw error;

      // Validate response data
      const validatedResponse = validateApiResponse(
        ProjectSchema,
        data,
        "/projects/create"
      );
      if (!validatedResponse.success || !validatedResponse.data) {
        throw new Error("Invalid response from server");
      }

      return validatedResponse.data as Project;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  },

  // Update project
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      // Sanitize project updates
      const sanitizedUpdates = { ...updates };
      if (sanitizedUpdates.name) {
        sanitizedUpdates.name = sanitizeUserInput(sanitizedUpdates.name);
      }
      if (sanitizedUpdates.description) {
        sanitizedUpdates.description = sanitizeUserInput(
          sanitizedUpdates.description
        );
      }

      // Validate project update data
      const validatedUpdates = validateWithToast(
        ProjectUpdateSchema,
        sanitizedUpdates,
        "Project Update"
      );
      if (!validatedUpdates) {
        throw new Error("Project update validation failed");
      }

      const { data, error } = await supabase
        .from("projects")
        .update({
          ...validatedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          `
          *,
          client:clients(id, name)
        `
        )
        .single();

      if (error) throw error;

      // Validate response data
      const validatedResponse = validateApiResponse(
        ProjectSchema,
        data,
        "/projects/update"
      );
      if (!validatedResponse.success || !validatedResponse.data) {
        throw new Error("Invalid response from server");
      }

      return validatedResponse.data as Project;
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  },

  // Delete project (soft delete - archive)
  async deleteProject(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  },

  // Get all clients for current user
  async getClients(): Promise<Client[]> {
    try {
      const userId = await getUserIdWithFallback();

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting clients:", error);
      return [];
    }
  },

  // Create new client
  async createClient(
    client: Omit<Client, "id" | "user_id" | "created_at" | "updated_at">
  ): Promise<Client> {
    try {
      const userId = await getUserIdWithFallback();

      // Sanitize client inputs
      const sanitizedClient = {
        ...client,
        name: sanitizeUserInput(client.name),
        email: client.email ? sanitizeUserInput(client.email) : undefined,
        phone: client.phone ? sanitizeUserInput(client.phone) : undefined,
      };

      // Validate client creation data
      const validatedClient = validateWithToast(
        ClientCreateSchema,
        sanitizedClient,
        "Client Creation"
      );
      if (!validatedClient) {
        throw new Error("Client validation failed");
      }

      const { data, error } = await supabase
        .from("clients")
        .insert({
          ...validatedClient,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Validate response data
      const validatedResponse = validateApiResponse(
        ClientSchema,
        data,
        "/clients/create"
      );
      if (!validatedResponse.success || !validatedResponse.data) {
        throw new Error("Invalid response from server");
      }

      return validatedResponse.data as Client;
    } catch (error) {
      console.error("Error creating client:", error);
      throw error;
    }
  },

  // Update client
  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    try {
      const { data, error } = await supabase
        .from("clients")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating client:", error);
      throw error;
    }
  },

  // Delete client (soft delete - archive)
  async deleteClient(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  },
};
