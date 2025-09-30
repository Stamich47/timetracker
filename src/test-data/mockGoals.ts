/**
 * Test Goals Data Setup
 *
 * Creates sample goals for testing the goals functionality.
 * This is temporary until the database schema is set up.
 */

import type { Goal } from "../lib/goals";

// Mock goals data for testing
export const mockGoals: Goal[] = [
  {
    id: "goal-1",
    name: "Monthly Billable Hours - October",
    description: "Complete 160 billable hours this month",
    type: "time",
    status: "active",
    createdAt: "2024-10-01T00:00:00Z",
    updatedAt: "2024-10-01T00:00:00Z",
    priority: "high",
    color: "#3B82F6",
    period: "monthly",
    targetHours: 160,
    currentHours: 45.5,
    startDate: "2024-10-01T00:00:00Z",
    endDate: "2024-10-31T23:59:59Z",
  },
  {
    id: "goal-2",
    name: "Q4 Revenue Target",
    description: "Generate $15,000 in revenue for Q4",
    type: "revenue",
    status: "active",
    createdAt: "2024-10-01T00:00:00Z",
    updatedAt: "2024-10-01T00:00:00Z",
    priority: "high",
    color: "#10B981",
    period: "quarterly",
    targetAmount: 15000,
    currentAmount: 3200,
    currency: "USD",
    startDate: "2024-10-01T00:00:00Z",
    endDate: "2024-12-31T23:59:59Z",
  },
  {
    id: "goal-3",
    name: "Complete E-commerce Website",
    description: "Finish the client e-commerce project by end of month",
    type: "project",
    status: "overdue",
    createdAt: "2024-10-01T00:00:00Z",
    updatedAt: "2024-10-01T00:00:00Z",
    priority: "medium",
    color: "#F59E0B",
    projectId: "project-1",
    targetHours: 80,
    targetCompletionDate: "2024-09-15T23:59:59Z", // Past date to make it overdue
    currentHours: 25.5,
    completionPercentage: 32,
  },
  {
    id: "goal-4",
    name: "Weekly Focus Hours",
    description: "Maintain 35+ billable hours per week",
    type: "time",
    status: "completed",
    createdAt: "2024-09-01T00:00:00Z",
    updatedAt: "2024-09-30T00:00:00Z",
    priority: "medium",
    color: "#8B5CF6",
    period: "weekly",
    targetHours: 35,
    currentHours: 37.5,
    startDate: "2024-09-23T00:00:00Z",
    endDate: "2024-09-29T23:59:59Z",
  },
];

// Function to simulate loading goals (for testing)
export const loadMockGoals = (): Goal[] => {
  // In a real app, this would load from localStorage or API
  const stored = localStorage.getItem("mock-goals");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return mockGoals;
    }
  }
  return mockGoals;
};

// Function to save mock goals (for testing)
export const saveMockGoals = (goals: Goal[]): void => {
  localStorage.setItem("mock-goals", JSON.stringify(goals));
};
