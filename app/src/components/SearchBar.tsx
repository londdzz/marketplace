import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type SearchBarProps = {
  title: string;
  hint: string;
  onPress?: () => void;
};

/**
 * The tall rounded search entry at the top of the home screen. Two lines: what
 * it does, and what can be typed into it.
 */
export function SearchBar({ title, hint, onPress }: SearchBarProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="search"
      onPress={onPress}
      testID="search-bar"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.lg,
        backgroundColor: pressed ? theme.colors.border : theme.colors.surfaceMuted,
        borderRadius: theme.radius.lg,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
      })}
    >
      <Ionicons name="search" size={26} color={theme.colors.text} />
      <View style={{ flex: 1 }}>
        <Text variant="title">{title}</Text>
        <Text variant="body" tone="muted" style={{ marginTop: 1 }}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}
