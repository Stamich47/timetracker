import React from "react";
import { themes, type ThemeType } from "./themes";

class ThemeManager {
  private currentThemeType: ThemeType = "light";
  private listeners: ((theme: ThemeType) => void)[] = [];

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme() {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem("time-tracker-theme") as ThemeType;
    if (savedTheme && themes[savedTheme]) {
      this.currentThemeType = savedTheme;
    }
    this.applyTheme(this.currentThemeType);
  }

  private applyTheme(themeType: ThemeType) {
    const theme = themes[themeType];
    const root = document.documentElement;
    const { colors } = theme;

    // Apply all theme colors as CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update body background - use gradient if available, otherwise use background color
    if (colors.gradient) {
      document.body.style.background = colors.gradient;
    } else {
      document.body.style.background = colors.background;
    }
    document.body.style.backgroundAttachment = "fixed";
  }

  public setTheme(themeType: ThemeType) {
    if (!themes[themeType]) {
      console.warn(`Theme "${themeType}" not found`);
      return;
    }

    this.currentThemeType = themeType;
    localStorage.setItem("time-tracker-theme", themeType);
    this.applyTheme(themeType);

    // Notify listeners
    this.listeners.forEach((listener) => listener(themeType));
  }

  public getCurrentTheme() {
    return themes[this.currentThemeType];
  }

  public getCurrentThemeType() {
    return this.currentThemeType;
  }

  public getAvailableThemes() {
    return Object.values(themes);
  }

  public subscribe(listener: (theme: ThemeType) => void) {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Debug function for testing
  public debugThemes() {
    console.log("Available themes:", Object.keys(themes));
    console.log("Current theme:", this.currentThemeType);
    console.log("Current theme colors:", this.getCurrentTheme().colors);
  }
}

// Create a singleton instance
export const themeManager = new ThemeManager();

// Make it globally available for debugging (only in development)
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { themeManager: ThemeManager }).themeManager =
    themeManager;
}

// Hook for React components
export const useTheme = () => {
  const [currentThemeType, setCurrentThemeType] = React.useState(
    themeManager.getCurrentThemeType()
  );

  React.useEffect(() => {
    const unsubscribe = themeManager.subscribe(setCurrentThemeType);
    return unsubscribe;
  }, []);

  return {
    currentTheme: themeManager.getCurrentTheme(),
    themeType: currentThemeType,
    setTheme: themeManager.setTheme.bind(themeManager),
    availableThemes: themeManager.getAvailableThemes(),
  };
};
