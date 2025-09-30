/**
 * Goal Tracking System
 *
 * Comprehensive goal management for time tracking, projects, and revenue targets.
 * Supports predictive analytics and progress visualization.
 */

export type GoalType = "time" | "project" | "revenue";

export type TimeGoalPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type GoalStatus = "active" | "completed" | "paused" | "overdue";

export interface BaseGoal {
  id: string;
  name: string;
  description?: string;
  type: GoalType;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  targetDate?: string; // For time-bound goals
  priority: "low" | "medium" | "high";
  color?: string; // For visual distinction
}

export interface TimeGoal extends BaseGoal {
  type: "time";
  period: TimeGoalPeriod;
  targetHours: number; // Billable hours to achieve
  currentHours: number; // Calculated from time entries
  startDate: string; // When this goal period started
  endDate: string; // When this goal period ends
}

export interface ProjectGoal extends BaseGoal {
  type: "project";
  projectId: string;
  targetHours?: number; // Time budget for project
  targetCompletionDate?: string; // Deadline
  currentHours: number; // Hours logged so far
  estimatedHoursRemaining?: number; // User estimate or calculated
  completionPercentage: number; // 0-100
}

export interface RevenueGoal extends BaseGoal {
  type: "revenue";
  period: TimeGoalPeriod;
  targetAmount: number; // Revenue target in cents
  currentAmount: number; // Calculated from billable entries
  currency: string;
  startDate: string;
  endDate: string;
}

export type Goal = TimeGoal | ProjectGoal | RevenueGoal;

// Progress calculation results
export interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetValue: number;
  percentage: number; // 0-100
  status: "on-track" | "ahead" | "behind" | "completed" | "overdue";
  daysRemaining?: number;
  projectedCompletionDate?: string;
  paceRequired?: number; // Hours/days needed per day to meet goal
  trend: "improving" | "declining" | "stable";
}

// Predictive analytics
export interface GoalPrediction {
  goalId: string;
  projectedCompletionDate: string;
  confidence: number; // 0-100, how confident we are in prediction
  requiredDailyAverage: number; // What they need to average per day
  currentDailyAverage: number; // What they're currently averaging
  likelihood: "very-likely" | "likely" | "unlikely" | "very-unlikely";
  recommendations: string[]; // AI-generated suggestions
}

// Goal templates for quick creation
export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  type: GoalType;
  defaultConfig: Partial<Goal>;
  category: string;
}

// Predefined templates
export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "monthly-billable-hours",
    name: "Monthly Billable Hours",
    description: "Track billable hours for the current month",
    type: "time",
    category: "Time Tracking",
    defaultConfig: {
      period: "monthly",
      targetHours: 160,
      priority: "high",
    },
  },
  {
    id: "weekly-productivity",
    name: "Weekly Productivity Goal",
    description: "Maintain high productivity throughout the week",
    type: "time",
    category: "Productivity",
    defaultConfig: {
      period: "weekly",
      targetHours: 40,
      priority: "medium",
    },
  },
  {
    id: "project-completion",
    name: "Project Completion",
    description: "Complete project by target date",
    type: "project",
    category: "Projects",
    defaultConfig: {
      priority: "high",
    },
  },
  {
    id: "quarterly-revenue",
    name: "Quarterly Revenue Target",
    description: "Achieve revenue goal for the quarter",
    type: "revenue",
    category: "Revenue",
    defaultConfig: {
      period: "quarterly",
      targetAmount: 50000, // $500
      priority: "high",
    },
  },
];

// Utility functions
export function calculateGoalProgress(goal: Goal): GoalProgress {
  const baseProgress: Omit<GoalProgress, "status"> = {
    goalId: goal.id,
    currentValue: 0,
    targetValue: 0,
    percentage: 0,
    trend: "stable",
  };

  switch (goal.type) {
    case "time": {
      const timeGoal = goal as TimeGoal;
      return {
        ...baseProgress,
        currentValue: timeGoal.currentHours,
        targetValue: timeGoal.targetHours,
        percentage: Math.min(
          (timeGoal.currentHours / timeGoal.targetHours) * 100,
          100
        ),
        status: calculateTimeGoalStatus(timeGoal),
        daysRemaining: calculateDaysRemaining(timeGoal.endDate),
      };
    }

    case "project": {
      const projectGoal = goal as ProjectGoal;
      return {
        ...baseProgress,
        currentValue: projectGoal.currentHours,
        targetValue: projectGoal.targetHours || 0,
        percentage: projectGoal.completionPercentage,
        status: calculateProjectGoalStatus(projectGoal),
        daysRemaining: projectGoal.targetCompletionDate
          ? calculateDaysRemaining(projectGoal.targetCompletionDate)
          : undefined,
      };
    }

    case "revenue": {
      const revenueGoal = goal as RevenueGoal;
      return {
        ...baseProgress,
        currentValue: revenueGoal.currentAmount,
        targetValue: revenueGoal.targetAmount,
        percentage: Math.min(
          (revenueGoal.currentAmount / revenueGoal.targetAmount) * 100,
          100
        ),
        status: calculateRevenueGoalStatus(revenueGoal),
        daysRemaining: calculateDaysRemaining(revenueGoal.endDate),
      };
    }

    default:
      return { ...baseProgress, status: "on-track" };
  }
}

