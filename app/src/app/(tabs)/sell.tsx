import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '../../api/client';
import { sellApi } from '../../api/sell';
import type { Listing } from '../../api/types';
import { Badge, Button, EmptyState, Screen, TabHeader, Text } from '../../components';
import { PromoteSheet } from '../../sell/PromoteSheet';
import { formatEur, formatKm, listingTitle } from '../../format';
import { CreditsSheet } from '../../sell/CreditsSheet';
import { useCredits } from '../../sell/credits';
import { useSell } from '../../sell/SellProvider';
import { missingForPublish, pathTo, screenForField } from '../../sell/steps';
import { useTheme } from '../../theme';

type StatusTone = 'accent' | 'success' | 'warning' | 'neutral';

/** What a listing needs before it can go live, mirrored from the API. */
const MIN_PHOTOS = 4;

const TONES: Record<string, StatusTone> = {
  active: 'success',
  draft: 'neutral',
  pending_payment: 'warning',
  expired: 'warning',
  sold: 'accent',
  removed: 'neutral',
};

/** Whole days left, rounded up, so the last day reads "1 day" not "0". */
function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) {
    return null;
  }

  const ms = new Date(expiresAt).getTime() - Date.now();

  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export default function MyListingsTab() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation(['sell', 'listing', 'common']);
  const { clear, resume } = useSell();

  const credits = useCredits();
  const balance = credits.data?.balance ?? 0;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<Listing | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const listings = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => sellApi.myListings(),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    void credits.refetch();
  };

  const renew = useMutation({
    mutationFn: (listing: Listing) => sellApi.renew(listing.id),
    onSuccess: () => {
      setFailure(null);
      refresh();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.needsCredits) {
        setSheetOpen(true);
      } else {
        setFailure(error instanceof Error ? error.message : String(error));
      }
    },
  });

  const markSold = useMutation({
    mutationFn: (listing: Listing) => sellApi.markSold(listing.id),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (listing: Listing) => sellApi.remove(listing.id),
    onSuccess: () => {
      setConfirming(null);
      refresh();
    },
  });

  const startNew = () => {
    clear();
    router.push('/sell/make');
  };

  /**
   * Pick the draft up where it was left, not at the beginning. The first thing
   * still missing is the screen that collects it; a draft with nothing missing
   * only needs publishing.
   */
  const continueDraft = (listing: Listing) => {
    resume(listing);

    const missing = missingForPublish(listing, MIN_PHOTOS);
    const screen = missing.length > 0 ? (screenForField(missing[0]) ?? 'make') : 'review';

    router.push(pathTo(screen));
  };

  const working = renew.isPending || markSold.isPending || remove.isPending;

  const row = (listing: Listing) => {
    const left = daysLeft(listing.expires_at);
    const isDraft = listing.status === 'draft' || listing.status === 'pending_payment';

    return (
      <View
        style={[
          styles.card,
          {
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            gap: theme.spacing.md,
          },
        ]}
        testID={`my-listing-${listing.id}`}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              isDraft
                ? continueDraft(listing)
                : router.push({ pathname: '/listing/[id]', params: { id: listing.id } })
            }
            style={{
              width: 104,
              height: 78,
              borderRadius: theme.radius.md,
              overflow: 'hidden',
              backgroundColor: theme.colors.surfaceMuted,
            }}
          >
            {listing.photos[0] ? (
              <Image
                source={{ uri: listing.photos[0].thumb_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={120}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.centre]}>
                <Ionicons name="image-outline" size={22} color={theme.colors.textSubtle} />
              </View>
            )}
          </Pressable>

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Badge
                label={t(`sell:status_${listing.status}`, listing.status)}
                tone={TONES[listing.status] ?? 'neutral'}
              />
              {listing.status === 'active' && left !== null ? (
                <Text variant="caption" tone={left <= 2 ? 'danger' : 'muted'}>
                  {left === 0 ? t('sell:expires_today') : t('sell:expires_in', { count: left })}
                </Text>
              ) : null}
            </View>

            {/* A running promotion is money the seller has already spent, so
                the card says how long it has left. */}
            {listing.is_featured && listing.featured_until ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}
              >
                <Ionicons name="rocket" size={12} color={theme.colors.accent} />
                <Text variant="caption" tone="accent">
                  {t('sell:promoted_until', {
                    date: new Date(listing.featured_until).toLocaleDateString(i18n.language, {
                      day: 'numeric',
                      month: 'long',
                    }),
                  })}
                </Text>
              </View>
            ) : null}

            <Text variant="bodyStrong" numberOfLines={1}>
              {listingTitle(listing) || t('sell:untitled_draft')}
            </Text>

            <Text variant="meta" tone="muted" numberOfLines={1}>
              {[
                listing.year ? String(listing.year) : null,
                listing.mileage_km !== null ? formatKm(listing.mileage_km) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>

            <Text variant="priceSmall">
              {listing.price_eur ? formatEur(listing.price_eur) : t('sell:no_price')}
            </Text>
          </View>
        </View>

        {listing.status !== 'sold' && listing.status !== 'removed' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              // Four actions do not fit one line on a narrow phone. Wrapping
              // lets them fall to a second rather than pushing the delete off
              // the card, which is what a fixed row and a collapsing spacer
              // did as soon as Promote joined them.
              flexWrap: 'wrap',
              gap: theme.spacing.sm,
              paddingTop: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            {isDraft ? (
              <Button
                label={t('sell:resume')}
                size="sm"
                onPress={() => continueDraft(listing)}
                testID={`resume-${listing.id}`}
              />
            ) : null}

            {listing.status === 'active' || listing.status === 'expired' ? (
              <Button
                label={renew.isPending ? t('sell:renewing') : t('sell:renew')}
                size="sm"
                variant={listing.status === 'expired' ? 'primary' : 'secondary'}
                disabled={working}
                onPress={() => renew.mutate(listing)}
                testID={`renew-${listing.id}`}
              />
            ) : null}

            {listing.status === 'active' ? (
              <Button
                label={t('sell:promote')}
                size="sm"
                variant="secondary"
                disabled={working}
                onPress={() => setPromoting(listing)}
                testID={`promote-${listing.id}`}
              />
            ) : null}

            {listing.status === 'active' ? (
              <Button
                label={t('sell:sold')}
                size="sm"
                variant="ghost"
                disabled={working}
                onPress={() => markSold.mutate(listing)}
                testID={`sold-${listing.id}`}
              />
            ) : null}

            {/* Deleting is one tap away but never the loudest thing on the
                card, and it asks before it does anything. */}
            {confirming === listing.id ? (
              <Button
                label={t('sell:confirm_delete')}
                size="sm"
                variant="danger"
                disabled={working}
                onPress={() => remove.mutate(listing)}
                style={{ marginLeft: 'auto' }}
                testID={`delete-${listing.id}`}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common:delete')}
                onPress={() => setConfirming(listing.id)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.centre,
                  {
                    marginLeft: 'auto',
                    width: 36,
                    height: 36,
                    borderRadius: theme.radius.md,
                    backgroundColor: pressed ? theme.colors.dangerMuted : 'transparent',
                  },
                ]}
                testID={`delete-${listing.id}`}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const data = listings.data?.data ?? [];

  return (
    <Screen flush edges={['top']}>
      <TabHeader />

      <View
        style={{
          paddingHorizontal: theme.screenPadding,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="title">{t('sell:my_listings')}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => setSheetOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.accentMuted,
          }}
          testID="credits-balance"
        >
          <Ionicons name="pricetag" size={14} color={theme.colors.accent} />
          <Text variant="label" tone="accent">
            {t('sell:credits_balance', { count: balance })}
          </Text>
        </Pressable>
      </View>

      {listings.isLoading ? (
        <View style={[styles.centre, { flex: 1 }]}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : listings.isError ? (
        <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.md, paddingHorizontal: theme.screenPadding }}>
          <Text variant="body" tone="danger" style={{ textAlign: 'center' }}>
            {t('common:error_loading')}
          </Text>
          <Button label={t('common:retry')} variant="secondary" onPress={() => void listings.refetch()} />
        </View>
      ) : data.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            glyph="🚗"
            title={t('sell:no_listings')}
            description={t('sell:no_listings_body')}
            actionLabel={t('sell:new_listing')}
            onAction={startNew}
          />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(listing) => listing.id}
          renderItem={({ item }) => row(item)}
          contentContainerStyle={{
            paddingHorizontal: theme.screenPadding,
            paddingTop: theme.spacing.xs,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.md,
          }}
          refreshing={listings.isFetching}
          onRefresh={() => void listings.refetch()}
          ListHeaderComponent={
            failure ? (
              <Text variant="meta" tone="danger" style={{ marginBottom: theme.spacing.md }}>
                {failure}
              </Text>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {data.length > 0 ? (
        <View
          style={[
            {
              paddingHorizontal: theme.screenPadding,
              paddingTop: theme.spacing.md,
              paddingBottom: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            theme.elevation.sheet,
          ]}
        >
          <Button
            label={t('sell:new_listing')}
            icon="add"
            block
            size="lg"
            onPress={startNew}
            testID="new-listing"
          />
        </View>
      ) : null}

      <CreditsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onGranted={() => setSheetOpen(false)}
      />

      <PromoteSheet listing={promoting} onClose={() => setPromoting(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
