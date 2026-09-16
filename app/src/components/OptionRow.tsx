import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
  /** Drops the card treatment, for a row inside a ListGroup. */
  flat?: boolean;
  /** A maker's mark before the label, tinted to the text colour. */
  logoUrl?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One choice in a list of choices.
 *
 * An unselected row carries no empty circle waiting to be filled: forty of them
 * down a screen is forty pieces of furniture saying nothing. Selection shows
 * itself by tinting the row and ticking it, which is visible at a glance and
 * silent until it happens.
 */
export function OptionRow({
  label,
  caption,
  selected = false,
  chevron = false,
  icon,
  flat = false,
  logoUrl,
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
          paddingVertical: flat ? theme.spacing.sm : theme.spacing.md,
          minHeight: flat ? 50 : 56,
          borderRadius: flat ? 0 : theme.radius.md,
          gap: theme.spacing.md,
          backgroundColor: selected
            ? theme.colors.accentMuted
            : pressed
              ? theme.colors.surfaceMuted
              : theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          borderWidth: flat ? 0 : selected ? 1.5 : 1,
        },
        style,
      ]}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: 22, height: 22 }}
          contentFit="contain"
          tintColor={selected ? theme.colors.accent : theme.colors.text}
          transition={120}
        />
      ) : null}

      {icon ? (
        <View
          style={[
            styles.icon,
            {
              borderRadius: theme.radius.sm,
              backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceMuted,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={selected ? theme.colors.textOnAccent : theme.colors.textMuted}
          />
        </View>
      ) : null}

      <View style={styles.label}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {label}
        </Text>
        {caption ? (
          <Text variant="meta" tone="muted" numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>

      {chevron ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} />
      ) : selected ? (
        <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});
