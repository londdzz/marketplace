/**
 * Corner radii.
 *
 * Taken from the mobile.de app rather than their website: cards, sheets and the
 * search bar are generously rounded. Everything here is one of five steps, so
 * nothing on screen has a corner that belongs to no scale.
 */
export const radius = {
  none: 0,
  /** Small tags and photo thumbnails. */
  sm: 8,
  /** Buttons, inputs, rows. */
  md: 12,
  /** Cards, sheets, tiles. */
  lg: 16,
  /** The panel a sheet rises into. */
  xl: 22,
  /** Chips, avatars, the favourite button: anything a pill or a circle. */
  full: 999,
} as const;

export type RadiusKey = keyof typeof radius;
