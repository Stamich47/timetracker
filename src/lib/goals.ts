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
  | "yearly"
  | "custom";

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
  projectId?: string; // Optional: restrict to specific project
}

export interface ProjectGoal extends BaseGoal {
  type: "project";
  projectId: string;
  targetHours?: number; // Time budget for project
  targetCompletionDate?: string; // Deadline
  currentHours: number; // Hours logged so far
  estimatedHoursRemaining?: number; // User estimate or calculated
  completionPercentage?: number; // 0-100 - optional manual override
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
    id: "productivity-goal",
    name: "Productivity Goal",
    description:
      "Track billable hours for a specific project within a custom date range",
    type: "time",
    category: "Time Tracking",
    defaultConfig: {
      period: "custom",
      targetHours: 40,
      priority: "medium",
    },
  },
  {
    id: "revenue-target",
    name: "Revenue Target",
    description: "Set and achieve revenue goals with flexible time periods",
    type: "revenue",
    category: "Revenue",
    defaultConfig: {
      period: "monthly",
      targetAmount: 10000,
      priority: "high",
    },
  },
  {
    id: "project-completion",
    name: "Project Completion",
    description: "Complete projects by target dates with milestone tracking",
    type: "project",
    category: "Projects",
    defaultConfig: {
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
      const daysRemaining = calculateDaysRemaining(timeGoal.endDate);
      const paceRequired =
        daysRemaining && daysRemaining > 0
          ? (timeGoal.targetHours - timeGoal.currentHours) / daysRemaining
          : undefined;

      return {
        ...baseProgress,
        currentValue: timeGoal.currentHours,
        targetValue: timeGoal.targetHours,
        percentage: Math.min(
          (timeGoal.currentHours / timeGoal.targetHours) * 100,
          100
        ),
        status: calculateTimeGoalStatus(timeGoal),
        daysRemaining,
        paceRequired:
          paceRequired && paceRequired > 0 ? paceRequired : undefined,
      };
    }

    case "project": {
      const projectGoal = goal as ProjectGoal;
      // Calculate percentage based on hours if targetHours is available, otherwise use completionPercentage
      const calculatedPercentage =
        projectGoal.targetHours && projectGoal.targetHours > 0
          ? Math.min(
              (projectGoal.currentHours / projectGoal.targetHours) * 100,
              100
            )
          : projectGoal.completionPercentage ?? 0; // Default to 0 if not set

      return {
        ...baseProgress,
        currentValue: projectGoal.currentHours,
        targetValue: projectGoal.targetHours || 0,
        percentage: calculatedPercentage,
        status: calculateProjectGoalStatus(projectGoal),
        daysRemaining: projectGoal.targetCompletionDate
          ? calculateDaysRemaining(projectGoal.targetCompletionDate)
          : undefined,
      };
    }

    case "revenue": {
      const revenueGoal = goal as RevenueGoal;
      const daysRemaining = calculateDaysRemaining(revenueGoal.endDate);
      const paceRequired =
        daysRemaining && daysRemaining > 0
          ? (revenueGoal.targetAmount - revenueGoal.currentAmount) /
            daysRemaining
          : undefined;

      return {
        ...baseProgress,
        currentValue: revenueGoal.currentAmount,
        targetValue: revenueGoal.targetAmount,
        percentage: Math.min(
          (revenueGoal.currentAmount / revenueGoal.targetAmount) * 100,
          100
        ),
        status: calculateRevenueGoalStatus(revenueGoal),
        daysRemaining,
        paceRequired:
          paceRequired && paceRequired > 0 ? paceRequired : undefined,
      };
    }

    default:
      return { ...baseProgress, status: "on-track" };
  }
}

function calculateTimeGoalStatus(goal: TimeGoal): GoalProgress["status"] {
  if (goal.currentHours >= goal.targetHours) return "completed";
  if (new Date() > new Date(goal.endDate)) return "overdue";

  const daysElapsed = calculateDaysElapsed(goal.startDate);
  const totalDays = calculateDaysBetween(goal.startDate, goal.endDate);
  const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100);
  const actualProgress = (goal.currentHours / goal.targetHours) * 100;

  const tolerance = 10; // 10% tolerance window
  if (actualProgress >= expectedProgress + tolerance) return "ahead";
  if (actualProgress <= expectedProgress - tolerance) return "behind";
  return "on-track";
}

function calculateProjectGoalStatus(goal: ProjectGoal): GoalProgress["status"] {
  // Calculate percentage consistently with the progress calculation
  const calculatedPercentage =
    goal.targetHours && goal.targetHours > 0
      ? Math.min((goal.currentHours / goal.targetHours) * 100, 100)
      : goal.completionPercentage ?? 0; // Default to 0 if not set

  if (calculatedPercentage >= 100) return "completed";
  if (
    goal.targetCompletionDate &&
    new Date() > new Date(goal.targetCompletionDate)
  )
    return "overdue";

  // Calculate expected progress based on time elapsed
  const daysElapsed = calculateDaysElapsed(goal.createdAt);
  const totalDays = goal.targetCompletionDate
    ? calculateDaysBetween(goal.createdAt, goal.targetCompletionDate)
    : 30; // Default 30 days

  const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100);
  const tolerance = 10; // 10% tolerance window

  if (calculatedPercentage >= expectedProgress + tolerance) return "ahead";
  if (calculatedPercentage <= expectedProgress - tolerance) return "behind";
  return "on-track";
}

function calculateRevenueGoalStatus(goal: RevenueGoal): GoalProgress["status"] {
  if (goal.currentAmount >= goal.targetAmount) return "completed";
  if (new Date() > new Date(goal.endDate)) return "overdue";

  const daysElapsed = calculateDaysElapsed(goal.startDate);
  const totalDays = calculateDaysBetween(goal.startDate, goal.endDate);
  const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100);
  const actualProgress = (goal.currentAmount / goal.targetAmount) * 100;

  const tolerance = 10; // 10% tolerance window
  if (actualProgress >= expectedProgress + tolerance) return "ahead";
  if (actualProgress <= expectedProgress - tolerance) return "behind";
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
    case "custom": {
      throw new Error(
        "Custom period goals should provide explicit start and end dates"
      );
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
