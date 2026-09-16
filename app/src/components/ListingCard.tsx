import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Chip } from './Chip';
import { Text } from './Text';

export type ListingCardData = {
  id: string;
  title: string;
  priceEur: string;
  /** The second price line: the local currency, or a net and VAT note. */
  priceNote?: string;
  specs: string[];
  location: string;
  crossBorder?: boolean;
  /** The wording on the cross-border marker, already translated. */
  crossBorderLabel?: string;
  featured?: boolean;
  /** The wording on the offer flash, already translated. */
  featuredLabel?: string;
  favorited?: boolean;
};

export type ListingCardProps = {
  listing: ListingCardData;
  /**
   * Half a screen wide, for the two-column grid. Everything shrinks to suit:
   * smaller type, smaller chips, and only the specifications that earn their
   * place at that width.
   */
  compact?: boolean;
  /** Set by the grid so two cards and the gap between them fill the row exactly. */
  width?: number;
  onPress?: () => void;
  onToggleFavorite?: () => void;
};

/** How many chips fit before a card starts to look crowded. */
const COMPACT_SPECS = 3;

const PHOTO_RATIO = 0.68;

export function ListingCard({
  listing,
  compact = false,
  width,
  onPress,
  onToggleFavorite,
}: ListingCardProps) {
  const theme = useTheme();

  const photoWidth = width ?? 170;
  const photoHeight = Math.round(photoWidth * PHOTO_RATIO);
  const specs = compact ? listing.specs.slice(0, COMPACT_SPECS) : listing.specs;
  const favoriteSize = compact ? 32 : 38;

  return (
    <View style={width ? { width } : undefined}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        testID={`listing-${listing.id}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View
          style={[
            {
              width: photoWidth,
              height: photoHeight,
              backgroundColor: theme.colors.skeleton,
              borderRadius: theme.radius.md,
              overflow: 'hidden',
            },
          ]}
        >
          {listing.featured && listing.featuredLabel ? (
            <View
              style={[
                styles.offer,
                { backgroundColor: theme.colors.accent, borderBottomRightRadius: theme.radius.sm },
              ]}
            >
              <Text variant="caption" tone="onAccent" style={styles.offerLabel}>
                {listing.featuredLabel}
              </Text>
            </View>
          ) : null}

          {listing.crossBorder && listing.crossBorderLabel ? (
            <View
              style={[
                styles.crossBorder,
                {
                  backgroundColor: theme.colors.scrim,
                  borderRadius: theme.radius.sm,
                  bottom: theme.spacing.xs,
                  left: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.xs,
                  paddingVertical: 1,
                },
              ]}
            >
              <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 10 }}>
                {listing.crossBorderLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          variant={compact ? 'label' : 'bodyStrong'}
          numberOfLines={compact ? 2 : 1}
          style={{ marginTop: theme.spacing.sm }}
        >
          {listing.title}
        </Text>

        <Text variant={compact ? 'priceSmall' : 'price'} style={{ marginTop: theme.spacing.xxs }}>
          {listing.priceEur}
        </Text>

        {listing.priceNote ? (
          <Text variant={compact ? 'caption' : 'meta'} tone="muted">
            {listing.priceNote}
          </Text>
        ) : null}

        <View style={[styles.specs, { gap: theme.spacing.xxs, marginTop: theme.spacing.sm }]}>
          {specs.map((spec) => (
            <Chip key={spec} label={spec} size={compact ? 'sm' : 'md'} />
          ))}
        </View>

        <View style={[styles.location, { marginTop: theme.spacing.sm, gap: theme.spacing.xxs }]}>
          <Ionicons
            name="location-outline"
            size={compact ? 12 : 15}
            color={theme.colors.textMuted}
          />
          <Text
            variant={compact ? 'caption' : 'meta'}
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {listing.location}
          </Text>
        </View>

      </Pressable>

      {/* A sibling rather than a child: a button inside a button is invalid. */}
      <Pressable
        accessibilityRole="button"
        onPress={onToggleFavorite}
        testID={`favorite-${listing.id}`}
        style={[
          styles.favorite,
          {
            width: favoriteSize,
            height: favoriteSize,
            top: theme.spacing.sm,
            left: photoWidth - favoriteSize - theme.spacing.sm,
            backgroundColor: listing.favorited ? theme.colors.success : theme.colors.surface,
          },
        ]}
      >
        <Ionicons
          name={listing.favorited ? 'heart' : 'heart-outline'}
          size={compact ? 17 : 20}
          color={listing.favorited ? '#FFFFFF' : theme.colors.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  offer: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  crossBorder: {
    position: 'absolute',
  },
  offerLabel: {
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  favorite: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
