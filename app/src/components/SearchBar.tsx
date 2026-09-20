import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type SearchBarProps = {
  /** Kept for the accessibility label; the field itself shows the hint. */
  title: string;
  hint: string;
  onPress?: () => void;
  /**
   * Draw no fill and no outline of its own, because something behind it is
   * providing both — the glass the floating variant sits on.
   */
  translucent?: boolean;
};

/**
 * The search entry at the top of the home screen.
 *
 * One line, the height of a text field, because that is what it stands in for.
 * Two stacked lines of type made it the tallest thing on the screen, which is
 * not what the screen is about.
 */
export function SearchBar({ title, hint, onPress, translucent = false }: SearchBarProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={title}
      onPress={onPress}
      testID="search-bar"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        height: 46,
        backgroundColor: translucent
          ? pressed
            ? theme.colors.glassEdge
            : 'transparent'
          : pressed
            ? theme.colors.borderStrong
            : theme.colors.surface,
        borderWidth: translucent ? 0 : 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing.lg,
      })}
    >
      <Ionicons name="search" size={18} color={theme.colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text variant="body" tone="muted" numberOfLines={1}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}
