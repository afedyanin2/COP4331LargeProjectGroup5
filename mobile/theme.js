import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';

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
  border:     '#E9F5EE', // hairline; equals surfaceAlt for now
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

const ThemeContext = createContext({
  colors: light,
  mode: 'system',
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children, initial = 'system' }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [override, setOverride] = useState(initial);

  const isDark =
    override === 'system' ? systemScheme === 'dark' : override === 'dark';

  const colors = isDark ? dark : light;

  const setMode = useCallback((next) => setOverride(next), []);
  const toggle = useCallback(
    () => setOverride(isDark ? 'light' : 'dark'),
    [isDark],
  );

  const value = useMemo(
    () => ({ colors, mode: override, isDark, setMode, toggle }),
    [colors, override, isDark, setMode, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);