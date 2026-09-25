import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '../theme';

export type CollectionArt = {
  /** The scene behind the car: where a car like this is actually used. */
  background: ImageSource | number;
  /** The car itself, cut out, straddling the foot of the photograph. */
  car: ImageSource | number;
  /**
   * The cut-out's height over its width. It travels with the art because a
   * low saloon drawn at an SUV's proportions is a squashed saloon.
   */
  carRatio: number;
};

export type CollectionCardProps = {
  title: string;
  /** How many live cars are in it. Measured by the API, never estimated. */
  count: string;
  /** What the collection filters on, at most four, two to a row. */
  chips: readonly string[];
  /** Commissioned art for this collection, when there is any. */
  art?: CollectionArt | null;
  /** Otherwise a car actually in the collection, photographed by its seller. */
  photoUrl?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  width: number;
  onPress: () => void;
  /**
   * Nothing in it yet. The card is still drawn — a rail that loses half its
   * cards as a catalogue empties reads as broken rather than as empty — but
   * it is dimmed and it does not take a touch, because a category promising
   * nothing is a tap that goes nowhere.
   */
  empty?: boolean;
  testID?: string;
};

/**
 * The card is the same height whether or not a car stands on it: without one
 * the photograph takes the space the car would have overlapped, so a rail of
 * them never comes out ragged.
 */
const PHOTO = 142;
const OVERLAP = 52;

/** How much of the card's width the cut-out car takes. */
const CAR_WIDTH = 0.7;

/** Above the foot of the photograph rather than below it, as in the reference. */
const CAR_ABOVE = 0.55;

/** One row of chips, which every card keeps room for. */
const CHIP_ROW = 24;

export function CollectionCard({
  title,
  count,
  chips,
  art,
  photoUrl,
  icon,
  width,
  onPress,
  empty = false,
  testID,
}: CollectionCardProps) {
  const theme = useTheme();

  const photoHeight = art ? PHOTO : PHOTO + OVERLAP;
  const carWidth = Math.round(width * CAR_WIDTH);
  const carHeight = Math.round(carWidth * (art?.carRatio ?? 1));

  return (
    <Pressable
      accessibilityRole="button"
      // Both, deliberately. `disabled` is what stops the touch and what tells
      // a screen reader the card is not available; `accessibilityState` is
      // what VoiceOver and TalkBack actually read out.
      disabled={empty}
      accessibilityState={{ disabled: empty }}
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
        // Far enough down to read as unavailable at a glance, not so far that
        // the name stops being legible — this is still how somebody learns
        // the category exists and will have cars in it later.
        empty && styles.empty,
      ]}
    >
      <View style={{ height: photoHeight }}>
        {art ? (
          <Image
            source={art.background}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="top"
          />
        ) : photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={160}
          />
        ) : (
          <View style={[styles.blank, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Ionicons name={icon} size={30} color={theme.colors.textSubtle} />
          </View>
        )}

        {/* The number the card promises, over the picture so the words below
            are only the name and what it filters on. */}
        <View
          style={[
            styles.count,
            {
              margin: theme.spacing.sm,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: 3,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.scrim,
            },
          ]}
        >
          <Text variant="caption" style={{ color: theme.colors.bannerText }}>
            {count}
          </Text>
        </View>
      </View>

      {/* Standing on the join, half in the scene and half on the card. */}
      {art ? (
        <Image
          source={art.car}
          style={{
            position: 'absolute',
            top: PHOTO - Math.round(carHeight * CAR_ABOVE),
            left: Math.round((width - carWidth) / 2),
            width: carWidth,
            height: carHeight,
          }}
          contentFit="contain"
        />
      ) : null}

      <View
        style={{
          paddingTop: art ? OVERLAP + theme.spacing.xs : theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          gap: theme.spacing.sm,
        }}
      >
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>

        {/* Held open even when empty, so a collection whose only filter is
            its own name does not make a shorter card than its neighbours. */}
        <View style={[styles.chips, { gap: theme.spacing.xs, minHeight: CHIP_ROW }]}>
          {chips.map((chip) => (
            <View
              key={chip}
              style={{
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 4,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.surfaceMuted,
              }}
            >
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {chip}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  blank: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    opacity: 0.38,
  },
  count: {
    alignSelf: 'flex-start',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
