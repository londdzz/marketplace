import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { authApi } from '../../api/auth';
import { listingsApi } from '../../api/listings';
import { referenceApi } from '../../api/reference';
import type { Listing } from '../../api/types';
import {
  BodyTypeTile,
  CollectionCard,
  ListingCard,
  RateCard,
  PromoBanner,
  Screen,
  SearchBar,
  TabHeader,
  Text,
} from '../../components';
import { collectionArt, collectionIcon, useBrowse, useCollectionChips } from '../../hooks/useBrowse';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useListingCardMapper } from '../../hooks/useListingCard';
import { useListingPage } from '../../hooks/useListingPage';
import { useAuth } from '../../auth/AuthProvider';
import { useFilters } from '../../search/FiltersProvider';
import { useTheme } from '../../theme';

/** The newest cars, which is what the home screen is a window onto. */
const NEWEST = { sort: 'newest' } as const;

/** Eight on the home screen. The rest are behind Show all. */
const HOME_CARS = 8;

/**
 * Both browse rows scroll sideways rather than stacking.
 *
 * A card and a half in view is what says there are more: a grid showing all of
 * them at once is a wall to read rather than a rack to flick through, and it
 * pushes the cars themselves off the bottom of the screen.
 */
const COLLECTION_CARD = 264;
const SHAPE_TILE = 112;

export default function HomeTab() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['home', 'search', 'listing', 'common']);
  const queryClient = useQueryClient();
  const { replace } = useFilters();
  const { user, apply } = useAuth();

  // Answering sets rated_at on the account, which is what stops the card being
  // drawn on the next launch. It must not take it off the screen mid-tap,
  // though, or the thank-you is never seen — so this keeps it for the session.
  const [rated, setRated] = useState(false);

  // The newest cars across all five markets, which is what a home screen is
  // for: something to look at before anyone has searched for anything.
  const newest = useListingPage(NEWEST, 1);
  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  // The ways in that are not a search box, each with a count the API measured.
  const browse = useBrowse();
  const chipsFor = useCollectionChips();

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

  const listings = (newest.data?.data ?? []).slice(0, HOME_CARS);

  // Two columns and the gap between them fill the row exactly, on any screen.
  const gap = theme.spacing.md;
  const row = width - theme.screenPadding * 2;
  const cardWidth = Math.floor((row - gap) / 2);

  // The rails run to both edges of the display, so a card can sit half off the
  // right of it and the first one still lines up with everything above.
  const rail = {
    marginHorizontal: -theme.screenPadding,
  };
  const railContent = {
    paddingHorizontal: theme.screenPadding,
    gap,
  };

  /** Open a set of filters as a search, rather than carrying anything over. */
  const open = (filters: Parameters<typeof replace>[0]) => {
    replace(filters);
    router.push('/results');
  };

  const collections = browse.data?.collections ?? [];
  const shapes = browse.data?.body_types ?? [];

  return (
    <Screen flush edges={['top']}>
      {/* No badges until something real drives them: a dot that is always on
          says nothing. */}
      <TabHeader />

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

        {/* Somewhere to start for a buyer with nothing to type yet. Both
            sections are drawn from what the API says is actually in the
            catalogue, so neither can offer a category with no cars in it. */}
        {collections.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="title">{t('home:browse_collections')}</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={COLLECTION_CARD + gap}
              snapToAlignment="start"
              style={rail}
              contentContainerStyle={railContent}
              testID="collections-rail"
            >
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.key}
                  title={t(`home:collection_${collection.key}`, collection.key)}
                  count={t('search:offers', { count: collection.count })}
                  // A chip that only repeats the name above it says nothing.
                  chips={chipsFor(collection).filter(
                    (chip) => chip !== t(`home:collection_${collection.key}`, collection.key),
                  )}
                  art={collectionArt(collection.key)}
                  photoUrl={collection.photoUrl}
                  icon={collectionIcon(collection.key) as never}
                  width={COLLECTION_CARD}
                  onPress={() => open(collection.filters)}
                  testID={`collection-${collection.key}`}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text variant="title">{t('home:newest')}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.showAll}
            // Show all means all of these, newest first — not whatever search
            // was last built in the search tab, which is what the results
            // screen would otherwise still be holding.
            onPress={() => {
              replace(NEWEST);
              router.push('/results');
            }}
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
        {shapes.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="title">{t('home:browse_body_types')}</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={rail}
              contentContainerStyle={railContent}
              testID="shapes-rail"
            >
              {shapes.map((shape) => (
                <BodyTypeTile
                  key={shape.key}
                  label={t(`listing:body_type.${shape.key}`, shape.key)}
                  count={t('search:offers', { count: shape.count })}
                  shape={shape.key}
                  width={SHAPE_TILE}
                  onPress={() => open({ bodyType: [shape.key] })}
                  testID={`shape-${shape.key}`}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}


        {/* The one question, at the bottom where it interrupts nothing, and
            only until it has been answered. */}
        {user && (!user.rated_at || rated) ? (
          <RateCard
            onRate={async (score) => {
              await authApi.rate(score);
              setRated(true);
              apply({ ...user, rated_at: new Date().toISOString() });
            }}
          />
        ) : null}

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
