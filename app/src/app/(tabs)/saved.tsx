import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, useWindowDimensions } from 'react-native';

import { referenceApi } from '../../api/reference';
import { EmptyState, ListingCard, Screen, TabHeader, Text } from '../../components';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useFavorites } from '../../hooks/useFavorites';
import { useListingCardMapper } from '../../hooks/useListingCard';
import { useTheme } from '../../theme';

/**
 * The cars this buyer kept.
 */
export default function SavedTab() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['home', 'tabs', 'search', 'common']);

  // On the account when there is one, on this phone when there is not.
  const favorites = useFavorites();
  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  const toCard = useListingCardMapper(
    byCurrency,
    (code) => countries.data?.find((country) => country.code === code)?.currency ?? 'EUR',
  );

  const gap = theme.spacing.md;
  const cardWidth = Math.floor((width - theme.screenPadding * 2 - gap) / 2);
  const listings = favorites.listings;

  return (
    <Screen flush edges={['top']}>
      <TabHeader />

      <Text
        variant="title"
        style={{
          paddingHorizontal: theme.screenPadding,
          paddingVertical: theme.spacing.md,
        }}
      >
        {t('tabs:saved')}
      </Text>

      {favorites.isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xxxl }} />
      ) : favorites.isError ? (
        <EmptyState
          glyph="⚠"
          title={t('common:error_loading')}
          description={t('search:saved_failed_body')}
          actionLabel={t('common:retry')}
          onAction={() => void favorites.refetch()}
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(listing) => listing.id}
          numColumns={2}
          columnWrapperStyle={{ gap }}
          contentContainerStyle={{
            paddingHorizontal: theme.screenPadding,
            paddingBottom: theme.spacing.huge,
            gap: theme.spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState glyph="♡" title={t('home:empty_title')} description={t('home:empty_body')} />
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={{ ...toCard(item), favorited: true }}
              compact
              width={cardWidth}
              onPress={() => router.push(`/listing/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}
