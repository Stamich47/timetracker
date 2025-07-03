export interface Project {
  id: string;
  name: string;
  client_name?: string;
  color: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
  };
}

export interface TimeEntry {
  id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  project_id?: string;
  user_id: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface TimerState {
  isRunning: boolean;
  elapsedTime: number;
  description: string;
  selectedProject?: Project;
  startTime?: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
}
