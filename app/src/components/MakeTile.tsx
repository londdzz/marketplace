import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type MakeTileProps = {
  name: string;
  /** The maker's mark, served by the API. A monogram stands in until there is one. */
  logoUrl?: string | null;
  selected?: boolean;
  width: number;
  onPress?: () => void;
  testID?: string;
};

/**
 * One make in the picker grid.
 *
 * Draws the maker's mark when the API has one, and a monogram when it does
 * not, so marks can be added a few at a time without the grid ever showing a
 * hole. Twenty-four of the 167 makes have no mark we are allowed to serve, so
 * the monogram is a permanent part of this, not a stage it is passing through.
 *
 * **The mark sits straight on the tile, with nothing behind it and no tint.**
 * It is already drawn the way it needs to be: `fetch-make-logos.js` measures
 * every mark and redraws the ones that would be lost on this dark ground in
 * white, leaving the ones with light or colour of their own exactly as their
 * owner drew them. A plate here would have been a white card on a dark page,
 * and one tint for all of them turns Ford into a white blob.
 */
export function MakeTile({ name, logoUrl, selected = false, width, onPress, testID }: MakeTileProps) {
  const theme = useTheme();

  const monogram = name
    .split(/[\s-]/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const mark = Math.round(width * 0.42);

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
          height: Math.round(width * 0.88),
          paddingHorizontal: 4,
          borderRadius: theme.radius.md,
          // A filled tile rather than an outlined one: the grid sits on a
          // surface of its own, where a border only draws a box around a box.
          backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surfaceMuted,
          borderColor: selected ? theme.colors.accent : 'transparent',
          borderWidth: 1,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.mark, { width: mark, height: mark }]}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            transition={120}
          />
        ) : (
          <Text
            variant="title"
            style={{ color: selected ? theme.colors.accent : theme.colors.textMuted }}
          >
            {monogram}
          </Text>
        )}
      </View>

      <Text
        variant="caption"
        numberOfLines={1}
        style={{
          marginTop: 6,
          maxWidth: width - 10,
          textAlign: 'center',
          color: selected ? theme.colors.accentText : theme.colors.text,
        }}
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
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
