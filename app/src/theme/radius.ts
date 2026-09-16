/**
 * Corner radii.
 *
 * Taken from the mobile.de app rather than their website: cards, sheets and the
 * search bar are generously rounded, while the small metadata chips stay closer
 * to square.
 */
export const radius = {
  none: 0,
  /** Metadata chips and small tags. */
  sm: 6,
  /** Buttons, inputs, cards. */
  md: 10,
  /** The search bar, bottom sheets, photos. */
  lg: 14,
  xl: 20,
  /** Avatars, the favourite button, anything genuinely circular. */
  full: 999,
} as const;

export type RadiusKey = keyof typeof radius;
