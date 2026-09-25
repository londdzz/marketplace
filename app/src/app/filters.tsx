import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { listingsApi } from '../api/listings';
import { referenceApi } from '../api/reference';
import type { SortOption } from '../api/types';
import { Button, Chip, Input, ListGroup, Screen, SettingRow, Text } from '../components';
import { useFilters } from '../search/FiltersProvider';
import { useTheme } from '../theme';

const FUELS = ['diesel', 'petrol', 'hybrid', 'electric', 'lpg'] as const;
const GEARBOXES = ['manual', 'automatic'] as const;
const SORTS: SortOption[] = ['relevance', 'price_asc', 'price_desc', 'newest', 'mileage_asc'];

/**
 * The filter sheet.
 *
 * Presented as a sheet over the results rather than a separate page, so the
 * list stays visible behind it and closing it feels like putting something
 * down rather than navigating away.
 */
export default function FiltersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['search', 'listing', 'common']);

  const { filters, vehicleType, set, toggle, reset } = useFilters();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });
  const makes = useQuery({
    queryKey: ['makes', vehicleType],
    queryFn: () => referenceApi.makes(vehicleType),
  });
  const vocabularies = useQuery({
    queryKey: ['vocabularies'],
    queryFn: referenceApi.vocabularies,
    staleTime: 60 * 60 * 1000,
  });

  // The same count the builder shows, so the button never disagrees with it.
  const preview = useQuery({
    queryKey: ['listing-count', filters],
    queryFn: () => listingsApi.search(filters, 1),
  });
  const total = preview.data?.meta.total ?? 0;

  // Only asked for once a make narrows it to one manufacturer's range.
  const models = useQuery({
    queryKey: ['models', filters.makeId, vehicleType],
    queryFn: () => referenceApi.models(filters.makeId as number, vehicleType),
    enabled: filters.makeId !== undefined,
    staleTime: 60 * 60 * 1000,
  });

  const chosenModel = (models.data ?? []).find((model) => model.id === filters.modelId);

  const section = { marginTop: theme.spacing.xxl };
  const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing.xs, marginTop: theme.spacing.sm };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.spacing.md }}>
        <Text variant="title">{t('search:filter')}</Text>
        <Button label={t('search:reset')} variant="ghost" size="sm" onPress={reset} testID="reset-filters" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing.xxxl }}>
        <Text variant="label" tone="muted" style={section}>
          {t('search:make_model')}
        </Text>
        <View style={row}>
          {(makes.data ?? []).map((make) => (
            <Chip
              key={make.id}
              label={make.name}
              selected={filters.makeId === make.id}
              // The model goes with the make it belonged to.
              onPress={() =>
                set({
                  makeId: filters.makeId === make.id ? undefined : make.id,
                  modelId: undefined,
                })
              }
            />
          ))}
        </View>

        {filters.makeId !== undefined ? (
          <ListGroup style={{ marginTop: theme.spacing.md }}>
            <SettingRow
              label={t('search:model')}
              value={chosenModel?.name ?? t('search:any_model')}
              icon="options-outline"
              onPress={() => router.push('/models')}
              testID="filters-pick-model"
            />
          </ListGroup>
        ) : null}

        {(countries.data ?? []).length > 1 ? (
        <Text variant="label" tone="muted" style={section}>
          {t('search:countries')}
        </Text>
        ) : null}
        <View style={row}>
          {((countries.data ?? []).length > 1 ? (countries.data ?? []) : []).map((country) => (
            <Chip
              key={country.code}
              label={t(`search:country.${country.code}`, country.code)}
              selected={(filters.countries ?? []).includes(country.code)}
              onPress={() => toggle('countries', country.code)}
              testID={`country-${country.code}`}
            />
          ))}
        </View>

        <Text variant="label" tone="muted" style={section}>
          {t('search:price')}
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
          <Input
            placeholder={t('search:min')}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
            value={filters.priceMin ? String(filters.priceMin) : ''}
            onChangeText={(value) => set({ priceMin: value ? Number(value) : undefined })}
          />
          <Input
            placeholder={t('search:max')}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
            value={filters.priceMax ? String(filters.priceMax) : ''}
            onChangeText={(value) => set({ priceMax: value ? Number(value) : undefined })}
          />
        </View>

        <Text variant="label" tone="muted" style={section}>
          {t('search:year')}
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
          <Input
            placeholder={t('search:min')}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
            value={filters.yearMin ? String(filters.yearMin) : ''}
            onChangeText={(value) => set({ yearMin: value ? Number(value) : undefined })}
          />
          <Input
            placeholder={t('search:max')}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
            value={filters.yearMax ? String(filters.yearMax) : ''}
            onChangeText={(value) => set({ yearMax: value ? Number(value) : undefined })}
          />
        </View>

        <Text variant="label" tone="muted" style={section}>
          {t('search:fuel')}
        </Text>
        <View style={row}>
          {FUELS.map((fuel) => (
            <Chip
              key={fuel}
              label={t(`listing:fuel.${fuel}`)}
              selected={(filters.fuel ?? []).includes(fuel)}
              onPress={() => toggle('fuel', fuel)}
            />
          ))}
        </View>

        <Text variant="label" tone="muted" style={section}>
          {t('search:transmission')}
        </Text>
        <View style={row}>
          {GEARBOXES.map((gearbox) => (
            <Chip
              key={gearbox}
              label={t(`listing:transmission.${gearbox}`)}
              selected={filters.transmission === gearbox}
              onPress={() => set({ transmission: filters.transmission === gearbox ? undefined : gearbox })}
            />
          ))}
        </View>

        <Text variant="label" tone="muted" style={section}>
          {t('search:sort')}
        </Text>
        <View style={row}>
          {SORTS.map((sort) => (
            <Chip
              key={sort}
              label={t(`search:sort_${sort}`)}
              selected={(filters.sort ?? 'relevance') === sort}
              onPress={() => set({ sort })}
            />
          ))}
        </View>
      </ScrollView>

      <Button
        label={total > 0 ? t('search:offers', { count: total }) : t('search:offers_zero')}
        size="lg"
        block
        loading={preview.isLoading}
        onPress={() => router.back()}
        style={{ marginBottom: theme.spacing.lg }}
        testID="apply-filters"
      />
    </Screen>
  );
}
