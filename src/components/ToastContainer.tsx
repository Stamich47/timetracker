import React from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useToast, type Toast } from "../hooks/useToast";

// Toast component for rendering
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const getIcon = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStyles = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-orange-50 border-orange-200 text-orange-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out
            transform translate-x-0 opacity-100 animate-in slide-in-from-right-2
            ${getStyles(toast.type)}
          `}
        >
          <div className="flex items-start gap-3">
            {getIcon(toast.type)}
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="font-semibold text-sm mb-1">{toast.title}</h4>
              )}
              <p className="text-sm">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="mt-2 text-sm font-medium underline hover:no-underline"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
