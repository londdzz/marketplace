import { Ionicons } from '@expo/vector-icons';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type OptionRowProps = {
  label: string;
  /** A second, quieter line: a body type under a model, a country under a city. */
  caption?: string | null;
  selected?: boolean;
  /** Draws a chevron instead of a tick, for a row that opens another screen. */
  chevron?: boolean;
  /** An icon before the label, for the rows that read better with one. */
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One choice in a list of choices.
 *
 * The sell flow asks one thing per screen, and most of those things are a
 * choice from a list, so this row is what most of the flow is made of. A tick
 * on the right marks what is already chosen; a chevron marks a row that leads
 * somewhere else.
 */
export function OptionRow({
  label,
  caption,
  selected = false,
  chevron = false,
  icon,
  onPress,
  style,
  testID,
}: OptionRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: StyleSheet.hairlineWidth * 2,
          gap: theme.spacing.md,
          backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={selected ? theme.colors.accent : theme.colors.textMuted}
        />
      ) : null}

      <View style={styles.label}>
        <Text variant="bodyStrong" tone={selected ? 'accent' : 'default'} numberOfLines={1}>
          {label}
        </Text>
        {caption ? (
          <Text variant="meta" tone="muted" numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>

      {chevron ? (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      ) : selected ? (
        <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
      ) : (
        <View style={[styles.empty, { borderColor: theme.colors.borderStrong }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
  empty: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
