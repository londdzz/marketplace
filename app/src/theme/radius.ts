/**
 * Small radii on purpose. Rounded pills read as consumer-playful; a car
 * marketplace reads as a tool, so corners stay close to square.
 */
export const radius = {
  none: 0,
  sm: 3,
  md: 6,
  lg: 10,
  /** Only for avatars and toggles that genuinely are circles. */
  full: 999,
} as const;

export type RadiusKey = keyof typeof radius;
