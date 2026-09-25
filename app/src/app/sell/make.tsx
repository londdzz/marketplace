import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';

import { referenceApi } from '../../api/reference';
import { Button, Input, ListGroup, MakeTile, OptionRow, Text } from '../../components';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

export default function SellMakeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['sell', 'common']);
  const { draft, save } = useSell();

  // A draft always knows what it is by the time this screen is reached, and the
  // list follows it: Vespa has no business on a car's make picker.
  const vehicleType = draft?.vehicle_type ?? 'car';

  const makes = useQuery({
    queryKey: ['makes', vehicleType],
    queryFn: () => referenceApi.makes(vehicleType),
    staleTime: 60 * 60 * 1000,
  });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(draft?.make?.id ?? null);

  const all = makes.data ?? [];

  const matching = useMemo(
    () =>
      query.trim()
        ? all.filter((make) => make.name.toLowerCase().includes(query.trim().toLowerCase()))
        : all,
    [all, query],
  );

  const popular = matching.filter((make) => make.popular);
  const rest = matching.filter((make) => !make.popular);

  // Four to a row, with the card padding and the gaps taken off first so the
  // tiles never wrap to three.
  const gap = theme.spacing.sm;
  const tile = Math.floor((width - theme.screenPadding * 2 - gap * 3) / 4);

  const onContinue = async () => {
    if (selected === null) {
      return;
    }

    // Changing the make invalidates whatever model was chosen before.
    const modelReset = draft?.make?.id !== selected ? { model_id: null } : {};
    const saved = await save({ make_id: selected, ...modelReset });

    if (saved) {
      router.push(pathTo('model'));
    }
  };

  return (
    <SellStep
      screen="make"
      title={t('sell:make')}
      canContinue={selected !== null}
      onContinue={() => void onContinue()}
    >
      <Input
        placeholder={t('sell:search_make')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        containerStyle={{ marginBottom: theme.spacing.lg }}
      />

      {makes.isLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}

      {makes.isError ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="meta" tone="danger">
            {t('common:error_loading')}
          </Text>
          <Button label={t('common:retry')} variant="secondary" onPress={() => void makes.refetch()} />
        </View>
      ) : null}

      {popular.length > 0 ? (
        <>
          <Text variant="label" tone="muted">
            {t('sell:popular_makes')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap,
              marginTop: theme.spacing.sm,
              marginBottom: theme.spacing.xl,
            }}
          >
            {popular.map((make) => (
              <MakeTile
                key={make.id}
                name={make.name}
                logoUrl={make.logo_url}
                width={tile}
                selected={selected === make.id}
                onPress={() => setSelected(make.id)}
                testID={`make-${make.id}`}
              />
            ))}
          </View>
        </>
      ) : null}

      {rest.length > 0 ? (
        <>
          <Text variant="label" tone="muted">
            {t('sell:all_makes')}
          </Text>
          <ListGroup style={{ marginTop: theme.spacing.sm }} inset={theme.spacing.lg}>
            {rest.map((make) => (
              <OptionRow
                key={make.id}
                flat
                logoUrl={make.logo_url}
                label={make.name}
                selected={selected === make.id}
                onPress={() => setSelected(make.id)}
                testID={`make-row-${make.id}`}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {!makes.isLoading && matching.length === 0 ? (
        <Text variant="meta" tone="muted">
          {t('sell:no_makes_found')}
        </Text>
      ) : null}
    </SellStep>
  );
}