function calculateTimeGoalStatus(goal: TimeGoal): GoalProgress["status"] {
  if (goal.currentHours >= goal.targetHours) return "completed";
  if (new Date() > new Date(goal.endDate)) return "overdue";

  const daysRemaining = calculateDaysRemaining(goal.endDate);
  if (daysRemaining && daysRemaining > 0) {
    const requiredPace = (goal.targetHours - goal.currentHours) / daysRemaining;
    const currentPace =
      goal.currentHours / Math.max(1, calculateDaysElapsed(goal.startDate));
    return requiredPace <= currentPace ? "ahead" : "behind";
  }

  return "on-track";
}

function calculateProjectGoalStatus(goal: ProjectGoal): GoalProgress["status"] {
  if (goal.completionPercentage >= 100) return "completed";
  if (
    goal.targetCompletionDate &&
    new Date() > new Date(goal.targetCompletionDate)
  )
    return "overdue";

  // Simple heuristic: if completion % > days elapsed %, consider ahead
  const daysElapsed = calculateDaysElapsed(goal.createdAt);
  const totalDays = goal.targetCompletionDate
    ? calculateDaysBetween(goal.createdAt, goal.targetCompletionDate)
    : 30; // Default 30 days

  const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100);
  return goal.completionPercentage > expectedProgress ? "ahead" : "behind";
}

function calculateRevenueGoalStatus(goal: RevenueGoal): GoalProgress["status"] {
  if (goal.currentAmount >= goal.targetAmount) return "completed";
  if (new Date() > new Date(goal.endDate)) return "overdue";

  const daysRemaining = calculateDaysRemaining(goal.endDate);
  if (daysRemaining && daysRemaining > 0) {
    const requiredPace =
      (goal.targetAmount - goal.currentAmount) / daysRemaining;
    const currentPace =
      goal.currentAmount / Math.max(1, calculateDaysElapsed(goal.startDate));
    return requiredPace <= currentPace ? "ahead" : "behind";
  }

  return "on-track";
}

function calculateDaysRemaining(targetDate: string): number {
  const now = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateDaysElapsed(startDate: string): number {
  const now = new Date();
  const start = new Date(startDate);
  const diffTime = now.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Goal creation helpers
export function createTimeGoal(
  name: string,
  period: TimeGoalPeriod,
  targetHours: number,
  startDate?: string
): Omit<TimeGoal, "id" | "createdAt" | "updatedAt"> {
  const now = new Date();
  const start = startDate ? new Date(startDate) : now;
  let end: Date;

  switch (period) {
    case "daily": {
      end = new Date(start);
      end.setDate(start.getDate() + 1);
      break;
    }
    case "weekly": {
      end = new Date(start);
      end.setDate(start.getDate() + (7 - start.getDay()));
      break;
    }
    case "monthly": {
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      break;
    }
    case "quarterly": {
      const quarterEnd = Math.ceil((start.getMonth() + 1) / 3) * 3;
      end = new Date(start.getFullYear(), quarterEnd - 1, 0);
      break;
    }
    case "yearly": {
      end = new Date(start.getFullYear(), 11, 31);
      break;
    }
  }

  return {
    name,
    description: `${period} billable hours goal`,
    type: "time",
    status: "active",
    period,
    targetHours,
    currentHours: 0,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    priority: "medium",
  };
}

export function createProjectGoal(
  name: string,
  projectId: string,
  targetHours?: number,
  targetCompletionDate?: string
): Omit<ProjectGoal, "id" | "createdAt" | "updatedAt"> {
  return {
    name,
    description: `Complete project ${name}`,
    type: "project",
    status: "active",
    projectId,
    targetHours,
    targetCompletionDate,
    currentHours: 0,
    completionPercentage: 0,
    priority: "high",
  };
}

export function createRevenueGoal(
  name: string,
  period: TimeGoalPeriod,
  targetAmount: number,
  currency: string = "USD",
  startDate?: string
): Omit<RevenueGoal, "id" | "createdAt" | "updatedAt"> {
  const now = new Date();
  const start = startDate ? new Date(startDate) : now;
  let end: Date;

  switch (period) {
    case "monthly": {
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      break;
    }
    case "quarterly": {
      const quarterEnd = Math.ceil((start.getMonth() + 1) / 3) * 3;
      end = new Date(start.getFullYear(), quarterEnd - 1, 0);
      break;
    }
    case "yearly": {
      end = new Date(start.getFullYear(), 11, 31);
      break;
    }
    default: {
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }
  }

  return {
    name,
    description: `${period} revenue goal`,
    type: "revenue",
    status: "active",
    period,
    targetAmount,
    currentAmount: 0,
    currency,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    priority: "high",
  };
}
