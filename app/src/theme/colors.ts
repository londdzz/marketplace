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
  /** A surface that needs to recede, such as an input or an unselected chip. */
  surfaceMuted: string;
  /** A surface that needs to come forward, such as a pressed row. */
  surfaceRaised: string;
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
  /** The tint behind a selected row or a soft accent button. */
  accentMuted: string;
  accentBorder: string;
  /** Accent text on an accent-muted surface, kept legible in both schemes. */
  accentText: string;

  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerPressed: string;
  dangerMuted: string;

  /** The wide promotional card under the search bar. */
  banner: string;
  bannerText: string;

  /** Behind a modal or bottom sheet. */
  scrim: string;
  /** Skeletons while a list loads. */
  skeleton: string;
};

export const lightColors: ThemeColors = {
  background: grey[50],
  surface: grey[0],
  surfaceMuted: grey[100],
  surfaceRaised: grey[0],
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
  accentText: blue[700],

  success: green[600],
  successMuted: green[50],
  warning: amber[600],
  warningMuted: amber[50],
  danger: red[500],
  dangerPressed: red[600],
  dangerMuted: red[50],

  banner: blue[700],
  bannerText: grey[0],

  scrim: 'rgba(11, 15, 21, 0.45)',
  skeleton: grey[150],
};

export const darkColors: ThemeColors = {
  // Not pure black. A very dark blue-grey keeps photographs from floating in a
  // void and gives the surfaces above it somewhere to sit.
  background: grey[950],
  surface: grey[900],
  surfaceMuted: grey[850],
  surfaceRaised: grey[800],
  border: '#242C36',
  borderStrong: '#323B47',

  text: grey[25],
  textMuted: grey[400],
  textSubtle: grey[500],
  // On a light blue, dark text is what stays readable.
  textOnAccent: grey[950],

  accent: blue[300],
  accentPressed: blue[200],
  accentMuted: 'rgba(143, 176, 255, 0.14)',
  accentBorder: 'rgba(143, 176, 255, 0.34)',
  accentText: blue[200],

  success: green[400],
  successMuted: 'rgba(63, 201, 140, 0.14)',
  warning: amber[400],
  warningMuted: 'rgba(242, 180, 87, 0.14)',
  danger: red[400],
  dangerPressed: red[500],
  dangerMuted: 'rgba(255, 107, 107, 0.14)',

  // A deep blue rather than the light accent: a full-width block of the accent
  // is glaring against a near-black page.
  banner: blue[900],
  bannerText: grey[0],

  scrim: 'rgba(0, 0, 0, 0.62)',
  skeleton: grey[850],
};
