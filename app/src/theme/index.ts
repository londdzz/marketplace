import { createContext, useContext } from 'react';

import { darkColors, lightColors, type ThemeColors } from './colors';
import { darkElevation, lightElevation, type Elevation } from './elevation';
import { radius } from './radius';
import { screenPadding, spacing } from './spacing';
import { typography } from './typography';

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  /** Drop shadows, for the few things that genuinely sit above the page. */
  elevation: Elevation;
  screenPadding: number;
  isDark: boolean;
};

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  radius,
  typography,
  elevation: lightElevation,
  screenPadding,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  radius,
  typography,
  elevation: darkElevation,
  screenPadding,
  isDark: true,
};

/**
 * Autevo is a dark product. Petrol carries every surface, on every device,
 * whatever the phone is set to — the identity is built on it and a light
 * version of the same screens is a different app.
 *
 * The light tokens are still here and still correct, because the store icon and
 * the splash tile are drawn on paper, and because switching back is one line.
 */
export const ThemeContext = createContext<Theme>(darkTheme);

/**
 * The only way a screen reads a colour, a gap or a text style. No screen
 * declares its own hex codes or pixel sizes.
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * The app's theme. Dark, always: the device's setting is deliberately not read.
 */
export function useAppTheme(): Theme {
  return darkTheme;
}

export * from './colors';
export * from './fonts';
export * from './elevation';
export * from './palette';
export * from './radius';
export * from './spacing';
export * from './typography';
