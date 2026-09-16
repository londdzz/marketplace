import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { referenceApi } from '../../api/reference';
import { AppHeader, Fab, ListingCard, PromoBanner, Screen, SearchBar, Text } from '../../components';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useListingCardMapper } from '../../hooks/useListingCard';
import { useListingSearch } from '../../hooks/useListingSearch';
import { useTheme } from '../../theme';

export default function HomeTab() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['home', 'common']);

  // The newest cars across all five markets, which is what a home screen is
  // for: something to look at before anyone has searched for anything.
  const newest = useListingSearch({ sort: 'newest' });
  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  const toCard = useListingCardMapper(byCurrency, (code) =>
    countries.data?.find((country) => country.code === code)?.currency ?? 'EUR',
  );

  const listings = (newest.data?.pages[0]?.data ?? []).slice(0, 6);

  // Two columns and the gap between them fill the row exactly, on any screen.
  const gap = theme.spacing.md;
  const cardWidth = Math.floor((width - theme.screenPadding * 2 - gap) / 2);

  return (
    <Screen flush edges={['top']}>
      <AppHeader
        accountBadge
        unreadMessages
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
          <Text variant="display" style={{ fontSize: 24, lineHeight: 30 }}>
            {t('home:newest')}
          </Text>
          <Pressable accessibilityRole="button" style={styles.showAll}>
            <Text variant="bodyStrong" tone="accent">
              {t('home:show_all')}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={17}
              color={theme.colors.accent}
              style={{ marginLeft: theme.spacing.xs }}
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
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Fab accessibilityLabel={t('common:continue')} onPress={() => router.push('/(tabs)/sell')} />
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
