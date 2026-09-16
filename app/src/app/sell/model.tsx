import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { referenceApi } from '../../api/reference';
import { Button, Input, OptionRow, Text } from '../../components';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

export default function SellModelScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'listing', 'common']);
  const { draft, save } = useSell();

  const makeId = draft?.make?.id;

  const models = useQuery({
    queryKey: ['models', makeId],
    queryFn: () => referenceApi.models(makeId as number),
    enabled: Boolean(makeId),
    staleTime: 60 * 60 * 1000,
  });

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(draft?.model?.id ?? null);
  const [variant, setVariant] = useState(draft?.variant ?? '');

  const matching = (models.data ?? []).filter((model) =>
    query.trim() ? model.name.toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  const onContinue = async () => {
    if (selected === null) {
      return;
    }

    const saved = await save({
      model_id: selected,
      variant: variant.trim() === '' ? null : variant.trim(),
    });

    if (saved) {
      router.push(pathTo('year'));
    }
  };

  return (
    <SellStep
      screen="model"
      title={t('sell:model')}
      hint={draft?.make?.name ?? undefined}
      canContinue={selected !== null}
      onContinue={() => void onContinue()}
    >
      <Input
        placeholder={t('sell:search_model')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        containerStyle={{ marginBottom: theme.spacing.lg }}
      />

      {models.isLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}

      {models.isError ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="meta" tone="danger">
            {t('common:error_loading')}
          </Text>
          <Button label={t('common:retry')} variant="secondary" onPress={() => void models.refetch()} />
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.sm }}>
        {matching.map((model) => (
          <OptionRow
            key={model.id}
            label={model.name}
            caption={model.body_type ? t(`listing:body_type.${model.body_type}`, model.body_type) : null}
            selected={selected === model.id}
            onPress={() => setSelected(model.id)}
            testID={`model-${model.id}`}
          />
        ))}
      </View>

      {!models.isLoading && matching.length === 0 ? (
        <Text variant="meta" tone="muted">
          {t('sell:no_models_found')}
        </Text>
      ) : null}

      {/* Optional, and clearly marked as such: most sellers know the trim,
          some do not, and nobody should be stopped here by it. */}
      <Input
        label={t('sell:variant')}
        hint={t('sell:variant_hint')}
        placeholder={t('sell:variant_placeholder')}
        value={variant}
        onChangeText={setVariant}
        containerStyle={{ marginTop: theme.spacing.xl }}
      />
    </SellStep>
  );
}
