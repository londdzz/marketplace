/**
 * Raw colour values. Nothing outside this file should name a hex code.
 *
 * The blue takes the role mobile.de gives its orange: one accent, used only for
 * primary actions, links and selected states. Everything else is neutral. That
 * restraint is most of why a dense marketplace layout stays readable.
 */

export const blue = {
  50: '#EFF5FF',
  100: '#DBE7FF',
  200: '#BFD4FF',
  300: '#93B4FF',
  400: '#5E8CFF',
  500: '#2F6BFF',
  600: '#1450E0',
  700: '#0F3FB0',
  800: '#10357F',
  900: '#122C63',
} as const;

/**
 * Warm-free greys. A car marketplace shows a lot of photographs, and a neutral
 * grey keeps paintwork looking like the colour it actually is.
 */
export const grey = {
  0: '#FFFFFF',
  25: '#FAFAFB',
  50: '#F4F5F7',
  100: '#EBECF0',
  200: '#DDDFE4',
  300: '#C3C7CF',
  400: '#9AA0AB',
  500: '#6F7682',
  600: '#515865',
  700: '#3A404B',
  800: '#252A33',
  900: '#15181E',
  950: '#0C0E12',
} as const;

export const green = {
  100: '#D7F2E1',
  500: '#18945A',
  600: '#0F7A48',
} as const;

export const red = {
  100: '#FBE0E0',
  500: '#D3302F',
  600: '#B02524',
} as const;

export const amber = {
  100: '#FDEFD0',
  500: '#B97706',
  600: '#96600A',
} as const;
