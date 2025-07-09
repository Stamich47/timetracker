export type ThemeType = "light" | "dark";

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
  light: {
    id: "light",
    name: "Light Mode",
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
};
