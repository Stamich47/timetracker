export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  color: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration?: number; // in seconds
  project_id?: string;
  user_id: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface TimerState {
  isRunning: boolean;
  startTime?: Date;
  elapsedTime: number;
  description: string;
  selectedProject?: Project;
}
