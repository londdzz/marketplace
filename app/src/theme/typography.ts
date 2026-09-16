import { Platform, type TextStyle } from 'react-native';

/**
 * The type scale.
 *
 * `price` is the largest thing on a listing card, larger than the title, which
 * is the single strongest signal in a used-car marketplace: people scan by
 * price first and read the car second.
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
  | 'caption';

export const typography: Record<TypographyKey, TextStyle> = {
  display: { fontFamily: fontFamilyMedium, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  price: { fontFamily: fontFamilyMedium, fontSize: 24, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  priceSmall: { fontFamily: fontFamilyMedium, fontSize: 18, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  title: { fontFamily: fontFamilyMedium, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  heading: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  body: { fontFamily, fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  label: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  /** Year, kilometres, fuel, gearbox, city. The grey line under a title. */
  meta: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontFamily, fontSize: 11, lineHeight: 15, fontWeight: '400' },
};
