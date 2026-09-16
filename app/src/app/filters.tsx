import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { referenceApi } from '../api/reference';
import type { SearchFilters, SortOption } from '../api/types';
import { Button, Chip, Input, Screen, Text } from '../components';
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

  const [filters, setFilters] = useState<SearchFilters>({});
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  const toggle = <T,>(list: T[] | undefined, value: T): T[] | undefined => {
    const next = (list ?? []).includes(value)
      ? (list ?? []).filter((item) => item !== value)
      : [...(list ?? []), value];

    return next.length > 0 ? next : undefined;
  };

  const section = { marginTop: theme.spacing.xxl };
  const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing.xs, marginTop: theme.spacing.sm };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.spacing.md }}>
        <Text variant="title">{t('search:filters')}</Text>
        <Button label={t('search:clear')} variant="ghost" size="sm" onPress={() => setFilters({})} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing.xxxl }}>
        <Text variant="label" tone="muted" style={section}>
          {t('search:countries')}
        </Text>
        <View style={row}>
          {(countries.data ?? []).map((country) => (
            <Chip
              key={country.code}
              label={country.code}
              selected={(filters.countries ?? []).includes(country.code)}
              onPress={() => setFilters((f) => ({ ...f, countries: toggle(f.countries, country.code) }))}
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
            onChangeText={(value) => setFilters((f) => ({ ...f, priceMin: value ? Number(value) : undefined }))}
          />
          <Input
            placeholder={t('search:max')}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
            onChangeText={(value) => setFilters((f) => ({ ...f, priceMax: value ? Number(value) : undefined }))}
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
            onChangeText={(value) => setFilters((f) => ({ ...f, yearMin: value ? Number(value) : undefined }))}
          />
          <Input
            placeholder={t('search:max')}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
            onChangeText={(value) => setFilters((f) => ({ ...f, yearMax: value ? Number(value) : undefined }))}
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
              onPress={() => setFilters((f) => ({ ...f, fuel: toggle(f.fuel, fuel) }))}
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
              onPress={() =>
                setFilters((f) => ({ ...f, transmission: f.transmission === gearbox ? undefined : gearbox }))
              }
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
              onPress={() => setFilters((f) => ({ ...f, sort }))}
            />
          ))}
        </View>
      </ScrollView>

      <Button
        label={t('search:apply')}
        size="lg"
        block
        onPress={() => router.back()}
        style={{ marginBottom: theme.spacing.lg }}
      />
    </Screen>
  );
}
