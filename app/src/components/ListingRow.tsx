import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type ListingRowData = {
  id: string;
  title: string;
  variant?: string | null;
  priceEur: string;
  priceNote?: string;
  /** The line of facts under the title, already joined and translated. */
  facts: string;
  sellerName: string;
  sellerKind: string;
  location: string;
  photoUrl?: string;
  featured?: boolean;
  featuredLabel?: string;
  negotiable?: boolean;
  negotiableLabel?: string;
  favorited?: boolean;
};

export type ListingRowProps = {
  listing: ListingRowData;
  contactLabel: string;
  parkLabel: string;
  onPress?: () => void;
  onContact?: () => void;
  onPark?: () => void;
};

/**
 * A car in the results list.
 *
 * Wider and denser than the grid card: photograph on the left, everything
 * known about the car on the right, and the two actions a buyer actually takes
 * along the bottom, so contacting a seller never needs the detail screen.
 */
export function ListingRow({
  listing,
  contactLabel,
  parkLabel,
  onPress,
  onContact,
  onPark,
}: ListingRowProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        testID={`row-${listing.id}`}
        onPress={onPress}
        style={({ pressed }) => [{ padding: theme.spacing.lg }, pressed && { opacity: 0.8 }]}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View
            style={{
              width: 116,
              height: 88,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.skeleton,
              overflow: 'hidden',
            }}
          >
            {listing.photoUrl ? (
              <Image
                source={{ uri: listing.photoUrl }}
                style={{ width: 116, height: 88 }}
                contentFit="cover"
                transition={150}
              />
            ) : null}

            {listing.featured && listing.featuredLabel ? (
              <View style={styles.ribbonClip} pointerEvents="none">
                <View style={[styles.ribbon, { backgroundColor: theme.colors.accent }]}>
                  <Text variant="caption" tone="onAccent" style={styles.ribbonLabel}>
                    {listing.featuredLabel}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {listing.title}
            </Text>
            {listing.variant ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {listing.variant}
              </Text>
            ) : null}

            <Text variant="priceSmall" style={{ marginTop: theme.spacing.xs }}>
              {listing.priceEur}
            </Text>
            {listing.priceNote ? (
              <Text variant="caption" tone="muted">
                {listing.priceNote}
              </Text>
            ) : null}
            {listing.negotiable && listing.negotiableLabel ? (
              <Text variant="caption" tone="muted">
                {listing.negotiableLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.md }}>
          {listing.facts}
        </Text>

        <View style={[styles.seller, { marginTop: theme.spacing.sm, gap: theme.spacing.xs }]}>
          <Text variant="meta" numberOfLines={1} style={{ flexShrink: 1 }}>
            {listing.sellerName}
          </Text>
          <Text variant="meta" tone="muted">
            ·
          </Text>
          <Text variant="meta" tone="muted" numberOfLines={1}>
            {listing.sellerKind}
          </Text>
        </View>

        <View style={[styles.seller, { gap: theme.spacing.xxs }]}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
          <Text variant="meta" tone="muted" numberOfLines={1}>
            {listing.location}
          </Text>
        </View>
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.lg,
        }}
      >
        <Button
          label={contactLabel}
          variant="outline"
          size="md"
          icon="call-outline"
          style={{ flex: 1 }}
          onPress={onContact}
        />
        <Button
          label={parkLabel}
          variant={listing.favorited ? 'primary' : 'outline'}
          size="md"
          icon={listing.favorited ? 'heart' : 'heart-outline'}
          style={{ flex: 1 }}
          onPress={onPark}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbonClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 70,
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    top: 12,
    left: -22,
    width: 90,
    alignItems: 'center',
    paddingVertical: 2,
    transform: [{ rotate: '-45deg' }],
  },
  ribbonLabel: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  seller: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
