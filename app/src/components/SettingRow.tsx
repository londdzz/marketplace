import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type SettingRowProps = {
  label: string;
  /** What the setting currently says, on the right of the row. */
  value?: string | null;
  /** One quiet line under the label, when the label alone is not enough. */
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Tints the icon and the label, for anything that takes something away. */
  destructive?: boolean;
  /** Drawn instead of the chevron: a switch, a badge, a small button. */
  accessory?: ReactNode;
  /** Off for a row that only reports something. */
  chevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One line of a settings list: an icon, what it is, what it says, and a way in.
 *
 * Rows live inside a ListGroup, so a section reads as one card with dividers
 * rather than a stack of boxes.
 */
export function SettingRow({
  label,
  value,
  hint,
  icon,
  destructive = false,
  accessory,
  chevron = true,
  onPress,
  style,
  testID,
}: SettingRowProps) {
  const theme = useTheme();
  const tint = destructive ? theme.colors.danger : theme.colors.accent;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.md,
          backgroundColor: pressed && onPress ? theme.colors.surfaceMuted : 'transparent',
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.icon,
            {
              borderRadius: theme.radius.sm,
              backgroundColor: destructive ? theme.colors.dangerMuted : theme.colors.accentMuted,
            },
          ]}
        >
          <Ionicons name={icon} size={17} color={tint} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text variant="body" style={destructive ? { color: theme.colors.danger } : undefined}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="muted" style={{ marginTop: 1 }}>
            {hint}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="meta" tone="muted" numberOfLines={1} style={{ maxWidth: 150 }}>
          {value}
        </Text>
      ) : null}

      {accessory}

      {chevron && onPress && !accessory ? (
        <Ionicons name="chevron-forward" size={17} color={theme.colors.textSubtle} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
  },
  icon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
