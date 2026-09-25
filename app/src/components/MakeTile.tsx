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
 * **The mark is drawn in its own colours, on a light plate.** It used to be
 * tinted to the text colour, which is right for a single-ink glyph and wrong
 * for a real logo — a flattened BMW roundel is a filled circle and a flattened
 * Alfa badge is a blob. Real marks are built for paper, so they get paper:
 * every one of them is legible on white and almost none of them is legible on
 * this app's near-black ground.
 */
export function MakeTile({ name, logoUrl, selected = false, width, onPress, testID }: MakeTileProps) {
  const theme = useTheme();

  const monogram = name
    .split(/[\s-]/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const plate = Math.round(width * 0.46);

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
      {logoUrl ? (
        <View
          style={[
            styles.mark,
            {
              width: plate,
              height: plate,
              borderRadius: theme.radius.sm,
              // Paper, because that is what a manufacturer's mark is drawn
              // for. A hair off pure white so it is a surface on the page
              // rather than a hole cut in it.
              backgroundColor: theme.colors.plate,
              padding: Math.round(plate * 0.14),
            },
          ]}
        >
          <Image
            source={{ uri: logoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            transition={120}
          />
        </View>
      ) : (
        <View style={[styles.mark, { width: plate, height: plate }]}>
          <Text
            variant="title"
            style={{ color: selected ? theme.colors.accent : theme.colors.textMuted }}
          >
            {monogram}
          </Text>
        </View>
      )}

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
