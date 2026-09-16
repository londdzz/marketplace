import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../theme';

export type FabProps = {
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
};

/**
 * The floating button above the tab bar.
 *
 * The reference app puts its assistant here. We put the one action that earns
 * money: listing a car. It repeats the Sell tab on purpose, the way a compose
 * button repeats a menu item, because it is the action worth interrupting a
 * scroll for.
 */
export function Fab({ onPress, icon = 'add', accessibilityLabel }: FabProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID="fab"
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? theme.colors.accentPressed : theme.colors.accent,
          borderRadius: theme.radius.lg,
          right: theme.screenPadding,
        },
      ]}
    >
      <Ionicons name={icon} size={28} color={theme.colors.textOnAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    bottom: 16,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
