import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Bug,
  X,
  CheckCircle,
} from "lucide-react";
import { networkMonitor, isRetryableError } from "../lib/retryUtils";
import type { NetworkError } from "../lib/retryUtils";
import { toast } from "../hooks/useToast";

export interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = "",
}) => {
  const [isOnline, setIsOnline] = useState(networkMonitor.getIsOnline());
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = networkMonitor.onStatusChange(setIsOnline);
    return unsubscribe;
  }, []);

  if (!error) return null;

  const networkError = error as NetworkError;
  const isNetworkRelated = networkError.isNetworkError || !isOnline;
  const canRetry = networkError.isRetryable || isRetryableError(error);

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
      toast.success("Operation completed successfully");
    } catch {
      // Retry failed, error will be handled by parent
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorIcon = () => {
    if (!isOnline) return <WifiOff className="w-5 h-5 text-orange-500" />;
    if (isNetworkRelated) return <Wifi className="w-5 h-5 text-blue-500" />;
    return <AlertTriangle className="w-5 h-5 text-red-500" />;
  };

  const getErrorTitle = () => {
    if (!isOnline) return "You're offline";
    if (isNetworkRelated) return "Connection issue";
    return "Something went wrong";
  };

  const getErrorMessage = () => {
    if (!isOnline) {
      return "Please check your internet connection and try again.";
    }
    if (isNetworkRelated) {
      return "There was a problem connecting to our servers. This usually resolves itself quickly.";
    }
    return error.message || "An unexpected error occurred. Please try again.";
  };

  return (
    <div
      className={`p-4 rounded-lg border ${className} ${
        !isOnline
          ? "bg-orange-50 border-orange-200 text-orange-800"
          : isNetworkRelated
          ? "bg-blue-50 border-blue-200 text-blue-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getErrorIcon()}
          <div className="flex-1">
            <h3 className="font-medium">{getErrorTitle()}</h3>
            <p className="text-sm mt-1">{getErrorMessage()}</p>

            {/* Error details for development */}
            {showDetails && import.meta.env.DEV && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium">
                  <Bug className="inline w-3 h-3 mr-1" />
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {error.message}
                  {error.stack && (
                    <>
                      {"\n\n"}
                      {error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2 ml-4">
          {canRetry && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying || !isOnline}
              className={`flex items-center space-x-1 px-3 py-1 text-xs rounded-md transition-colors ${
                !isOnline
                  ? "bg-orange-100 text-orange-700 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 hover:text-gray-900"
              }`}
            >
              {isRetrying ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              <span>{isRetrying ? "Retrying..." : "Retry"}</span>
            </button>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-black/10 rounded transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Inline error component for forms
export interface InlineErrorProps {
  error: string | null;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  error,
  className = "",
}) => {
  if (!error) return null;

  return (
    <p className={`mt-1 text-sm text-red-600 dark:text-red-400 ${className}`}>
      {error}
    </p>
  );
};

// Success message component
export interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  onDismiss,
  className = "",
}) => {
  return (
    <div
      className={`p-4 rounded-lg border bg-green-50 border-green-200 text-green-800 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          <p className="text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Loading state component with error handling
export interface LoadingStateProps {
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  loadingMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  onRetry,
  loadingMessage = "Loading...",
  children,
  className = "",
}) => {
  if (error) {
    return (
      <ErrorDisplay error={error} onRetry={onRetry} className={className} />
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center space-x-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{loadingMessage}</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
