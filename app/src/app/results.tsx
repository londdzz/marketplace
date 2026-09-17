import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { Listing } from '../api/types';
import { Button, EmptyState, ListingCard, ListingRow, Screen, Text } from '../components';
import { formatEur, formatKm, formatLocal, listingLocation, listingTitle } from '../format';
import { SHOW_LOCAL_CURRENCY } from '../market';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useListingCardMapper } from '../hooks/useListingCard';
import { useListingSearch } from '../hooks/useListingSearch';
import { useFilters } from '../search/FiltersProvider';
import { useTheme } from '../theme';

const SORTS = ['relevance', 'price_asc', 'price_desc', 'newest', 'mileage_asc'] as const;

export default function ResultsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['search', 'listing', 'common']);
  const { filters, set } = useFilters();

  const [saved, setSaved] = useState(false);
  const [grid, setGrid] = useState(false);

  const search = useListingSearch(filters);
  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });
  const favorites = useQuery({ queryKey: ['favorites'], queryFn: listingsApi.favorites });

  const favoriteIds = new Set((favorites.data?.data ?? []).map((listing) => listing.id));

  const park = useMutation({
    mutationFn: (listing: Listing) =>
      favoriteIds.has(listing.id)
        ? listingsApi.removeFavorite(listing.id)
        : listingsApi.addFavorite(listing.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const saveSearch = useMutation({
    mutationFn: () => listingsApi.saveSearch(filters),
    onSuccess: () => setSaved(true),
  });

  const listings = search.data?.pages.flatMap((page) => page.data) ?? [];
  const total = search.data?.pages[0]?.meta.total ?? 0;

  const currencyFor = (code: string | null) =>
    countries.data?.find((country) => country.code === code)?.currency ?? 'EUR';

  const toCard = useListingCardMapper(byCurrency, currencyFor, favoriteIds);

  const gridGap = theme.spacing.md;
  const cardWidth = Math.floor((width - theme.screenPadding * 2 - gridGap) / 2);

  /** Everything known about a car on one line, the way a results list reads. */
  const facts = (listing: Listing) =>
    [
      listing.year ? String(listing.year) : null,
      listing.mileage_km !== null ? formatKm(listing.mileage_km) : null,
      listing.power_hp ? `${listing.power_hp} hp` : null,
      listing.fuel ? t(`listing:fuel.${listing.fuel}`, listing.fuel) : null,
      listing.transmission ? t(`listing:transmission.${listing.transmission}`, listing.transmission) : null,
    ]
      .filter(Boolean)
      .join(' · ');

  const cycleSort = () => {
    const current = filters.sort ?? 'relevance';
    const next = SORTS[(SORTS.indexOf(current) + 1) % SORTS.length];
    set({ sort: next });
  };

  return (
    <Screen flush edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.header,
          {
            paddingHorizontal: theme.screenPadding,
            paddingVertical: theme.spacing.md,
            borderBottomColor: theme.colors.border,
            gap: theme.spacing.md,
          },
        ]}
      >
        <Pressable accessibilityRole="button" onPress={() => router.back()} testID="results-back">
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>

        <Text variant="bodyStrong" style={{ flex: 1, textAlign: 'center' }}>
          {t('search:results_title', { count: total })}
        </Text>

        <Pressable accessibilityRole="button" onPress={cycleSort} testID="results-sort">
          <Ionicons name="swap-vertical" size={24} color={theme.colors.text} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setGrid((value) => !value)}
          testID="results-layout"
        >
          <Ionicons
            name={grid ? 'list-outline' : 'grid-outline'}
            size={22}
            color={theme.colors.text}
          />
        </Pressable>
      </View>

      <Text
        variant="caption"
        tone="muted"
        style={{ paddingHorizontal: theme.screenPadding, paddingTop: theme.spacing.sm }}
      >
        {t(`search:sort_${filters.sort ?? 'relevance'}`)}
      </Text>

      {search.isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xxxl }} />
      ) : (
        <FlatList
          data={listings}
          key={grid ? 'grid' : 'rows'}
          keyExtractor={(listing) => listing.id}
          numColumns={grid ? 2 : 1}
          columnWrapperStyle={grid ? { gap: gridGap } : undefined}
          contentContainerStyle={{
            padding: theme.screenPadding,
            paddingBottom: 120,
            gap: grid ? theme.spacing.xl : theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (search.hasNextPage && !search.isFetchingNextPage) {
              void search.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <EmptyState
              glyph="🔍"
              title={t('search:no_results_title')}
              description={t('search:no_results_body')}
            />
          }
          ListFooterComponent={
            search.isFetchingNextPage ? (
              <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: theme.spacing.lg }} />
            ) : null
          }
          renderItem={({ item }) => {
            const currency = currencyFor(item.country_code);

            if (grid) {
              return (
                <ListingCard
                  listing={toCard(item)}
                  compact
                  width={cardWidth}
                  onPress={() => router.push(`/listing/${item.id}`)}
                  onToggleFavorite={() => park.mutate(item)}
                />
              );
            }

            return (
              <ListingRow
                listing={{
                  id: item.id,
                  title: listingTitle(item),
                  variant: item.variant,
                  priceEur: formatEur(item.price_eur),
                  priceNote: SHOW_LOCAL_CURRENCY
                    ? formatLocal(item.price_eur, currency, byCurrency[currency])
                    : undefined,
                  facts: facts(item),
                  sellerName: item.seller?.dealer_name ?? item.seller?.display_name ?? '',
                  sellerKind:
                    item.seller?.seller_type === 'dealer' ? t('listing:dealer') : t('listing:private'),
                  location: listingLocation(item),
                  photoUrl: item.photos[0]?.thumb_url,
                  featured: item.is_featured,
                  featuredLabel: t('search:top'),
                  negotiable: item.price_negotiable,
                  negotiableLabel: t('listing:negotiable'),
                  favorited: favoriteIds.has(item.id),
                }}
                contactLabel={t('search:contact')}
                parkLabel={t('search:park')}
                onPress={() => router.push(`/listing/${item.id}`)}
                onContact={() => {
                  if (item.seller?.phone) {
                    void Linking.openURL(`tel:${item.seller.phone}`);
                  }
                }}
                onPark={() => park.mutate(item)}
              />
            );
          }}
        />
      )}

      <View style={[styles.floating, { bottom: theme.spacing.xxl, left: theme.screenPadding, right: theme.screenPadding }]}>
        <Button
          label={t('search:save_search')}
          size="lg"
          icon="star-outline"
          loading={saveSearch.isPending}
          disabled={saved}
          onPress={() => saveSearch.mutate()}
          style={{ alignSelf: 'center' }}
          testID="save-search"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  floating: {
    position: 'absolute',
    alignItems: 'center',
  },
});
