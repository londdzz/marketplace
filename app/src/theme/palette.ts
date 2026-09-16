/**
 * Raw colour values. Nothing outside this file should name a hex code.
 *
 * The blue takes the role mobile.de gives its orange: one accent, used only for
 * primary actions, links and selected states. Everything else is neutral.
 *
 * The neutrals are cool rather than pure grey. A flat grey next to a saturated
 * blue reads as cheap; a neutral carrying a little of the accent's own hue is
 * what makes an interface look designed rather than assembled.
 */

export const blue = {
  25: '#F5F8FF',
  50: '#EAF1FF',
  100: '#D6E3FF',
  200: '#B3CAFF',
  300: '#8FB0FF',
  400: '#5685FB',
  500: '#2E63F0',
  /** The primary action in light mode. */
  600: '#1E4FD8',
  700: '#1A3FAC',
  800: '#173483',
  900: '#152B66',
  950: '#101C42',
} as const;

/**
 * Cool neutrals. A car marketplace shows a lot of photographs, and a neutral
 * this close to grey keeps paintwork looking like the colour it actually is.
 */
export const grey = {
  0: '#FFFFFF',
  25: '#FBFCFD',
  50: '#F6F8FA',
  100: '#EFF2F6',
  150: '#E7EBF1',
  200: '#DFE4EB',
  300: '#CAD2DC',
  400: '#98A3B2',
  500: '#6B7684',
  600: '#4E5866',
  700: '#3A424F',
  800: '#272E38',
  850: '#1D242C',
  900: '#161C23',
  925: '#111720',
  950: '#0B0F15',
} as const;

export const green = {
  50: '#E8F7EF',
  100: '#CFEEDE',
  400: '#3FC98C',
  500: '#10935A',
  600: '#0B7A4A',
} as const;

export const red = {
  50: '#FDEDED',
  100: '#FADCDC',
  400: '#FF6B6B',
  500: '#DC3B3B',
  600: '#C42B2B',
} as const;

export const amber = {
  50: '#FEF5E6',
  100: '#FCE9CB',
  400: '#F2B457',
  500: '#C97A08',
  600: '#A8640A',
} as const;
