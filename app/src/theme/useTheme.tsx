import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from './colors';
import { typography, tabularNumbers, fontFamilies } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  colors: ThemeColors;
  typography: typeof typography;
  tabularNumbers: typeof tabularNumbers;
  fontFamilies: typeof fontFamilies;
  spacing: typeof spacing;
  radius: typeof radius;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useNativeColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value: ThemeContextValue = {
    colors,
    typography,
    tabularNumbers,
    fontFamilies,
    spacing,
    radius,
    isDark,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback if called outside provider
    const isDark = false;
    return {
      colors: lightColors,
      typography,
      tabularNumbers,
      fontFamilies,
      spacing,
      radius,
      isDark,
      themeMode: 'system',
      setThemeMode: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
};
