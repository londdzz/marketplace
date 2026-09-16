import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type MakeTileProps = {
  name: string;
  selected?: boolean;
  width: number;
  onPress?: () => void;
  testID?: string;
};

/**
 * One make in the picker grid.
 *
 * The reference app shows manufacturer logos here. Those are trademarks we have
 * no licence to ship, so this draws a monogram from the make's own name
 * instead. Swapping in licensed artwork later means changing only this file.
 */
export function MakeTile({ name, selected = false, width, onPress, testID }: MakeTileProps) {
  const theme = useTheme();

  const monogram = name
    .split(/[\s-]/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          width,
          height: width,
          borderRadius: theme.radius.md,
          backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surfaceMuted,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.monogram,
          { borderColor: selected ? theme.colors.accent : theme.colors.textMuted },
        ]}
      >
        <Text
          variant="bodyStrong"
          style={{ color: selected ? theme.colors.accent : theme.colors.text }}
        >
          {monogram}
        </Text>
      </View>

      <Text
        variant="caption"
        tone={selected ? 'accent' : 'muted'}
        numberOfLines={1}
        style={{ marginTop: 6, maxWidth: width - 8, textAlign: 'center' }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  monogram: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
