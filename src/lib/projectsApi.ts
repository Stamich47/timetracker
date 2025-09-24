import { supabase } from "./supabase";
import { getUserIdWithFallback } from "./auth-utils";

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

      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...project,
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
      return data;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  },

  // Update project
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({
          ...updates,
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
      return data;
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

      const { data, error } = await supabase
        .from("clients")
        .insert({
          ...client,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
