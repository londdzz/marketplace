import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '../theme';

export type CollectionCardProps = {
  title: string;
  /** How many live cars are in it. Measured by the API, never estimated. */
  count: string;
  /** What the collection filters on, as one quiet line a buyer can read. */
  detail: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  width: number;
  onPress: () => void;
  testID?: string;
};

/**
 * Every card the same height, so a row of them never comes out ragged: the
 * mark, the name, the count, and one line saying what is actually in it.
 */
const MIN_HEIGHT = 138;

/**
 * One of the ways in that is not a search box: a saved search nobody had to
 * save.
 *
 * The line under the name is the collection's own filters, written out, so
 * nobody has to open it to find out what "a family car" means here. It is one
 * line rather than a row of chips, because chips wrap and leave every card a
 * different height. The count is the other half: a category that says how many
 * cars are behind it is one a buyer can judge before tapping.
 */
export function CollectionCard({
  title,
  count,
  detail,
  icon,
  width,
  onPress,
  testID,
}: CollectionCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          minHeight: MIN_HEIGHT,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
        },
      ]}
    >
      <View
        style={[
          styles.badge,
          { borderRadius: theme.radius.md, backgroundColor: theme.colors.accentMuted },
        ]}
      >
        <Ionicons name={icon} size={17} color={theme.colors.accent} />
      </View>

      <View style={{ gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {count}
        </Text>
      </View>

      {detail ? (
        <Text variant="caption" tone="subtle" numberOfLines={2} style={{ marginTop: 'auto' }}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
  },
  badge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
