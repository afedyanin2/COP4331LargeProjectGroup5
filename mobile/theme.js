// theme.js — Noteriety mobile theming foundation
// Single source of truth for color + light/dark switching.
// Screens consume semantic names (colors.primary), never raw hex.

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';

// 1. Palettes ----------------------------------------------------------
// Same keys in both maps — that symmetry is what lets the toggle just
// swap one object for the other. Every screen reads these keys, so
// adding a token later means adding it here once, in both maps.

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

// 2. Context -----------------------------------------------------------
// override is one of: 'system' | 'light' | 'dark'
// 'system' follows the OS; the other two force a mode.

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

// 3. Hook --------------------------------------------------------------
export const useTheme = () => useContext(ThemeContext);

// 4. How screens use it ------------------------------------------------
//
// Wrap the app root once:
//   <ThemeProvider><RootNavigator /></ThemeProvider>
//
// A primary button (this is why onPrimary exists — never hardcode the
// label color, or it breaks in one of the two modes):
//   const { colors } = useTheme();
//   <Pressable style={{ backgroundColor: colors.primary }}>
//     <Text style={{ color: colors.onPrimary }}>Log in</Text>
//   </Pressable>
//
// The Settings dark-mode row:
//   const { isDark, mode, setMode, toggle } = useTheme();
//   <Switch value={isDark} onValueChange={toggle} />
//   // or a 3-way control: setMode('system' | 'light' | 'dark')
