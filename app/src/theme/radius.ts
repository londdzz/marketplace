/**
 * Corner radii. Four steps and a pill, nothing between.
 */
export const radius = {
  none: 0,
  /** Chips, inputs and small tags. */
  sm: 6,
  /** Buttons and rows. */
  md: 10,
  /** Cards, sheets, tiles, photographs. */
  lg: 16,
  /** The panel a sheet rises into. */
  xl: 20,
  /** Pills, avatars, the favourite button. */
  full: 999,
} as const;

export type RadiusKey = keyof typeof radius;
