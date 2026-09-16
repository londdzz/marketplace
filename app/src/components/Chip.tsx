import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  /** Smaller, for the two-column grid where a card is half a screen wide. */
  size?: 'sm' | 'md';
  /** A filter chip that can be turned on, as opposed to a plain fact. */
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A small rounded rectangle holding one fact about a car: the year, the fuel,
 * the gearbox. A row of these is how the reference app lists specifications,
 * and it reads far better on a narrow screen than one long run-on line.
 *
 * With onPress it doubles as a filter chip, which is what the search screen
 * uses above the results.
 */
export function Chip({ label, size = 'md', selected = false, onPress, style, testID }: ChipProps) {
  const theme = useTheme();

  const body = (
    <Text
      variant={size === 'sm' ? 'caption' : 'meta'}
      style={{ color: selected ? theme.colors.textOnAccent : theme.colors.text }}
      numberOfLines={1}
    >
      {label}
    </Text>
  );

  const surface: ViewStyle = {
    backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceMuted,
    borderColor: selected ? theme.colors.accent : theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: size === 'sm' ? theme.spacing.xs : theme.spacing.sm,
    paddingVertical: size === 'sm' ? theme.spacing.xxs : theme.spacing.xs,
  };

  if (!onPress) {
    return (
      <View testID={testID} style={[styles.base, surface, style]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.base, surface, pressed && { opacity: 0.7 }, style]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
