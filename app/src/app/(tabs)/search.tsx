import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { listingsApi } from '../../api/listings';
import { referenceApi } from '../../api/reference';
import {
  AccordionCard,
  Button,
  Chip,
  Input,
  ListGroup,
  MakeTile,
  Screen,
  SearchField,
  TabHeader,
  Text,
} from '../../components';
import { useFilters } from '../../search/FiltersProvider';
import { useTheme } from '../../theme';

const FUELS = ['diesel', 'petrol', 'hybrid', 'electric', 'lpg'] as const;
const GEARBOXES = ['manual', 'automatic'] as const;

/**
 * The search tab is where a search is built, not where results are read.
 *
 * Everything is on one screen: the free-text box, the makes, and the sections
 * that open as they are needed. The button along the bottom always says how
 * many cars the current search would return, so nobody has to run it to find
 * out whether it is worth running.
 */
export default function SearchTab() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['search', 'listing', 'home', 'common']);
  const { filters, set, toggle, reset, count } = useFilters();

  const makes = useQuery({ queryKey: ['makes'], queryFn: referenceApi.makes });
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  // One cheap request that asks only how many, so the count on the button is
  // always the count the results will show.
  const preview = useQuery({
    queryKey: ['listing-count', filters],
    queryFn: () => listingsApi.search({ ...filters }, 1),
  });

  const total = preview.data?.meta.total ?? 0;
  const popular = (makes.data ?? []).filter((make) => make.popular).slice(0, 8);

  const columns = 4;
  const gridGap = theme.spacing.sm;
  // The card's own padding and its hairline border both eat into the row, so
  // they are taken off before the tiles are measured.
  const innerWidth = width - theme.screenPadding * 2 - theme.spacing.lg * 2 - 6;
  const tileWidth = Math.floor((innerWidth - gridGap * (columns - 1)) / columns);

  const row = {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  };

  return (
    <Screen flush edges={['top']}>
      <TabHeader />

      <View style={{ paddingHorizontal: theme.screenPadding }}>
        <SearchField
          placeholder={t('search:anything')}
          value={filters.q ?? ''}
          onChangeText={(value) => set({ q: value })}
          onReset={reset}
          testID="search-input"
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.screenPadding,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AccordionCard
          title={t('search:make_model')}
          icon="car-sport-outline"
          defaultOpen
          testID="section-make"
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}>
            {popular.map((make) => (
              <MakeTile
                key={make.id}
                name={make.name}
                logoUrl={make.logo_url}
                width={tileWidth}
                selected={filters.makeId === make.id}
                onPress={() => set({ makeId: filters.makeId === make.id ? undefined : make.id })}
                testID={`make-${make.id}`}
              />
            ))}
          </View>

          <Button
            label={t('search:all_makes')}
            variant="secondary"
            size="sm"
            block
            style={{ marginTop: theme.spacing.md }}
            onPress={() => router.push('/filters')}
            testID="all-makes"
          />
        </AccordionCard>

        <ListGroup>
          <AccordionCard
            bare
            title={t('search:condition')}
            subtitle={t('search:condition_sub')}
            icon="calendar-outline"
            testID="section-condition"
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Input
                label={t('search:year')}
                placeholder={t('search:min')}
                keyboardType="number-pad"
                containerStyle={{ flex: 1 }}
                value={filters.yearMin ? String(filters.yearMin) : ''}
                onChangeText={(value) => set({ yearMin: value ? Number(value) : undefined })}
              />
              <Input
                label=" "
                placeholder={t('search:max')}
                keyboardType="number-pad"
                containerStyle={{ flex: 1 }}
                value={filters.yearMax ? String(filters.yearMax) : ''}
                onChangeText={(value) => set({ yearMax: value ? Number(value) : undefined })}
              />
            </View>

            <Input
              label={t('search:mileage')}
              placeholder={t('search:max')}
              keyboardType="number-pad"
              containerStyle={{ marginTop: theme.spacing.md }}
              value={filters.mileageMax ? String(filters.mileageMax) : ''}
              onChangeText={(value) => set({ mileageMax: value ? Number(value) : undefined })}
            />
          </AccordionCard>

          <AccordionCard
            bare
            title={t('search:financial')}
            subtitle={t('search:financial_sub')}
            icon="pricetag-outline"
            testID="section-price"
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
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
          </AccordionCard>

          <AccordionCard
            bare
            title={t('search:technical')}
            subtitle={t('search:technical_sub')}
            icon="build-outline"
            testID="section-technical"
          >
            <Text variant="label" tone="muted">
              {t('search:fuel')}
            </Text>
            <View style={row}>
              {FUELS.map((fuel) => (
                <Chip
                  key={fuel}
                  label={t(`listing:fuel.${fuel}`)}
                  checkable
                  selected={(filters.fuel ?? []).includes(fuel)}
                  onPress={() => toggle('fuel', fuel)}
                  testID={`fuel-${fuel}`}
                />
              ))}
            </View>

            <Text variant="label" tone="muted" style={{ marginTop: theme.spacing.lg }}>
              {t('search:transmission')}
            </Text>
            <View style={row}>
              {GEARBOXES.map((gearbox) => (
                <Chip
                  key={gearbox}
                  label={t(`listing:transmission.${gearbox}`)}
                  checkable
                  selected={filters.transmission === gearbox}
                  onPress={() =>
                    set({ transmission: filters.transmission === gearbox ? undefined : gearbox })
                  }
                />
              ))}
            </View>
          </AccordionCard>

          {/* One open market means nothing to choose between. The section comes
              back on its own as soon as the API returns a second country. */}
          {(countries.data ?? []).length > 1 ? (
          <AccordionCard
            bare
            title={t('search:location')}
            subtitle={
              filters.countries?.length
                ? filters.countries.map((code) => t(`search:country.${code}`, code)).join(', ')
                : t('search:location_any')
            }
            icon="location-outline"
            testID="section-location"
          >
            <Text variant="label" tone="muted">
              {t('search:countries')}
            </Text>
            <View style={row}>
              {(countries.data ?? []).map((country) => (
                <Chip
                  key={country.code}
                  label={t(`search:country.${country.code}`, country.code)}
                  checkable
                  selected={(filters.countries ?? []).includes(country.code)}
                  onPress={() => toggle('countries', country.code)}
                  testID={`country-${country.code}`}
                />
              ))}
            </View>
          </AccordionCard>
          ) : null}
        </ListGroup>
      </ScrollView>

      <View
        style={[
          styles.bar,
          {
            padding: theme.screenPadding,
            paddingBottom: theme.spacing.md,
            gap: theme.spacing.md,
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <Button
          label={count > 0 ? `${t('search:more_filters')} (${count})` : t('search:more_filters')}
          variant="secondary"
          icon="options-outline"
          style={{ flex: 1 }}
          onPress={() => router.push('/filters')}
          testID="more-filters"
        />
        <Button
          label={total > 0 ? t('search:offers', { count: total }) : t('search:offers_zero')}
          icon="search"
          style={{ flex: 1.3 }}
          loading={preview.isLoading}
          onPress={() => router.push('/results')}
          testID="show-offers"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
});
