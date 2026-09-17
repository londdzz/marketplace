/**
 * The spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 56. Nothing in between, so
 * every gap on every screen is one of nine values.
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
  huge: 40,
  giant: 56,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * The gutter every screen keeps from the edge of the display: sixteen on a
 * phone, twenty-four once there is room for it.
 */
export const screenPadding = spacing.lg;
