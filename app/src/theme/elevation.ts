import type { ViewStyle } from 'react-native';

/**
 * Elevation.
 *
 * Used sparingly and only where something genuinely sits above the page: a
 * primary button, a bottom sheet, the action bar pinned under a form. A list of
 * shadowed cards turns into noise, so cards stay flat and lean on their border.
 *
 * Shadows barely register on a near-black page, so the dark set leans on deeper
 * opacity rather than pretending light works the same way in the dark.
 */
export type ElevationKey = 'none' | 'sm' | 'md' | 'lg';

export type Elevation = Record<ElevationKey, ViewStyle>;

export const lightElevation: Elevation = {
  none: {},
  sm: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  lg: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
};

export const darkElevation: Elevation = {
  none: {},
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
};
