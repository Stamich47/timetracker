/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ErrorInfo } from "react";
import { toast } from "../hooks/useToast";

export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  context?: Record<string, unknown>;
}

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
  logReactError(
    /* error: Error,
    errorInfo: ErrorInfo,
    context?: Record<string, unknown> */
  ) {
    // const errorDetails: ErrorDetails = {
    //   message: error.message,
    //   stack: error.stack,
    //   componentStack: errorInfo.componentStack || undefined,
    //   timestamp: new Date().toISOString(),
    //   url: window.location.href,
    //   userAgent: navigator.userAgent,
    //   context,
    // };

    // this.processError("React Error Boundary", errorDetails);

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
  logApiError(
    error: Error,
    endpoint: string,
    method: string,
    context?: Record<string, unknown>
  ) {
    // const errorDetails: ErrorDetails = {
    //   message: error.message,
    //   stack: error.stack,
    //   timestamp: new Date().toISOString(),
    //   url: window.location.href,
    //   userAgent: navigator.userAgent,
    //   context: {
    //     endpoint,
    //     method,
    //     ...context,
    //   },
    // };

    // this.processError("API Error", errorDetails);

    // Show user-friendly notification
    toast.error("Something went wrong. Please try again.", "Connection Error", {
      label: "Retry",
      onClick: () => window.location.reload(),
    });
  }

  /**
   * Log async errors (promises, setTimeout, etc.)
   */
  logAsyncError(
    error: Error,
    source: string,
    context?: Record<string, unknown>
  ) {
    // const errorDetails: ErrorDetails = {
    //   message: error.message,
    //   stack: error.stack,
    //   timestamp: new Date().toISOString(),
    //   url: window.location.href,
    //   userAgent: navigator.userAgent,
    //   context: {
    //     source,
    //     ...context,
    //   },
    // };
    // this.processError("Async Error", errorDetails);
  }

  /**
   * Log general errors
   */
  logError(
    error: Error,
    type: ErrorType = ErrorType.UNKNOWN,
    context?: Record<string, unknown>
  ) {
    // const errorDetails: ErrorDetails = {
    //   message: error.message,
    //   stack: error.stack,
    //   timestamp: new Date().toISOString(),
    //   url: window.location.href,
    //   userAgent: navigator.userAgent,
    //   context,
    // };
    // this.processError(type, errorDetails);
  }

  // private processError(type: string, errorDetails: ErrorDetails) {
  //   // Temporarily disable error logging to prevent console issues
  //   // console.error(`[${type}] ${errorDetails.message}`);

  //   // Send to monitoring service (future implementation)
  //   // this.sendToMonitoringService(type, errorDetails);

  //   // Store locally for debugging
  //   // this.storeErrorLocally(type, errorDetails);
  // }

  private sendToMonitoringService(type: string, errorDetails: ErrorDetails) {
    // This is where you'd integrate with Sentry, LogRocket, DataDog, etc.
    // For now, we'll just log it - avoid passing complex objects
    console.warn(
      `Would send ${type} to monitoring service: ${errorDetails.message}`
    );

    // Example Sentry integration (when you add it):
    // import * * Sentry from '@sentry/react';
    // Sentry.captureException(new Error(errorDetails.message), {
    //   tags: { type },
    //   extra: errorDetails,
    // });
  }

  private storeErrorLocally(type: string, errorDetails: ErrorDetails) {
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem("app_errors") || "[]"
      );
      const newError = { type, ...errorDetails };

      // Keep only last 10 errors to prevent localStorage bloat
      const updatedErrors = [newError, ...existingErrors].slice(0, 10);

      localStorage.setItem("app_errors", JSON.stringify(updatedErrors));
    } catch (error) {
      console.warn("Failed to store error locally:", error);
    }
  }

  /**
   * Get locally stored errors for debugging
   */
  getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem("app_errors") || "[]");
    } catch (error) {
      console.warn("Failed to retrieve stored errors:", error);
      return [];
    }
  }

  /**
   * Clear locally stored errors
   */
  clearStoredErrors() {
    try {
      localStorage.removeItem("app_errors");
    } catch (error) {
      console.warn("Failed to clear stored errors:", error);
    }
  }
}

// Global instance
export const errorLogger = ErrorLogger.getInstance();

// Global error handlers
window.addEventListener("error", (event) => {
  errorLogger.logAsyncError(new Error(event.message), "Global Error Handler", {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  errorLogger.logError(
    new Error(event.reason?.message || "Unhandled Promise Rejection"),
    ErrorType.UNKNOWN,
    {
      reason: event.reason,
      promise: "Promise rejection",
    }
  );
});
