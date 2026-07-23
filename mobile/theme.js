// theme.js — Noteriety mobile theming foundation
// Single source of truth for color + light/dark switching.
// Screens consume semantic names (colors.primary), never raw hex.

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Palettes ----------------------------------------------------------
// Same keys in both maps — that symmetry is what lets the toggle just
// swap one object for the other.

const light = {
  background: '#F6FAF7',
  surface:    '#FFFFFF',
  surfaceAlt: '#E9F5EE',
  text:       '#1A2B22',
  textMuted:  '#38765F',
  primary:    '#2A7F55', // darkened from #3AA675 -> ~4.9:1 with white
  onPrimary:  '#FFFFFF', // text/icon color that sits ON a primary fill
  success:    '#52C41A',
  warning:    '#F5A623',
  error:      '#E74C3C',
  border:     '#DCEBE2',
};

const dark = {
  background: '#08140E',
  surface:    '#0F1E16',
  surfaceAlt: '#173125',
  text:       '#E9F7EF',
  textMuted:  '#9CC5A6',
  primary:    '#6FD8A8',
  onPrimary:  '#08140E', // dark text on a light primary fill
  success:    '#7BD97B',
  warning:    '#FFC857',
  error:      '#FF7B6F',
  border:     '#173125',
};

export const palettes = { light, dark };

// Typography — system faces only, so there's no font loading to fail.
// Serif carries the brand voice; mono carries the small label voice.
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

// Shared label style for the small uppercase eyebrow text.
export const eyebrow = {
  fontFamily: fonts.mono,
  fontSize: 11,
  letterSpacing: 1.4,
  fontWeight: '600',
};

const MODE_KEY = 'noteriety_theme_mode';

// 2. Context -----------------------------------------------------------
// mode is one of: 'system' | 'light' | 'dark'

const ThemeContext = createContext({
  colors: light,
  mode: 'system',
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [override, setOverride] = useState('system');

  // Load the saved preference on launch so the choice survives a restart.
  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setOverride(saved);
      }
    });
  }, []);

  const isDark =
    override === 'system' ? systemScheme === 'dark' : override === 'dark';

  const colors = isDark ? dark : light;

  const setMode = useCallback((next) => {
    setOverride(next);
    AsyncStorage.setItem(MODE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  const value = useMemo(
    () => ({ colors, mode: override, isDark, setMode, toggle }),
    [colors, override, isDark, setMode, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// 3. Hook --------------------------------------------------------------
export const useTheme = () => useContext(ThemeContext);