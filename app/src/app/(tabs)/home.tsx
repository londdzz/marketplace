import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { authApi } from '../../api/auth';
import { referenceApi } from '../../api/reference';
import {
  BodyTypeTile,
  CategorySwitch,
  CollectionCard,
  EmptyState,
  FloatingSearchBar,
  ListingCard,
  RateCard,
  PromoBanner,
  Screen,
  TabHeader,
  Text,
} from '../../components';
import {
  bodyTypeArt,
  collectionArt,
  collectionIcon,
  useBrowse,
  useCollectionChips,
} from '../../hooks/useBrowse';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useFavorites } from '../../hooks/useFavorites';
import { useListingCardMapper } from '../../hooks/useListingCard';
import { useListingPage } from '../../hooks/useListingPage';
import { useAuth } from '../../auth/AuthProvider';
import { useFilters } from '../../search/FiltersProvider';
import { useTheme } from '../../theme';

/** The newest of whatever is being browsed, which is what home is a window onto. */
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

/**
 * The app bar's height before it has been measured: 26 for the icons and the
 * spacing scale's md above and below them. It is measured anyway, because the
 * phone's text size setting can make it taller, but starting at the right
 * number means the page is never laid out wrong even for one frame.
 */
const HEADER_HEIGHT = 50;

export default function HomeTab() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['home', 'search', 'listing', 'common']);
  const { replace, vehicleType, setVehicleType } = useFilters();
  const { user, apply } = useAuth();

  // Answering sets rated_at on the account, which is what stops the card being
  // drawn on the next launch. It must not take it off the screen mid-tap,
  // though, or the thank-you is never seen — so this keeps it for the session.
  const [rated, setRated] = useState(false);

  // The app bar gives up the top of the screen as soon as the page moves and
  // the search bar takes it, which is the one control a buyer scrolling past
  // the cars is most likely to want next. Its height is measured rather than
  // assumed, because the phone's text size setting decides it.
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT);
  const [headerGone, setHeaderGone] = useState(false);
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Gone well before the search bar arrives, so the two are never both there.
  const headerStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, headerHeight * 0.6], [0, 1], 'clamp');

    return { opacity: 1 - progress, transform: [{ translateY: -progress * 10 }] };
  }, [headerHeight]);

  // Faded out, it is still drawn over the pinned search bar, so it has to stop
  // taking touches — otherwise the bar would be dead exactly where it floats.
  useAnimatedReaction(
    () => scrollY.value > headerHeight * 0.5,
    (gone, was) => {
      if (gone !== was) {
        runOnJS(setHeaderGone)(gone);
      }
    },
    [headerHeight],
  );

  // The newest cars across all five markets, which is what a home screen is
  // for: something to look at before anyone has searched for anything.
  // The whole screen follows the switch: the newest list, the collections, the
  // shapes and what tapping any of them searches for.
  const newest = useListingPage({ ...NEWEST, vehicleType }, 1);
  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });
  const vocabularies = useQuery({
    queryKey: ['vocabularies'],
    queryFn: referenceApi.vocabularies,
    staleTime: 60 * 60 * 1000,
  });

  // The ways in that are not a search box, each with a count the API measured.
  const browse = useBrowse(vehicleType);
  const chipsFor = useCollectionChips();

  // The heart on a card does what a heart does, here as well as in the
  // results — and for a guest as well as an account, since keeping a
  // shortlist involves nobody but the person keeping it.
  const favorites = useFavorites();

  const toCard = useListingCardMapper(
    byCurrency,
    (code) => countries.data?.find((country) => country.code === code)?.currency ?? 'EUR',
    favorites.ids,
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

  /**
   * Open a set of filters as a search, rather than carrying anything over.
   *
   * The kind comes first so a collection's own `vehicleType` still wins — the
   * API sends it with every collection, and it is the same one anyway.
   */
  const open = (filters: Parameters<typeof replace>[0]) => {
    replace({ vehicleType, ...filters });
    router.push('/results');
  };

  const collections = browse.data?.collections ?? [];
  const shapes = browse.data?.body_types ?? [];

  return (
    <Screen flush edges={['top']}>
      <View style={styles.flex}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          // The search bar is child zero, so the platform pins it to the top
          // of the screen itself once the page has scrolled past it.
          stickyHeaderIndices={[0]}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingHorizontal: theme.screenPadding,
            paddingBottom: theme.spacing.huge,
            gap: theme.spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <FloatingSearchBar
            title={t('home:search_placeholder')}
            hint={t('home:search_hint')}
            onPress={() => router.push('/(tabs)/search')}
            scrollY={scrollY}
            pinAt={headerHeight}
          />

          {/* Right under the search bar, so it is the first thing read after
              it, and inside the page rather than pinned: it is a choice made
              once on the way in, not a control to keep reaching for. */}
          <CategorySwitch
            value={vehicleType}
            types={vocabularies.data?.vehicle_types}
            onChange={setVehicleType}
            label={(type) => t(`search:category.${type}`)}
            testID="home-category-switch"
          />

          <PromoBanner
            title={t(`home:promo_title_${vehicleType}`)}
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
                    empty={collection.count === 0}
                    testID={`collection-${collection.key}`}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text variant="title">{t(`home:newest_${vehicleType}`)}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.showAll}
              // Show all means all of these, newest first — not whatever search
              // was last built in the search tab, which is what the results
              // screen would otherwise still be holding.
              onPress={() => {
                replace({ ...NEWEST, vehicleType });
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
          ) : newest.isError ? (
            <EmptyState
              glyph="cloud-offline-outline"
              title={t('common:error_loading')}
              actionLabel={t('common:retry')}
              onAction={() => void newest.refetch()}
            />
          ) : listings.length === 0 ? (
            // The state every new market starts in. A heading with nothing
            // under it reads as broken, and on a phone that gap is most of
            // the screen, so it says so and says what to do next.
            <EmptyState
              glyph="car-outline"
              title={t('home:newest_empty_title')}
              description={t(`home:newest_empty_${vehicleType}`)}
              actionLabel={t('sell:new_listing')}
              onAction={() => router.push('/sell')}
            />
          ) : (
            <View style={[styles.grid, { gap, marginTop: -theme.spacing.sm }]}>
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={toCard(listing)}
                  compact
                  width={cardWidth}
                  onPress={() => router.push(`/listing/${listing.id}`)}
                  onToggleFavorite={() => favorites.toggle(listing)}
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
                    vehicleType={vehicleType}
                    image={bodyTypeArt(shape.key, vehicleType)}
                    width={SHAPE_TILE}
                    onPress={() => open({ bodyType: [shape.key] })}
                    empty={shape.count === 0}
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

        </Animated.ScrollView>

        {/* Drawn over the page rather than above it, so the cars scroll up
            behind it as it goes. No badges until something real drives them:
            a dot that is always on says nothing. */}
        <Animated.View
          style={[styles.header, headerStyle]}
          pointerEvents={headerGone ? 'none' : 'auto'}
          onLayout={(event: LayoutChangeEvent) =>
            setHeaderHeight(Math.round(event.nativeEvent.layout.height))
          }
        >
          <TabHeader />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
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
