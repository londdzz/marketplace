import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../theme';
import { azure, paper, petrol } from '../theme/palette';
import { Text } from './Text';

export type WordmarkProps = {
  /** The height of the mark. The word is set to match. */
  size?: number;
  /** Mark only, for places too tight for the word. */
  markOnly?: boolean;
  /** Forces the light-on-dark pair, for use on a petrol surface. */
  reversed?: boolean;
};

/**
 * The Autevo mark: two mirrored chevrons woven into an A and a V, because a
 * marketplace is two sides facing each other.
 *
 * Below twenty pixels the weave muddies, so the azure stroke is dropped and the
 * mark is drawn in one colour.
 */
export function Wordmark({ size = 24, markOnly = false, reversed = false }: WordmarkProps) {
  const theme = useTheme();
  const small = size < 20;

  const onDark = reversed || theme.isDark;
  const up = onDark ? paper : petrol[800];
  const down = onDark ? '#4D94F0' : azure[600];

  return (
    <View style={[styles.lockup, { gap: size * 0.4 }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {!small ? (
          <Path d="M14 36 L50 92 L86 36" fill="none" stroke={down} strokeWidth={15} />
        ) : null}
        <Path d="M14 64 L50 8 L86 64" fill="none" stroke={up} strokeWidth={15} />
      </Svg>

      {markOnly ? null : (
        <Text
          style={[
            theme.typography.wordmark,
            {
              fontSize: size * 0.72,
              lineHeight: size * 0.88,
              color: onDark ? paper : theme.colors.text,
              // The tracking is part of the logotype, not a style choice.
              letterSpacing: size * 0.12,
              ...Platform.select({ web: { paddingRight: size * 0.12 }, default: {} }),
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
