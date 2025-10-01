-- Migration: Add scope fields to goals table for productivity goal enhancements
-- Run this in Supabase SQL Editor to add the new scope functionality

-- Add scope column for time goals (client, project, general) - nullable for backward compatibility
ALTER TABLE goals
ADD COLUMN scope TEXT CHECK (scope IN ('client', 'project', 'general'));

-- Add scope_id column to reference clients or projects
ALTER TABLE goals
ADD COLUMN scope_id UUID;

-- Add comment for documentation
COMMENT ON COLUMN goals.scope IS 'Scope for time goals: client (track all projects for a client), project (track specific project), general (track all hours)';
COMMENT ON COLUMN goals.scope_id IS 'ID of the client or project being tracked, null for general scope';

-- Optional: Create index for better performance on scope queries
CREATE INDEX IF NOT EXISTS idx_goals_scope ON goals(scope);
CREATE INDEX IF NOT EXISTS idx_goals_scope_id ON goals(scope_id);