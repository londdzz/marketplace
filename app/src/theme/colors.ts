import { amber, blue, green, grey, red } from './palette';

/**
 * Every colour a screen is allowed to use, named by what it is for rather than
 * what it looks like, so light and dark can differ without any screen knowing.
 */
export type ThemeColors = {
  /** The page behind the cards. */
  background: string;
  /** Cards, sheets, headers: the surfaces that sit on the background. */
  surface: string;
  /** A surface that needs to recede, such as an input or a disabled chip. */
  surfaceMuted: string;
  /** Hairlines and card outlines. */
  border: string;
  borderStrong: string;

  /** Body copy and, importantly, prices. Prices are never the accent colour. */
  text: string;
  /** Metadata lines: year, kilometres, fuel, location. */
  textMuted: string;
  /** Placeholders and disabled labels. */
  textSubtle: string;
  /** Text drawn on top of the accent. */
  textOnAccent: string;

  /** Primary actions, links, selected states. Used sparingly. */
  accent: string;
  accentPressed: string;
  accentMuted: string;
  accentBorder: string;

  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerPressed: string;
  dangerMuted: string;

  /** Behind a modal or bottom sheet. */
  scrim: string;
  /** Skeletons while a list loads. */
  skeleton: string;
};

export const lightColors: ThemeColors = {
  background: grey[50],
  surface: grey[0],
  surfaceMuted: grey[25],
  border: grey[200],
  borderStrong: grey[300],

  text: grey[900],
  textMuted: grey[500],
  textSubtle: grey[400],
  textOnAccent: grey[0],

  accent: blue[600],
  accentPressed: blue[700],
  accentMuted: blue[50],
  accentBorder: blue[200],

  success: green[600],
  successMuted: green[100],
  warning: amber[600],
  warningMuted: amber[100],
  danger: red[600],
  dangerPressed: red[500],
  dangerMuted: red[100],

  scrim: 'rgba(12, 14, 18, 0.45)',
  skeleton: grey[100],
};

export const darkColors: ThemeColors = {
  // Near-black, the way the reference app does it, with cards lifted just far
  // enough above the page to read as separate surfaces.
  background: '#000000',
  surface: grey[950],
  surfaceMuted: grey[900],
  border: grey[800],
  borderStrong: grey[700],

  text: grey[25],
  textMuted: grey[400],
  textSubtle: grey[500],
  // On a light blue, dark text is what stays readable.
  textOnAccent: grey[950],

  accent: blue[300],
  accentPressed: blue[200],
  accentMuted: 'rgba(147, 180, 255, 0.14)',
  accentBorder: 'rgba(147, 180, 255, 0.32)',

  success: green[500],
  successMuted: 'rgba(24, 148, 90, 0.18)',
  warning: amber[500],
  warningMuted: 'rgba(185, 119, 6, 0.18)',
  danger: red[500],
  dangerPressed: red[600],
  dangerMuted: 'rgba(211, 48, 47, 0.18)',

  scrim: 'rgba(0, 0, 0, 0.6)',
  skeleton: grey[800],
};
