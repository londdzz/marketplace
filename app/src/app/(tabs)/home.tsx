import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { listingsApi } from '../../api/listings';
import { referenceApi } from '../../api/reference';
import type { Listing } from '../../api/types';
import { AppHeader, ListingCard, PromoBanner, Screen, SearchBar, Text } from '../../components';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useListingCardMapper } from '../../hooks/useListingCard';
import { useListingSearch } from '../../hooks/useListingSearch';
import { useTheme } from '../../theme';

export default function HomeTab() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['home', 'common']);
  const queryClient = useQueryClient();

  // The newest cars across all five markets, which is what a home screen is
  // for: something to look at before anyone has searched for anything.
  const newest = useListingSearch({ sort: 'newest' });
  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  const favorites = useQuery({ queryKey: ['favorites'], queryFn: listingsApi.favorites });
  const favoriteIds = new Set((favorites.data?.data ?? []).map((listing) => listing.id));

  // The heart on a card does what a heart does, here as well as in the results.
  const save = useMutation({
    mutationFn: (listing: Listing) =>
      favoriteIds.has(listing.id)
        ? listingsApi.removeFavorite(listing.id)
        : listingsApi.addFavorite(listing.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const toCard = useListingCardMapper(
    byCurrency,
    (code) => countries.data?.find((country) => country.code === code)?.currency ?? 'EUR',
    favoriteIds,
  );

  const listings = (newest.data?.pages[0]?.data ?? []).slice(0, 6);

  // Two columns and the gap between them fill the row exactly, on any screen.
  const gap = theme.spacing.md;
  const cardWidth = Math.floor((width - theme.screenPadding * 2 - gap) / 2);

  return (
    <Screen flush edges={['top']}>
      {/* No badges until something real drives them: the unread count arrives
          with messaging, and a dot that is always on says nothing. */}
      <AppHeader
        onAccount={() => router.push('/(tabs)/profile')}
        onMessages={() => router.push('/(tabs)/messages')}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.screenPadding,
          paddingBottom: theme.spacing.huge,
          gap: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar
          title={t('home:search_placeholder')}
          hint={t('home:search_hint')}
          onPress={() => router.push('/(tabs)/search')}
        />

        <PromoBanner
          title={t('home:promo_title')}
          body={t('home:promo_body')}
          cta={t('home:promo_cta')}
          onPress={() => router.push('/(tabs)/sell')}
        />

        <View style={styles.sectionHeader}>
          <Text variant="title">{t('home:newest')}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.showAll}
            onPress={() => router.push('/results')}
            testID="home-show-all"
          >
            <Text variant="label" tone="accent">
              {t('home:show_all')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={15}
              color={theme.colors.accent}
              style={{ marginLeft: 2 }}
            />
          </Pressable>
        </View>

        {newest.isLoading ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xl }} />
        ) : (
          <View style={[styles.grid, { gap, marginTop: -theme.spacing.sm }]}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={toCard(listing)}
                compact
                width={cardWidth}
                onPress={() => router.push(`/listing/${listing.id}`)}
                onToggleFavorite={() => save.mutate(listing)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
