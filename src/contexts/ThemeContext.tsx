import React, { useEffect, useState } from "react";
import { themes, type ThemeType, type Theme } from "../lib/themes";

interface ThemeContextType {
  currentTheme: Theme;
  themeType: ThemeType;
  setTheme: (theme: ThemeType) => void;
  availableThemes: Theme[];
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
);

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeType, setThemeType] = useState<ThemeType>(() => {
    const savedTheme = localStorage.getItem("time-tracker-theme");
    return (savedTheme as ThemeType) || "default";
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeType(newTheme);
    localStorage.setItem("time-tracker-theme", newTheme);
  };

  const currentTheme = themes[themeType];
  const availableThemes = Object.values(themes);

  // Apply CSS custom properties for the current theme
  useEffect(() => {
    const root = document.documentElement;
    const { colors } = currentTheme;

    // Apply all theme colors as CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update body background color
    document.body.style.backgroundColor = colors.background;
  }, [currentTheme]);

  const value = {
    currentTheme,
    themeType,
    setTheme,
    availableThemes,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export { ThemeProvider, ThemeContext };
