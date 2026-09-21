import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { listingsApi } from '../../api/listings';
import { referenceApi } from '../../api/reference';
import type { SavedSearch } from '../../api/types';
import { ConfirmDialog, EmptyState, ListGroup, Screen, TabHeader, Text } from '../../components';
import { formatEur, formatKm } from '../../format';
import { useSavedSearches } from '../../hooks/useSavedSearches';
import { useFilters } from '../../search/FiltersProvider';
import { useTheme } from '../../theme';

/**
 * The searches this buyer kept.
 *
 * Tapping one puts it back in the search the whole app shares and opens the
 * results, so a saved search runs exactly as it did the day it was saved. The
 * API has no endpoint for editing one, so nothing here pretends to: a search
 * is run or it is deleted.
 */
export default function MySearchesTab() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { replace } = useFilters();
  const { t } = useTranslation(['search', 'listing', 'tabs', 'common']);
  const [pendingDelete, setPendingDelete] = useState<SavedSearch | null>(null);

  // On the account when there is one, on this phone when there is not.
  const saved = useSavedSearches();
  const searches = saved;
  const makes = useQuery({ queryKey: ['makes'], queryFn: referenceApi.makes });

  // A tab screen is mounted once and never unmounted, so without this the list
  // would still show what it held the first time it was opened.
  const refetch = searches.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const remove = useMutation({
    mutationFn: (id: string) => saved.remove.mutateAsync(id),
    onSuccess: () => setPendingDelete(null),
  });

  /** The criteria in words, in the order the search builder asks for them. */
  const describe = (search: SavedSearch): string => {
    const { filters } = search;
    const parts: string[] = [];

    if (filters.q) {
      parts.push(`“${filters.q}”`);
    }

    const make = makes.data?.find((entry) => entry.id === filters.makeId);
    if (make) {
      parts.push(make.name);
    }

    if (filters.yearMin && filters.yearMax) {
      parts.push(`${filters.yearMin}–${filters.yearMax}`);
    } else if (filters.yearMin) {
      parts.push(`${t('search:min')} ${filters.yearMin}`);
    } else if (filters.yearMax) {
      parts.push(`${t('search:max')} ${filters.yearMax}`);
    }

    if (filters.priceMin && filters.priceMax) {
      parts.push(`${formatEur(filters.priceMin)} – ${formatEur(filters.priceMax)}`);
    } else if (filters.priceMin) {
      parts.push(`${t('search:min')} ${formatEur(filters.priceMin)}`);
    } else if (filters.priceMax) {
      parts.push(`${t('search:max')} ${formatEur(filters.priceMax)}`);
    }

    if (filters.mileageMax) {
      parts.push(`${t('search:max')} ${formatKm(filters.mileageMax)}`);
    }

    (filters.fuel ?? []).forEach((fuel) => parts.push(t(`listing:fuel.${fuel}`)));

    if (filters.transmission) {
      parts.push(t(`listing:transmission.${filters.transmission}`));
    }

    return parts.length > 0 ? parts.join(' · ') : t('search:saved_everything');
  };

  const run = (search: SavedSearch) => {
    replace(search.filters);
    router.push('/results');
  };

  const list = searches.searches;

  return (
    <Screen flush edges={['top']}>
      <TabHeader />

      <Text
        variant="title"
        style={{ paddingHorizontal: theme.screenPadding, paddingVertical: theme.spacing.md }}
      >
        {t('tabs:my_searches')}
      </Text>

      {searches.isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xxxl }} />
      ) : searches.isError ? (
        <EmptyState
          glyph="⚠"
          title={t('search:saved_failed_title')}
          description={t('search:saved_failed_body')}
          actionLabel={t('common:retry')}
          onAction={() => void searches.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          glyph="☆"
          title={t('search:saved_empty_title')}
          description={t('search:saved_empty_body')}
          actionLabel={t('tabs:search')}
          onAction={() => router.push('/(tabs)/search')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.screenPadding,
            paddingBottom: theme.spacing.huge,
          }}
          showsVerticalScrollIndicator={false}
        >
          <ListGroup inset={theme.spacing.lg}>
            {list.map((search) => (
              <View key={search.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => run(search)}
                  testID={`saved-search-${search.id}`}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      paddingLeft: theme.spacing.lg,
                      paddingVertical: theme.spacing.md,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {/* Saving from the results gives a search no name, so the
                      criteria become the title rather than every row reading
                      the same word. */}
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {search.name ?? describe(search)}
                  </Text>
                  {search.name ? (
                    <Text variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 1 }}>
                      {describe(search)}
                    </Text>
                  ) : null}
                  {search.notify ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.xxs,
                        marginTop: theme.spacing.xs,
                      }}
                    >
                      <Ionicons
                        name="notifications-outline"
                        size={12}
                        color={theme.colors.accent}
                      />
                      <Text variant="caption" tone="accent">
                        {t('search:saved_alerts_on')}
                      </Text>
                    </View>
                  ) : !saved.canNotify ? (
                    // The one real difference between a search kept on the
                    // phone and one kept on an account. Saying it beats a
                    // missing bell nobody can explain.
                    <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.xs }}>
                      {t('search:guest_alerts_off')}
                    </Text>
                  ) : null}
                </Pressable>

                {/* A sibling of the row rather than a child: a button inside a
                    button is invalid, and deleting is not running. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common:delete')}
                  onPress={() => setPendingDelete(search)}
                  testID={`saved-search-delete-${search.id}`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: theme.spacing.lg,
                      paddingVertical: theme.spacing.md,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name="trash-outline" size={17} color={theme.colors.textSubtle} />
                </Pressable>
              </View>
            ))}
          </ListGroup>
        </ScrollView>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('search:saved_delete_title')}
        body={pendingDelete ? describe(pendingDelete) : undefined}
        confirmLabel={t('common:delete')}
        cancelLabel={t('common:cancel')}
        destructive
        loading={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
        testID="saved-search-confirm"
      />
    </Screen>
  );
}
