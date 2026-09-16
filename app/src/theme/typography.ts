import { Platform, type TextStyle } from 'react-native';

/**
 * The type scale.
 *
 * `price` is the largest thing on a listing card, larger than the title, which
 * is the single strongest signal in a used-car marketplace: people scan by
 * price first and read the car second.
 *
 * Every size above body carries negative tracking. At display sizes the default
 * spacing looks slack, and tightening it is most of the difference between type
 * that looks set and type that looks typed.
 */
const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
});

const fontFamilyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
});

export type TypographyKey =
  | 'display'
  | 'price'
  | 'priceSmall'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'meta'
  | 'caption'
  | 'overline';

export const typography: Record<TypographyKey, TextStyle> = {
  display: { fontFamily: fontFamilyMedium, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6 },
  price: { fontFamily: fontFamilyMedium, fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.5 },
  priceSmall: { fontFamily: fontFamilyMedium, fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontFamily: fontFamilyMedium, fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontFamily, fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 21, fontWeight: '600', letterSpacing: -0.1 },
  label: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  /** Year, kilometres, fuel, gearbox, city. The grey line under a title. */
  meta: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontFamily, fontSize: 11.5, lineHeight: 15, fontWeight: '400' },
  /** Small capitals above a section. Quiet, and never more than two words. */
  overline: { fontFamily: fontFamilyMedium, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.6 },
};
