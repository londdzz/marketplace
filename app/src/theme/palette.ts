/**
 * Raw colour values. Nothing outside this file should name a hex code.
 *
 * Two families. **Petrol** carries every dark surface — it is the only thing
 * keeping this apart from a category where everything is blue. **Azure** is the
 * action colour and nothing else is allowed to be azure, because the moment
 * something azure is not tappable the colour stops meaning anything.
 */

export const petrol = {
  700: '#16403A',
  800: '#0E2E2A',
  900: '#0B2320',
} as const;

export const azure = {
  400: '#6BA8F7',
  500: '#3B8AF0',
  600: '#1E6FD9',
  700: '#1A5FBA',
} as const;

/** The light tile the mark sits on, in the icon and on the splash. */
export const paper = '#F7F6F3';

/**
 * Neutrals with a trace of the petrol in them, so a grey next to a petrol
 * surface never looks like a different system.
 */
export const neutral = {
  0: '#FFFFFF',
  25: '#F6F7F8',
  50: '#EDF1F2',
  100: '#E6EBEC',
  200: '#DFE4E6',
  300: '#C6CFD1',
  400: '#93A5A2',
  500: '#5A6A6E',
  600: '#3D4F52',
  700: '#234039',
  800: '#16302B',
  900: '#0F211E',
  950: '#0A1614',
  ink: '#10221F',
  inkLight: '#EDF2F1',
} as const;

export const green = {
  light: '#1F8A5B',
  dark: '#3BAF7A',
  tintLight: 'rgba(31, 138, 91, 0.12)',
  tintDark: 'rgba(59, 175, 122, 0.16)',
} as const;

export const amber = {
  light: '#C8871F',
  dark: '#E0A542',
  tintLight: 'rgba(200, 135, 31, 0.12)',
  tintDark: 'rgba(224, 165, 66, 0.16)',
} as const;

export const red = {
  light: '#C8382F',
  dark: '#E56A60',
  tintLight: 'rgba(200, 56, 47, 0.12)',
  tintDark: 'rgba(229, 106, 96, 0.16)',
} as const;
