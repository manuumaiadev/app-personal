import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DARK = {
  bg: '#0e0e10',
  surface: '#1c1c1e',
  elevated: '#252529',
  border: '#2c2c2e',
  red: '#E31E24',
  textPrimary: '#f5f5f7',
  textSecondary: '#8e8e93',
  textTertiary: '#48484a',
  inputBg: '#252529',
  inputBorder: '#3a3a3c',
  placeholder: '#636366',
};

export const LIGHT = {
  bg: '#f3f4f6',
  surface: '#ffffff',
  elevated: '#f9fafb',
  border: '#e5e7eb',
  red: '#E31E24',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  inputBg: '#f9fafb',
  inputBorder: '#e5e7eb',
  placeholder: '#9ca3af',
};

const ThemeContext = createContext({ isDark: false, theme: LIGHT, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@tema').then(val => {
      if (val !== null) setIsDark(val === 'escuro');
    }).catch(() => {});
  }, []);

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('@tema', next ? 'escuro' : 'claro').catch(() => {});
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme: isDark ? DARK : LIGHT }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
