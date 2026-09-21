import type { TextStyle } from 'react-native';

/**
 * The type scale, set in Onest.
 *
 * 12 · 13 · 15 · 17 · 22, body at 15/1.47. It was drawn for Sora, which runs
 * large for its point size, so the scale sits a notch under what the same
 * design would use in a system face. Onest is within a couple of percent of
 * Sora on both the measurements that decide apparent size — x-height 527
 * against 534, cap height 707 against 730 — so the scale carried over
 * unchanged rather than being redrawn around a new face.
 *
 * Onest replaced Sora because **Sora contains no Cyrillic at all**, and
 * Macedonian is the launch language: every screen in it was falling back to
 * the phone's own face, and any Latin beside it — a make, a price — stayed in
 * Sora, so one line could be set in two typefaces. See `fonts.ts`.
 *
 * Prices carry tabular figures so a column of them lines up, which is most of
 * what a results list is. The weights are the three the brand uses: 400 body,
 * 500 labels, 600 headings.
 *
 * The family names are the ones `useAppFonts` loads. If the fonts have not
 * loaded yet nothing renders at all, so no fallback stack is needed here.
 */
const regular = 'Onest_400Regular';
const medium = 'Onest_500Medium';
const semibold = 'Onest_600SemiBold';

/**
 * The wordmark alone stays in Sora. It is always the Latin word AUTEVO, so the
 * missing Cyrillic cannot bite it, and it is the one piece of type that is the
 * brand rather than the interface.
 */
const brand = 'Sora_600SemiBold';

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
  display: { fontFamily: semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  price: { fontFamily: semibold, fontSize: 22, lineHeight: 27, letterSpacing: -0.3, ...tabular },
  priceSmall: { fontFamily: semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, ...tabular },
  title: { fontFamily: semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  heading: { fontFamily: semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: medium, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: medium, fontSize: 13, lineHeight: 18 },
  /** Year, kilometres, fuel, gearbox, city. The quiet line under a title. */
  meta: { fontFamily: regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: regular, fontSize: 12, lineHeight: 16 },
  /** Small capitals above a section. Quiet, and never more than two words. */
  overline: { fontFamily: medium, fontSize: 11, lineHeight: 15, letterSpacing: 0.8 },
  /** The logotype: uppercase, wide, and only ever next to the mark. */
  wordmark: { fontFamily: brand, fontSize: 17, lineHeight: 21, letterSpacing: 2.5 },
};
