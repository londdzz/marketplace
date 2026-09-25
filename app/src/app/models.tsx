import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { referenceApi } from '../api/reference';
import { EmptyState, Input, ListGroup, OptionRow, Screen, StackHeader, Text } from '../components';
import { useFilters } from '../search/FiltersProvider';
import { useTheme } from '../theme';

/**
 * Which model of the chosen make, for search.
 *
 * The search tab could only ever narrow to a make: somebody after an M3 had to
 * ask for every BMW and read the results. `model_id` was in the filter type and
 * in the API from the start; nothing ever set it.
 *
 * A screen rather than chips beside the makes, because a make carries a few
 * dozen models and a wrapped chip field of them is a wall to read. The list is
 * searchable for the same reason the sell flow's is — typing three letters
 * beats scrolling to S.
 */
export default function ModelsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['search', 'sell', 'listing', 'common']);
  const { filters, vehicleType, set } = useFilters();

  const makeId = filters.makeId;

  const makes = useQuery({
    queryKey: ['makes', vehicleType],
    queryFn: () => referenceApi.makes(vehicleType),
  });
  const models = useQuery({
    queryKey: ['models', makeId, vehicleType],
    queryFn: () => referenceApi.models(makeId as number, vehicleType),
    enabled: Boolean(makeId),
    staleTime: 60 * 60 * 1000,
  });

  const [query, setQuery] = useState('');

  const make = (makes.data ?? []).find((candidate) => candidate.id === makeId);

  const matching = (models.data ?? []).filter((model) =>
    query.trim() ? model.name.toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  /** Choosing one closes the screen: there is nothing else to do here. */
  const choose = (modelId: number | undefined) => {
    set({ modelId });
    router.back();
  };

  return (
    <Screen scroll={false}>
      <StackHeader fallback="/(tabs)/search" backLabel={t('common:back')} />

      <Text variant="title">{t('search:model')}</Text>
      {make ? (
        <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          {make.name}
        </Text>
      ) : null}

      <Input
        placeholder={t('sell:search_model')}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={{ marginTop: theme.spacing.lg }}
        testID="model-search"
      />

      {models.isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xxl }} />
      ) : models.isError ? (
        <EmptyState
          glyph="⚠"
          title={t('common:error_loading')}
          actionLabel={t('common:retry')}
          onAction={() => void models.refetch()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          <ListGroup>
            {/* Always first, so undoing the choice never means hunting for it. */}
            <OptionRow
              flat
              label={t('search:any_model')}
              selected={filters.modelId === undefined}
              onPress={() => choose(undefined)}
              testID="model-any"
            />

            {matching.map((model) => (
              <OptionRow
                key={model.id}
                flat
                label={model.name}
                caption={
                  model.body_type ? t(`listing:body_type.${model.body_type}`, model.body_type) : null
                }
                selected={filters.modelId === model.id}
                onPress={() => choose(model.id)}
                testID={`model-${model.id}`}
              />
            ))}
          </ListGroup>

          {matching.length === 0 ? (
            <View style={{ marginTop: theme.spacing.xl }}>
              <Text variant="meta" tone="muted">
                {t('sell:no_models_found')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
