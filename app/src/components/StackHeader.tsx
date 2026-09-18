import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Wordmark } from './Wordmark';

export type StackHeaderProps = {
  /** Where back goes when this screen was opened directly, as a link can. */
  fallback: Href;
  /** Drawn at the right end: share, sort, a close button. */
  actions?: ReactNode;
  /**
   * Draws the mark without the word, for a bar whose middle is already
   * carrying something that cannot move.
   */
  markOnly?: boolean;
  backTestID?: string;
  backLabel?: string;
};

/**
 * The bar across the top of a screen inside the stack.
 *
 * The mark is positioned absolutely rather than laid out between the back
 * arrow and the actions, so it is in the same place on every screen no matter
 * how many controls sit on either side of it. Each screen's own title goes
 * below the bar, where it has the width to be read.
 */
export function StackHeader({
  fallback,
  actions,
  markOnly = false,
  backTestID = 'stack-back',
  backLabel,
}: StackHeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        styles.bar,
        { paddingHorizontal: theme.screenPadding, paddingVertical: theme.spacing.md },
      ]}
    >
      <View style={styles.side}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
          testID={backTestID}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>

        {markOnly ? (
          <View style={{ marginLeft: theme.spacing.sm }}>
            <Wordmark size={20} markOnly />
          </View>
        ) : null}
      </View>

      {markOnly ? null : (
        <View style={styles.centre} pointerEvents="none">
          <Wordmark size={20} />
        </View>
      )}

      <View style={[styles.side, styles.end, { gap: theme.spacing.md }]}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    // Both ends claim the same width, so nothing on one side can nudge the
    // mark off the middle.
    minWidth: 64,
  },
  end: {
    justifyContent: 'flex-end',
  },
  centre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
