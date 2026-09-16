import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { referenceApi } from '../../api/reference';
import { Chip, Input, Text } from '../../components';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

const MAX_LENGTH = 5000;

export default function SellDescriptionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'listing']);
  const { draft, save } = useSell();

  // The closed vocabularies live in the API, which validates against them, so
  // the app asks rather than keeping its own copy to drift out of date.
  const vocabularies = useQuery({
    queryKey: ['vocabularies'],
    queryFn: referenceApi.vocabularies,
    staleTime: 60 * 60 * 1000,
  });

  const [description, setDescription] = useState(draft?.description ?? '');
  const [features, setFeatures] = useState<string[]>(draft?.features ?? []);

  const toggle = (feature: string) =>
    setFeatures((current) =>
      current.includes(feature)
        ? current.filter((candidate) => candidate !== feature)
        : [...current, feature],
    );

  const onContinue = async () => {
    const saved = await save({
      description: description.trim() === '' ? null : description.trim(),
      features,
    });

    if (saved) {
      router.push(pathTo('review'));
    }
  };

  return (
    <SellStep
      screen="description"
      title={t('sell:description')}
      hint={t('sell:description_hint')}
      onContinue={() => void onContinue()}
    >
      <Input
        value={description}
        onChangeText={(next) => setDescription(next.slice(0, MAX_LENGTH))}
        placeholder={t('sell:description_placeholder')}
        multiline
        numberOfLines={6}
        style={{ minHeight: 120, textAlignVertical: 'top' }}
        hint={t('sell:characters_left', { count: MAX_LENGTH - description.length })}
        testID="description-input"
      />

      <Text variant="title" style={{ marginTop: theme.spacing.xxl }}>
        {t('sell:features')}
      </Text>
      <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xxs }}>
        {t('sell:features_hint')}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.md,
        }}
      >
        {(vocabularies.data?.features ?? []).map((feature) => (
          <Chip
            key={feature}
            label={t(`listing:feature.${feature}`, feature)}
            checkable
            selected={features.includes(feature)}
            onPress={() => toggle(feature)}
            testID={`feature-${feature}`}
          />
        ))}
      </View>
    </SellStep>
  );
}
