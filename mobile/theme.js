import React, { 
  createContext, 
  useCallback, 
  useContext, 
  useEffect, 
  useMemo, 
  useState 
} from 'react';

import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Palettes ----------------------------------------------------------
// Same keys in both maps — that symmetry is what lets the toggle just
// swap one object for the other.

export const lightColors = {
  background: '#F6FAF7',
  surface: '#FFFFFF',
  surfaceAlt: '#E9F5EE',
  text: '#1A2B22',
  textMuted: '#38765F',
  primary: '#3AA675',
  primaryDark: '#2F865F',
  primaryLight: '#D9F0E4',
  success: '#52C41A',
  warning: '#F5A623',
  error: '#E74C3C',
  border: '#C9DFD1',
  borderStrong: '#A8CDB6',
  onPrimary: '#FFFFFF',
};

export const darkColors = {
  background: '#08140E',
  surface: '#0F1E16',
  surfaceAlt: '#173125',
  text: '#E9F7EF',
  textMuted: '#9CC5A6',
  primary: '#6FD8A8',
  primaryDark: '#57BD90',
  primaryLight: '#234D3A',
  success: '#7BD97B',
  warning: '#FFC857',
  error: '#FF7B6F',
  border: '#28513D',
  borderStrong: '#3D7057',
  onPrimary: '#08140E',
};

const MODE_KEY = 'noteriety_theme_mode';

// 2. Context -----------------------------------------------------------
// mode is one of: 'system' | 'light' | 'dark'

const ThemeContext = createContext({
  colors: lightColors,
  mode: 'system',
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setStoredMode] = useState('system');

   // Load the saved preference on launch so the choice survives a restart.
  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((saved) => {
      if (['system', 'light', 'dark'].includes(saved)) {
        setStoredMode(saved);
      }
    }).catch(() => {});
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setMode = useCallback((nextMode) => {
    if (!['system', 'light', 'dark'].includes(nextMode)) return;
    setStoredMode(nextMode);
    AsyncStorage.setItem(MODE_KEY, nextMode).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  const value = useMemo(
    () => ({ colors, mode, isDark, setMode, toggle }),
    [colors, mode, isDark, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// 3. Hook --------------------------------------------------------------
export function useTheme() {
  return useContext(ThemeContext);
}
