import { toast } from "../hooks/useToast";

export const ErrorType = {
  AUTHENTICATION: "authentication",
  API: "api",
  VALIDATION: "validation",
  NETWORK: "network",
  REACT: "react",
  UNKNOWN: "unknown",
} as const;

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

export class ErrorLogger {
  private static instance: ErrorLogger;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log React component errors (from Error Boundaries)
   */
  logReactError() {
    // Error logging temporarily disabled to prevent console conflicts
    // Show user-friendly notification
    toast.error(
      "An unexpected error occurred. The page will refresh to recover.",
      "Application Error",
      {
        label: "Refresh Now",
        onClick: () => window.location.reload(),
      }
    );
  }

  /**
   * Log API errors
   */
  logApiError() {
    // Error logging temporarily disabled to prevent console conflicts
    // Show user-friendly notification
    toast.error("Something went wrong. Please try again.", "Connection Error", {
      label: "Retry",
      onClick: () => window.location.reload(),
    });
  }

  /**
   * Log async errors (promises, setTimeout, etc.)
   */
  logAsyncError() {
    // Error logging temporarily disabled to prevent console conflicts
  }

  /**
   * Log general errors
   */
  logError() {
    // Error logging temporarily disabled to prevent console conflicts
  }
}

// Global instance
export const errorLogger = ErrorLogger.getInstance();

// Global error handlers
window.addEventListener("error", () => {
  errorLogger.logAsyncError();
});

window.addEventListener("unhandledrejection", () => {
  errorLogger.logError();
});
