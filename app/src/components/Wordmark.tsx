import { Platform, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '../theme';
import { azure, azureOnDark, paper, petrol } from '../theme/palette';
import { Text } from './Text';

export type WordmarkProps = {
  /** The height of the mark. The word is set to match. */
  size?: number;
  /** Mark only, for places too tight for the word. */
  markOnly?: boolean;
  /** Forces the light-on-dark pair, for use on a petrol surface. */
  reversed?: boolean;
};

/** The mark's box. The letter is drawn pre-skewed, so nothing transforms it. */
export const MARK_VIEW_BOX = '-6 -8 132 110';

/** Width is height times this. The mark is wider than it is tall. */
export const MARK_ASPECT = 1.2;

/**
 * Three motion wedges, longest at the top, reading left into the letter. Their
 * uneven lengths come from the letterform, so they are never evened up and a
 * fourth is never added.
 */
export const MARK_WEDGES = [
  'M10.0 36 H51.3 L43.1 50 H7.8 Z',
  'M6.5 58 H53.4 L43.9 74 H4.0 Z',
  'M3.1 80 H25.4 L18.3 92 H1.2 Z',
] as const;

/** The leaning A, already carrying its nine degrees. Needs `evenodd` to hollow the counter. */
export const MARK_LETTER =
  'M74.05 6 L92.05 6 L116.11 94 L93.11 94 L88.28 74 ' +
  'L56.28 74 L45.11 94 L22.11 94 Z ' +
  'M79.25 30 L65.81 58 L83.81 58 Z';

/**
 * How much of the mark survives at a given height.
 *
 * The handoff drops the top wedge between twenty and thirty-one, on the
 * reasoning that the wedges muddy as the mark shrinks. At the twenty the
 * headers use they do not — on a phone that is sixty physical pixels — and
 * what the two-wedge variant actually does is leave the letter leaning over a
 * gap, so it reads as a mark with a piece missing rather than a smaller one.
 * All three stay down to twenty; below that the letter stands alone.
 */
export function wedgesFor(size: number): readonly string[] {
  return size >= 20 ? MARK_WEDGES : [];
}

/**
 * The Autevo mark: a leaning A with three motion wedges running into it.
 *
 * The word beside it is real text rather than an outline, so it stays sharp at
 * every density and follows the same face as the rest of the app.
 */
export function Wordmark({ size = 24, markOnly = false, reversed = false }: WordmarkProps) {
  const theme = useTheme();

  const onDark = reversed || theme.isDark;
  const letter = onDark ? paper : petrol[800];
  const wedge = onDark ? azureOnDark : azure[600];

  return (
    <View style={[styles.lockup, { gap: size * 0.35 }]}>
      <Svg width={size * MARK_ASPECT} height={size} viewBox={MARK_VIEW_BOX}>
        <G fill={wedge}>
          {wedgesFor(size).map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>

        <Path d={MARK_LETTER} fill={letter} fillRule="evenodd" />
      </Svg>

      {markOnly ? null : (
        <Text
          style={[
            theme.typography.wordmark,
            {
              fontSize: size * 0.73,
              lineHeight: size * 0.9,
              color: letter,
              // The tracking is part of the logotype, not a style choice.
              letterSpacing: size * 0.11,
              ...Platform.select({ web: { paddingRight: size * 0.11 }, default: {} }),
            },
          ]}
        >
          AUTEVO
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
