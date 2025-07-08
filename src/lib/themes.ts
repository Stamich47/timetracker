export type ThemeType =
  | "default"
  | "light"
  | "dark"
  | "ocean"
  | "forest"
  | "sunset";

export interface Theme {
  id: ThemeType;
  name: string;
  colors: {
    // Background colors
    background: string;
    surface: string;
    surfaceHover: string;

    // Text colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    // Primary accent colors
    primary: string;
    primaryHover: string;
    primaryText: string;

    // Secondary accent colors
    secondary: string;
    secondaryHover: string;
    secondaryText: string;

    // Status colors
    success: string;
    successHover: string;
    error: string;
    errorHover: string;
    warning: string;
    info: string;

    // Border and divider colors
    border: string;
    borderLight: string;
    divider: string;

    // Special elements
    gradient: string;
    shadow: string;
    cardBg: string;
    inputBg: string;
    inputBorder: string;
    inputFocus: string;

    // Selection colors
    blueSelection: string;
    blueText: string;
  };
}

export const themes: Record<ThemeType, Theme> = {
  default: {
    id: "default",
    name: "Default Blue",
    colors: {
      background: "#f8fafc",
      surface: "#ffffff",
      surfaceHover: "#f1f5f9",

      textPrimary: "#1f2937",
      textSecondary: "#4b5563",
      textMuted: "#6b7280",

      primary: "#3b82f6",
      primaryHover: "#2563eb",
      primaryText: "#ffffff",

      secondary: "#8b5cf6",
      secondaryHover: "#7c3aed",
      secondaryText: "#ffffff",

      success: "#10b981",
      successHover: "#059669",
      error: "#ef4444",
      errorHover: "#dc2626",
      warning: "#f59e0b",
      info: "#06b6d4",

      border: "#d1d5db",
      borderLight: "#e5e7eb",
      divider: "#f3f4f6",

      gradient: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      cardBg: "#ffffff",
      inputBg: "#ffffff",
      inputBorder: "#d1d5db",
      inputFocus: "#3b82f6",

      blueSelection: "#dbeafe",
      blueText: "#1d4ed8",
    },
  },

  light: {
    id: "light",
    name: "Clean Light",
    colors: {
      background: "#ffffff",
      surface: "#f8f9fa",
      surfaceHover: "#e9ecef",

      textPrimary: "#212529",
      textSecondary: "#495057",
      textMuted: "#6c757d",

      primary: "#0d6efd",
      primaryHover: "#0b5ed7",
      primaryText: "#ffffff",

      secondary: "#6f42c1",
      secondaryHover: "#5a2d91",
      secondaryText: "#ffffff",

      success: "#198754",
      successHover: "#157347",
      error: "#dc3545",
      errorHover: "#bb2d3b",
      warning: "#fd7e14",
      info: "#0dcaf0",

      border: "#dee2e6",
      borderLight: "#e9ecef",
      divider: "#f8f9fa",

      gradient: "linear-gradient(135deg, #0d6efd 0%, #6f42c1 100%)",
      shadow: "0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)",
      cardBg: "#f8f9fa",
      inputBg: "#ffffff",
      inputBorder: "#ced4da",
      inputFocus: "#0d6efd",

      blueSelection: "#cfe2ff",
      blueText: "#0a58ca",
    },
  },

  dark: {
    id: "dark",
    name: "Dark Mode",
    colors: {
      background: "#0f172a",
      surface: "#1e293b",
      surfaceHover: "#334155",

      textPrimary: "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",

      primary: "#3b82f6",
      primaryHover: "#2563eb",
      primaryText: "#ffffff",

      secondary: "#a855f7",
      secondaryHover: "#9333ea",
      secondaryText: "#ffffff",

      success: "#22c55e",
      successHover: "#16a34a",
      error: "#ef4444",
      errorHover: "#dc2626",
      warning: "#eab308",
      info: "#06b6d4",

      border: "#475569",
      borderLight: "#64748b",
      divider: "#334155",

      gradient: "linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)",
      shadow:
        "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
      cardBg: "#1e293b",
      inputBg: "#334155",
      inputBorder: "#475569",
      inputFocus: "#3b82f6",

      blueSelection: "#1e3a8a",
      blueText: "#93c5fd",
    },
  },

  ocean: {
    id: "ocean",
    name: "Ocean Breeze",
    colors: {
      background: "#f0f9ff",
      surface: "#ffffff",
      surfaceHover: "#e0f2fe",

      textPrimary: "#164e63",
      textSecondary: "#0e7490",
      textMuted: "#0891b2",

      primary: "#0891b2",
      primaryHover: "#0e7490",
      primaryText: "#ffffff",

      secondary: "#0284c7",
      secondaryHover: "#0369a1",
      secondaryText: "#ffffff",

      success: "#059669",
      successHover: "#047857",
      error: "#dc2626",
      errorHover: "#b91c1c",
      warning: "#d97706",
      info: "#0891b2",

      border: "#a7f3d0",
      borderLight: "#bfdbfe",
      divider: "#e0f2fe",

      gradient: "linear-gradient(135deg, #0891b2 0%, #0284c7 100%)",
      shadow:
        "0 4px 6px -1px rgb(8 145 178 / 0.1), 0 2px 4px -2px rgb(8 145 178 / 0.1)",
      cardBg: "#ffffff",
      inputBg: "#ffffff",
      inputBorder: "#67e8f9",
      inputFocus: "#0891b2",

      blueSelection: "#cffafe",
      blueText: "#0e7490",
    },
  },

  forest: {
    id: "forest",
    name: "Forest Green",
    colors: {
      background: "#f0fdf4",
      surface: "#ffffff",
      surfaceHover: "#dcfce7",

      textPrimary: "#14532d",
      textSecondary: "#166534",
      textMuted: "#15803d",

      primary: "#16a34a",
      primaryHover: "#15803d",
      primaryText: "#ffffff",

      secondary: "#059669",
      secondaryHover: "#047857",
      secondaryText: "#ffffff",

      success: "#22c55e",
      successHover: "#16a34a",
      error: "#dc2626",
      errorHover: "#b91c1c",
      warning: "#eab308",
      info: "#0891b2",

      border: "#bbf7d0",
      borderLight: "#dcfce7",
      divider: "#f0fdf4",

      gradient: "linear-gradient(135deg, #16a34a 0%, #059669 100%)",
      shadow:
        "0 4px 6px -1px rgb(22 163 74 / 0.1), 0 2px 4px -2px rgb(22 163 74 / 0.1)",
      cardBg: "#ffffff",
      inputBg: "#ffffff",
      inputBorder: "#86efac",
      inputFocus: "#16a34a",

      blueSelection: "#dcfce7",
      blueText: "#166534",
    },
  },

  sunset: {
    id: "sunset",
    name: "Sunset Orange",
    colors: {
      background: "#fff7ed",
      surface: "#ffffff",
      surfaceHover: "#fed7aa",

      textPrimary: "#9a3412",
      textSecondary: "#c2410c",
      textMuted: "#ea580c",

      primary: "#ea580c",
      primaryHover: "#dc2626",
      primaryText: "#ffffff",

      secondary: "#f97316",
      secondaryHover: "#ea580c",
      secondaryText: "#ffffff",

      success: "#16a34a",
      successHover: "#15803d",
      error: "#dc2626",
      errorHover: "#b91c1c",
      warning: "#f59e0b",
      info: "#0891b2",

      border: "#fed7aa",
      borderLight: "#ffedd5",
      divider: "#fff7ed",

      gradient: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
      shadow:
        "0 4px 6px -1px rgb(234 88 12 / 0.1), 0 2px 4px -2px rgb(234 88 12 / 0.1)",
      cardBg: "#ffffff",
      inputBg: "#ffffff",
      inputBorder: "#fdba74",
      inputFocus: "#ea580c",

      blueSelection: "#fed7aa",
      blueText: "#c2410c",
    },
  },
};
