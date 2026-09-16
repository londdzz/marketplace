import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Badge } from './Badge';
import { Card } from './Card';
import { Chip } from './Chip';
import { Text } from './Text';

export type ListingCardData = {
  id: string;
  title: string;
  priceEur: string;
  /** Already formatted, one per currency the buyer cares about. */
  priceLocal?: string;
  specs: string[];
  location: string;
  crossBorder?: boolean;
  featured?: boolean;
  favorited?: boolean;
};

export type ListingCardProps = {
  listing: ListingCardData;
  onPress?: () => void;
  onToggleFavorite?: () => void;
};

/**
 * One car in a list.
 *
 * Laid out the way the reference app does it: photo with the favourite on top,
 * then the title, then the price as the loudest line, then the specifications
 * as chips rather than one long run-on sentence, then the location.
 */
export function ListingCard({ listing, onPress, onToggleFavorite }: ListingCardProps) {
  const theme = useTheme();

  return (
    <Card flush onPress={onPress} testID={`listing-${listing.id}`}>
      <View style={[styles.photo, { backgroundColor: theme.colors.skeleton }]}>
        {listing.featured ? (
          <Badge
            label="Featured"
            tone="warning"
            style={[styles.badge, { top: theme.spacing.sm, left: theme.spacing.sm }]}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={onToggleFavorite}
          style={[
            styles.favorite,
            {
              top: theme.spacing.sm,
              right: theme.spacing.sm,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          <Ionicons
            name={listing.favorited ? 'heart' : 'heart-outline'}
            size={20}
            color={listing.favorited ? theme.colors.danger : theme.colors.textMuted}
          />
        </Pressable>
      </View>

      <View style={{ padding: theme.spacing.lg }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {listing.title}
        </Text>

        <Text variant="price" style={{ marginTop: theme.spacing.xxs }}>
          {listing.priceEur}
        </Text>

        {listing.priceLocal ? (
          <Text variant="meta" tone="muted">
            {listing.priceLocal}
          </Text>
        ) : null}

        <View style={[styles.specs, { gap: theme.spacing.xs, marginTop: theme.spacing.md }]}>
          {listing.specs.map((spec) => (
            <Chip key={spec} label={spec} />
          ))}
        </View>

        <View style={[styles.location, { marginTop: theme.spacing.md, gap: theme.spacing.xs }]}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
          <Text variant="meta" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {listing.location}
          </Text>
          {listing.crossBorder ? <Badge label="Cross-border" tone="accent" /> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  photo: {
    height: 200,
  },
  badge: {
    position: 'absolute',
  },
  favorite: {
    position: 'absolute',
    width: 36,
    height: 36,
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
