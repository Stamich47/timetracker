import { errorLogger, ErrorType } from "./errorLogger";

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface NetworkError extends Error {
  isNetworkError: boolean;
  statusCode?: number;
  isRetryable: boolean;
}

/**
 * Check if an error is a network-related error that should be retried
 */
export function isRetryableError(error: Error): boolean {
  // Network errors
  if (!navigator.onLine) return true;

  // Timeout errors
  if (error.message.includes("timeout") || error.message.includes("Timeout"))
    return true;

  // HTTP status codes that are retryable
  const networkError = error as NetworkError;
  if (networkError.statusCode) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504]; // Request Timeout, Too Many Requests, Server Errors
    return retryableStatuses.includes(networkError.statusCode);
  }

  // Supabase specific errors
  if (
    error.message.includes("Failed to fetch") ||
    error.message.includes("NetworkError") ||
    error.message.includes("connection") ||
    error.message.includes("Connection")
  ) {
    return true;
  }

  return false;
}

/**
 * Create a network error with additional metadata
 */
export function createNetworkError(
  message: string,
  statusCode?: number,
  originalError?: Error
): NetworkError {
  const error = new Error(message) as NetworkError;
  error.isNetworkError = true;
  error.statusCode = statusCode;
  error.isRetryable = isRetryableError(error);

  if (originalError?.stack) {
    error.stack = originalError.stack;
  }

  return error;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    retryCondition = isRetryableError,
  } = options;

  let lastError: Error;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        break;
      }

      // Log retry attempt
      errorLogger.logError(
        new Error(
          `Retry attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`
        ),
        ErrorType.NETWORK,
        {
          attempt,
          maxAttempts,
          nextRetryIn: currentDelay,
          originalError: lastError.message,
        }
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  // If we get here, all retries failed
  throw lastError!;
}

/**
 * Enhanced API call wrapper with retry logic and better error handling
 */
export async function apiCallWithRetry<T>(
  apiCall: () => Promise<T>,
  context: string,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await withRetry(apiCall, {
      maxAttempts: 3,
      delayMs: 1000,
      ...options,
    });
  } catch (error) {
    const apiError = error as Error;

    // Create a more user-friendly error message
    let userMessage = "Something went wrong. Please try again.";
    let shouldRetry = false;

    if (!navigator.onLine) {
      userMessage =
        "You appear to be offline. Please check your connection and try again.";
    } else if (isRetryableError(apiError)) {
      userMessage = "Connection issue. Please try again in a moment.";
      shouldRetry = true;
    } else if (
      apiError.message.includes("unauthorized") ||
      apiError.message.includes("Unauthorized")
    ) {
      userMessage = "Your session has expired. Please sign in again.";
    } else if (
      apiError.message.includes("forbidden") ||
      apiError.message.includes("Forbidden")
    ) {
      userMessage = "You don't have permission to perform this action.";
    } else if (
      apiError.message.includes("not found") ||
      apiError.message.includes("Not found")
    ) {
      userMessage = "The requested item could not be found.";
    }

    // Log the API error
    errorLogger.logApiError(apiError, context, "API_CALL", {
      userMessage,
      shouldRetry,
      isOnline: navigator.onLine,
    });

    // Create enhanced error
    const enhancedError = createNetworkError(userMessage, undefined, apiError);
    enhancedError.isRetryable = shouldRetry;

    throw enhancedError;
  }
}

/**
 * Hook for handling async operations with loading states and error recovery
 */
export function useAsyncOperation() {
  return {
    async execute<T>(
      operation: () => Promise<T>,
      options: {
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
        showErrorToast?: boolean;
        retryOnError?: boolean;
      } = {}
    ): Promise<T | null> {
      const {
        onSuccess,
        onError,
        showErrorToast = true,
        retryOnError = false,
      } = options;

      try {
        const result = await operation();
        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error as Error;
        onError?.(err);

        if (showErrorToast) {
          // Error toast is already shown by errorLogger, but we could add custom handling here
        }

        if (retryOnError && isRetryableError(err)) {
          // Could implement auto-retry logic here
        }

        return null;
      }
    },
  };
}

/**
 * Global network status monitoring
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private listeners: ((isOnline: boolean) => void)[] = [];
  private isOnline = navigator.onLine;

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  constructor() {
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());
  }

  private handleOnline() {
    this.isOnline = true;
    errorLogger.logError(
      new Error("Network connection restored"),
      ErrorType.NETWORK,
      { isOnline: true }
    );
    this.notifyListeners(true);
  }

  private handleOffline() {
    this.isOnline = false;
    errorLogger.logError(
      new Error("Network connection lost"),
      ErrorType.NETWORK,
      { isOnline: false }
    );
    this.notifyListeners(false);
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach((listener) => {
      try {
        listener(isOnline);
      } catch (error) {
        console.warn("Error in network status listener:", error);
      }
    });
  }

  onStatusChange(listener: (isOnline: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }
}

export const networkMonitor = NetworkMonitor.getInstance();
