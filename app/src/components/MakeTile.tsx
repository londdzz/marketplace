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
 * Draws the maker's mark when the API has one, and a monogram on a tinted
 * square when it does not, so logos can be added a few at a time without the
 * grid ever showing a hole. The mark is tinted to the text colour so a single
 * monochrome file works in both light and dark.
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
          height: width,
          paddingHorizontal: 4,
          borderRadius: theme.radius.lg,
          backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          borderWidth: selected ? 1.5 : 1,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.mark, { width: mark, height: mark }]}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: mark, height: mark }}
            contentFit="contain"
            tintColor={selected ? theme.colors.accent : theme.colors.text}
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
          marginTop: 7,
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
