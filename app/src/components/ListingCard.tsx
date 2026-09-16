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
  featured?: boolean;
  /** The wording on the offer flash, already translated. */
  featuredLabel?: string;
  favorited?: boolean;
};

export type ListingCardProps = {
  listing: ListingCardData;
  onPress?: () => void;
  onToggleFavorite?: () => void;
};

/**
 * One car in a list, laid out the way the reference app does it.
 *
 * The photo is a small thumbnail on the left rather than a full-width banner,
 * and the text sits directly on the page with no card outline around it. That
 * fits roughly twice as many cars on a screen, which is the whole job of a
 * results list.
 */
export function ListingCard({ listing, onPress, onToggleFavorite }: ListingCardProps) {
  const theme = useTheme();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        testID={`listing-${listing.id}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
      <View
        style={[
          styles.photo,
          { backgroundColor: theme.colors.skeleton, borderRadius: theme.radius.md },
        ]}
      >
        {listing.featured ? (
          <View
            style={[
              styles.offer,
              { backgroundColor: theme.colors.accent, borderBottomRightRadius: theme.radius.sm },
            ]}
          >
            <Text variant="caption" tone="onAccent" style={styles.offerLabel}>
              {listing.featuredLabel ?? ''}
            </Text>
          </View>
        ) : null}

      </View>

      <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: theme.spacing.md }}>
        {listing.title}
      </Text>

      <Text variant="price" style={{ marginTop: theme.spacing.xs }}>
        {listing.priceEur}
      </Text>

      {listing.priceNote ? (
        <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xxs }}>
          {listing.priceNote}
        </Text>
      ) : null}

      <View style={[styles.specs, { gap: theme.spacing.xs, marginTop: theme.spacing.md }]}>
        {listing.specs.map((spec) => (
          <Chip key={spec} label={spec} />
        ))}
      </View>

      <View style={[styles.location, { marginTop: theme.spacing.md, gap: theme.spacing.xs }]}>
        <Ionicons name="location-outline" size={15} color={theme.colors.textMuted} />
        <Text variant="meta" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {listing.location}
        </Text>
        {listing.crossBorder ? (
          <Chip label="↔" style={{ marginLeft: theme.spacing.xxs }} />
        ) : null}
      </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onToggleFavorite}
        testID={`favorite-${listing.id}`}
        style={[
          styles.favorite,
          {
            top: theme.spacing.sm,
            left: 170 - 38 - theme.spacing.sm,
            backgroundColor: listing.favorited ? theme.colors.success : theme.colors.surface,
          },
        ]}
      >
        <Ionicons
          name={listing.favorited ? 'heart' : 'heart-outline'}
          size={20}
          color={listing.favorited ? '#FFFFFF' : theme.colors.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: 170,
    height: 114,
    overflow: 'hidden',
  },
  offer: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offerLabel: {
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  favorite: {
    position: 'absolute',
    width: 38,
    height: 38,
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
