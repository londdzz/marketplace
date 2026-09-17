import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '../theme';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  /** Removes the inner padding, for a card whose first child is a photo. */
  flush?: boolean;
  /** Lifts the card off the page. Used for one card, never for a list of them. */
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A white surface on the grey page. Outlined with a hairline rather than a drop
 * shadow: a list of shadowed cards turns into visual noise once a few dozen are
 * on screen.
 */
export function Card({ children, onPress, flush = false, raised = false, style, testID }: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: flush ? 0 : theme.spacing.lg,
    overflow: 'hidden',
  };

  if (!onPress) {
    return (
      <View testID={testID} style={[styles.base, base, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        base,
        pressed && { backgroundColor: theme.colors.surfaceMuted },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});
