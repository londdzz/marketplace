import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';
import { radius } from './radius';
import { screenPadding, spacing } from './spacing';
import { typography } from './typography';

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  screenPadding: number;
  isDark: boolean;
};

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  radius,
  typography,
  screenPadding,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  radius,
  typography,
  screenPadding,
  isDark: true,
};

export const ThemeContext = createContext<Theme>(lightTheme);

/**
 * The only way a screen reads a colour, a gap or a text style. No screen
 * declares its own hex codes or pixel sizes.
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Follows the device between light and dark.
 */
export function useSystemTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

export * from './colors';
export * from './palette';
export * from './radius';
export * from './spacing';
export * from './typography';
