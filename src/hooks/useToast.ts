import { useState, useEffect } from "react";

export interface Toast {
  id: string;
  type: "error" | "success" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

// Simple toast store using React hooks
const toastStore: {
  toasts: Toast[];
  listeners: Array<(toasts: Toast[]) => void>;
  showToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
} = {
  toasts: [],
  listeners: [],

  showToast(toast: Omit<Toast, "id">) {
    const newToast: Toast = {
      ...toast,
      id: Math.random().toString(36).substr(2, 9),
      duration: toast.duration ?? (toast.type === "error" ? 8000 : 4000),
    };

    this.toasts = [...this.toasts, newToast];
    this.listeners.forEach((listener) => listener(this.toasts));

    // Auto-remove toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.removeToast(newToast.id);
      }, newToast.duration);
    }
  },

  removeToast(id: string) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.listeners.forEach((listener) => listener(this.toasts));
  },

  clearAllToasts() {
    this.toasts = [];
    this.listeners.forEach((listener) => listener(this.toasts));
  },
};

export const useToast = (): ToastContextType => {
  const [toasts, setToasts] = useState<Toast[]>(toastStore.toasts);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts([...newToasts]);
    toastStore.listeners.push(listener);

    return () => {
      toastStore.listeners = toastStore.listeners.filter((l) => l !== listener);
    };
  }, []);

  return {
    toasts,
    showToast: toastStore.showToast.bind(toastStore),
    removeToast: toastStore.removeToast.bind(toastStore),
    clearAllToasts: toastStore.clearAllToasts.bind(toastStore),
  };
};

// Global toast functions for use anywhere in the app
export const toast = {
  success: (message: string, title?: string, action?: Toast["action"]) => {
    toastStore.showToast({ type: "success", message, title, action });
  },

  error: (message: string, title?: string, action?: Toast["action"]) => {
    toastStore.showToast({ type: "error", message, title, action });
  },

  warning: (message: string, title?: string, action?: Toast["action"]) => {
    toastStore.showToast({ type: "warning", message, title, action });
  },

  info: (message: string, title?: string, action?: Toast["action"]) => {
    toastStore.showToast({ type: "info", message, title, action });
  },
};
