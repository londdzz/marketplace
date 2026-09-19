import { amber, azure, azureOnDark, green, neutral, paper, petrol, red } from './palette';

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
  /** Hairlines and card outlines. Cards are flat, so this does the work. */
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

  /** Primary actions, links, selected states. If it is azure, it is tappable. */
  accent: string;
  accentPressed: string;
  /** The tint behind a selected row or a soft accent button. */
  accentMuted: string;
  accentBorder: string;
  /** Accent text on an accent-muted surface, kept legible in both schemes. */
  accentText: string;
  /** The focus ring, two pixels with two of offset. */
  focus: string;

  /** Trust signals only — never an action. */
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerPressed: string;
  dangerMuted: string;

  /** The wide promotional card under the search bar: petrol, never azure. */
  banner: string;
  bannerText: string;

  /** Behind a modal or bottom sheet. */
  scrim: string;
  /** Skeletons while a list loads, and the grey behind a photo. */
  skeleton: string;
};

export const lightColors: ThemeColors = {
  background: neutral[25],
  surface: neutral[0],
  surfaceMuted: neutral[50],
  surfaceRaised: neutral[0],
  border: neutral[200],
  borderStrong: neutral[300],

  text: neutral.ink,
  textMuted: neutral[500],
  textSubtle: neutral[400],
  textOnAccent: neutral[0],

  accent: azure[600],
  accentPressed: azure[700],
  accentMuted: 'rgba(30, 111, 217, 0.10)',
  accentBorder: 'rgba(30, 111, 217, 0.32)',
  accentText: azure[600],
  focus: azure[500],

  success: green.light,
  successMuted: green.tintLight,
  warning: amber.light,
  warningMuted: amber.tintLight,
  danger: red.light,
  dangerPressed: '#A72C25',
  dangerMuted: red.tintLight,

  banner: petrol[800],
  bannerText: paper,

  scrim: 'rgba(10, 22, 20, 0.45)',
  skeleton: neutral[50],
};

export const darkColors: ThemeColors = {
  background: neutral[950],
  surface: neutral[900],
  surfaceMuted: neutral[800],
  surfaceRaised: petrol[700],
  border: neutral[700],
  borderStrong: '#2F4F47',

  text: neutral.inkLight,
  textMuted: neutral[400],
  textSubtle: '#6F8380',
  // On a light azure, a near-black petrol is what stays readable.
  textOnAccent: '#08131B',

  accent: azureOnDark,
  accentPressed: azure[400],
  accentMuted: 'rgba(77, 148, 240, 0.16)',
  accentBorder: 'rgba(77, 148, 240, 0.36)',
  accentText: azure[400],
  focus: azure[400],

  success: green.dark,
  successMuted: green.tintDark,
  warning: amber.dark,
  warningMuted: amber.tintDark,
  danger: red.dark,
  dangerPressed: red.light,
  dangerMuted: red.tintDark,

  // A step lighter than the surfaces rather than deeper: at this end of the
  // scale, deeper disappears into the page.
  banner: petrol[700],
  bannerText: paper,

  scrim: 'rgba(0, 0, 0, 0.62)',
  skeleton: neutral[800],
};
