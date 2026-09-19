import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { Listing } from '../api/types';
import {
  Button,
  EmptyState,
  ListingCard,
  ListingRow,
  Pager,
  Screen,
  StackHeader,
  Text,
} from '../components';
import { formatEur, formatKm, formatLocal, listingLocation, listingTitle } from '../format';
import { SHOW_LOCAL_CURRENCY } from '../market';
import { useBottomInset } from '../hooks/useBottomInset';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useListingCardMapper } from '../hooks/useListingCard';
import { useListingPage } from '../hooks/useListingPage';
import { useFilters } from '../search/FiltersProvider';
import { SortSheet } from '../search/SortSheet';
import { useTheme } from '../theme';

export default function ResultsScreen() {
  const theme = useTheme();
  const bottomInset = useBottomInset();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['search', 'listing', 'common']);
  const { filters, set, count } = useFilters();

  const [saved, setSaved] = useState(false);
  const [grid, setGrid] = useState(false);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState(false);
  const list = useRef<FlatList<Listing>>(null);

  const search = useListingPage(filters, page);

  // A different search is a different set of pages, so it starts at the first.
  const asked = useRef(filters);
  if (asked.current !== filters) {
    asked.current = filters;

    if (page !== 1) {
      setPage(1);
    }
  }
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
    onSuccess: async () => {
      setSaved(true);
      // The Searches tab stays mounted behind this screen, so it only learns
      // about the new search if its query is put out of date here.
      await queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const listings = search.data?.data ?? [];
  const lastPage = search.data?.meta.last_page ?? 1;

  /** A new page starts at the top of itself, not wherever the last one ended. */
  const turnTo = (next: number) => {
    setPage(next);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const total = search.data?.meta.total ?? 0;

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

  const sort = filters.sort ?? 'relevance';

  // Saving a list of every car is not a search, so the button only appears
  // once something has actually been narrowed down.
  const searched = count > 0 || Boolean(filters.q);

  return (
    <Screen flush edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <StackHeader
        fallback="/(tabs)/search"
        backTestID="results-back"
        backLabel={t('common:back')}
        actions={
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSorting(true)}
              testID="results-sort"
            >
              <Ionicons name="swap-vertical" size={21} color={theme.colors.text} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setGrid((value) => !value)}
              testID="results-layout"
            >
              <Ionicons
                name={grid ? 'list-outline' : 'grid-outline'}
                size={21}
                color={theme.colors.text}
              />
            </Pressable>
          </>
        }
      />

      {/* The count and the ordering read as one line under the bar, which is
          where the header's title used to be. */}
      <View
        style={[
          styles.sortLine,
          {
            paddingHorizontal: theme.screenPadding,
            paddingBottom: theme.spacing.sm,
            gap: theme.spacing.sm,
          },
        ]}
      >
        <Text variant="bodyStrong">{t('search:results_title', { count: total })}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {t(`search:sort_${filters.sort ?? 'relevance'}`)}
        </Text>
      </View>

      {search.isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xxxl }} />
      ) : (
        <FlatList
          ref={list}
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
          ListEmptyComponent={
            <EmptyState
              glyph="🔍"
              title={t('search:no_results_title')}
              description={t('search:no_results_body')}
            />
          }
          ListFooterComponent={
            <Pager
              page={page}
              lastPage={lastPage}
              label={t('search:page_of', { page, total: lastPage })}
              previousLabel={t('search:previous')}
              nextLabel={t('search:next')}
              busy={search.isFetching}
              onChange={turnTo}
            />
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

      {searched ? (
      <View
        style={[
          styles.floating,
          {
            bottom: bottomInset + theme.spacing.sm,
            left: theme.screenPadding,
            right: theme.screenPadding,
          },
        ]}
      >
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
      ) : null}

      <SortSheet
        open={sorting}
        current={sort}
        onChoose={(next) => {
          set({ sort: next });
          setSorting(false);
        }}
        onClose={() => setSorting(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sortLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  floating: {
    position: 'absolute',
    alignItems: 'center',
  },
});
