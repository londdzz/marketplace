import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '../theme';

export type CollectionCardProps = {
  title: string;
  /** How many live cars are in it. Measured by the API, never estimated. */
  count: string;
  /** What the collection filters on, as one quiet line a buyer can read. */
  detail: string | null;
  /** A car actually in this collection, photographed by whoever is selling it. */
  photoUrl?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  width: number;
  onPress: () => void;
  testID?: string;
};

/** The photograph is a touch wider than it is tall, as a car is. */
const PHOTO_RATIO = 0.62;

/**
 * One of the ways in that is not a search box: a saved search nobody had to
 * save.
 *
 * The photograph is a car actually in the collection, taken by the person
 * selling it — not a studio render of a car nobody can buy. It changes as the
 * catalogue changes, and a collection whose cars were all listed without
 * pictures falls back to its mark rather than borrowing someone else's car.
 *
 * The line under the name is the collection's own filters, written out, so
 * nobody has to open it to find out what "a family car" means here. It is one
 * line rather than a row of chips, because chips wrap and leave every card a
 * different height.
 */
export function CollectionCard({
  title,
  count,
  detail,
  photoUrl,
  icon,
  width,
  onPress,
  testID,
}: CollectionCardProps) {
  const theme = useTheme();
  const photoHeight = Math.round(width * PHOTO_RATIO);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
        },
      ]}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: width - 2, height: photoHeight }}
          contentFit="cover"
          transition={160}
        />
      ) : (
        <View
          style={[
            styles.blank,
            { height: photoHeight, backgroundColor: theme.colors.surfaceMuted },
          ]}
        >
          <Ionicons name={icon} size={30} color={theme.colors.textSubtle} />
        </View>
      )}

      <View style={{ padding: theme.spacing.md, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {count}
        </Text>
        {detail ? (
          <Text variant="caption" tone="subtle" numberOfLines={1} style={{ marginTop: 2 }}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  blank: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
