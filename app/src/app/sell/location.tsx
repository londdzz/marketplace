import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { referenceApi } from '../../api/reference';
import { Button, Chip, Input, OptionRow, Text } from '../../components';
import { useAuth } from '../../auth/AuthProvider';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

export default function SellLocationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'search', 'common']);
  const { draft, save } = useSell();
  const { user } = useAuth();

  const countries = useQuery({
    queryKey: ['countries'],
    queryFn: referenceApi.countries,
    staleTime: 60 * 60 * 1000,
  });

  // The draft already carries the seller's own country, set when it was
  // opened, so this step usually only needs the town confirming.
  const [country, setCountry] = useState<string>(draft?.country_code ?? user?.country_code ?? 'XK');
  const [cityId, setCityId] = useState<number | null>(draft?.city?.id ?? null);
  const [query, setQuery] = useState('');

  const cities = useQuery({
    queryKey: ['cities', country],
    queryFn: () => referenceApi.cities(country),
    staleTime: 60 * 60 * 1000,
  });

  const matching = (cities.data ?? []).filter((city) =>
    query.trim() ? city.name.toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  const onContinue = async () => {
    if (cityId === null) {
      return;
    }

    if (await save({ country_code: country, city_id: cityId })) {
      router.push(pathTo('description'));
    }
  };

  return (
    <SellStep
      screen="location"
      title={t('sell:location')}
      hint={t('sell:location_hint')}
      canContinue={cityId !== null}
      onContinue={() => void onContinue()}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {(countries.data ?? []).map((entry) => (
          <Chip
            key={entry.code}
            label={t(`search:country.${entry.code}`, entry.code)}
            selected={country === entry.code}
            onPress={() => {
              setCountry(entry.code);
              // A city in the old country would fail the API's own check.
              setCityId(null);
            }}
            testID={`sell-country-${entry.code}`}
          />
        ))}
      </View>

      <Input
        placeholder={t('sell:search_city')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        containerStyle={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}
      />

      {cities.isLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}

      {cities.isError ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="meta" tone="danger">
            {t('common:error_loading')}
          </Text>
          <Button label={t('common:retry')} variant="secondary" onPress={() => void cities.refetch()} />
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.sm }}>
        {matching.map((city) => (
          <OptionRow
            key={city.id}
            label={city.name}
            selected={cityId === city.id}
            onPress={() => setCityId(city.id)}
            testID={`city-${city.id}`}
          />
        ))}
      </View>

      {!cities.isLoading && matching.length === 0 ? (
        <Text variant="meta" tone="muted">
          {t('sell:no_cities_found')}
        </Text>
      ) : null}
    </SellStep>
  );
}
