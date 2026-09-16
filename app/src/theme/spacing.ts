/**
 * A four point scale. Marketplace layouts are dense, so most gaps are one of
 * the first three steps and anything larger is deliberate.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * The gutter every screen keeps from the edge of the display.
 */
export const screenPadding = spacing.lg;
