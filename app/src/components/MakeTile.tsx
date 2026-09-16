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
 * Draws the maker's mark when the API has one, and a monogram from the name
 * when it does not, so logos can be added a few at a time without the grid ever
 * showing a hole. The mark is tinted to the text colour so a single monochrome
 * file works in both light and dark.
 */
export function MakeTile({ name, logoUrl, selected = false, width, onPress, testID }: MakeTileProps) {
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
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: width * 0.52, height: width * 0.52 }}
          contentFit="contain"
          tintColor={selected ? theme.colors.accent : theme.colors.text}
          transition={120}
        />
      ) : (
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
      )}

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
