import type { TextStyle } from 'react-native';

/**
 * The type scale, set in Sora.
 *
 * 12 · 14 · 16 · 20 · 26 · 34 · 44, body at 16/1.55. Prices carry tabular
 * figures so a column of them lines up, which is most of what a results list
 * is. The weights are the three the brand uses: 400 body, 500 labels, 600
 * headings and the wordmark.
 *
 * The family names are the ones `useAppFonts` loads. If the fonts have not
 * loaded yet nothing renders at all, so no fallback stack is needed here.
 */
const regular = 'Sora_400Regular';
const medium = 'Sora_500Medium';
const semibold = 'Sora_600SemiBold';

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
  | 'overline'
  | 'wordmark';

/** Figures that line up in a column, which every price should. */
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const typography: Record<TypographyKey, TextStyle> = {
  display: { fontFamily: semibold, fontSize: 26, lineHeight: 33, letterSpacing: -0.3 },
  price: { fontFamily: semibold, fontSize: 26, lineHeight: 31, letterSpacing: -0.3, ...tabular },
  priceSmall: { fontFamily: semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.2, ...tabular },
  title: { fontFamily: semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  heading: { fontFamily: semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: regular, fontSize: 16, lineHeight: 25 },
  bodyStrong: { fontFamily: medium, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: medium, fontSize: 14, lineHeight: 19 },
  /** Year, kilometres, fuel, gearbox, city. The quiet line under a title. */
  meta: { fontFamily: regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: regular, fontSize: 12, lineHeight: 17 },
  /** Small capitals above a section. Quiet, and never more than two words. */
  overline: { fontFamily: medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
  /** The logotype: uppercase, wide, and only ever next to the mark. */
  wordmark: { fontFamily: semibold, fontSize: 20, lineHeight: 24, letterSpacing: 3 },
};
