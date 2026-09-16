import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, useWindowDimensions, View } from 'react-native';

import { referenceApi } from '../../api/reference';
import type { SearchFilters } from '../../api/types';
import {
  Chip,
  EmptyState,
  Input,
  ListingCard,
  Screen,
  Text,
} from '../../components';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useListingCardMapper } from '../../hooks/useListingCard';
import { useListingSearch } from '../../hooks/useListingSearch';
import { useTheme } from '../../theme';

export default function SearchTab() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['search', 'home', 'common']);

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});

  // The typed query only joins the filters when the person stops typing long
  // enough to mean it, so every keystroke does not hit the API.
  const active = useMemo<SearchFilters>(() => ({ ...filters, q: query || undefined }), [filters, query]);

  const search = useListingSearch(active);
  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  const currencyFor = (code: string | null) =>
    countries.data?.find((country) => country.code === code)?.currency ?? 'EUR';

  const toCard = useListingCardMapper(byCurrency, currencyFor);

  const listings = search.data?.pages.flatMap((page) => page.data) ?? [];
  const total = search.data?.pages[0]?.meta.total ?? 0;

  const gap = theme.spacing.md;
  const cardWidth = Math.floor((width - theme.screenPadding * 2 - gap) / 2);

  return (
    <Screen flush edges={['top']}>
      <View style={{ paddingHorizontal: theme.screenPadding, paddingTop: theme.spacing.sm }}>
        <Input
          placeholder={t('home:search_placeholder')}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          testID="search-input"
        />

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.xs,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <Chip
            label={t('search:filters')}
            onPress={() => router.push('/filters')}
            testID="open-filters"
          />
          <Chip
            label={t('search:all_countries')}
            selected={(filters.countries?.length ?? 0) > 0}
            onPress={() => router.push('/filters')}
          />
          <Chip label={t('search:sort')} onPress={() => router.push('/filters')} />
        </View>

        {!search.isLoading ? (
          <Text variant="meta" tone="muted" style={{ marginBottom: theme.spacing.sm }}>
            {t('search:results', { count: total })}
          </Text>
        ) : null}
      </View>

      {search.isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xxxl }} />
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
          renderItem={({ item }) => (
            <ListingCard
              listing={toCard(item)}
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
