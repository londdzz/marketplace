import type { ViewStyle } from 'react-native';

/**
 * Two elevations, and only two.
 *
 * Flat with a one-pixel border, or the sheet shadow. Cards never carry a
 * shadow: a list of shadowed cards is noise, and the border does the same job
 * without dirtying the page. The shadow is for the things that genuinely float
 * above it — a bottom sheet, a dialog, the bar pinned under a form.
 */
export type ElevationKey = 'none' | 'sheet';

export type Elevation = Record<ElevationKey, ViewStyle>;

export const lightElevation: Elevation = {
  none: {},
  sheet: {
    shadowColor: '#0A1614',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const darkElevation: Elevation = {
  none: {},
  sheet: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};
