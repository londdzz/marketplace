import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { referenceApi } from '../../api/reference';
import { OptionRow, Text } from '../../components';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

/**
 * The shape the car is, confirmed rather than asked from nothing.
 *
 * Picking a model already gives the listing the shape that model is usually
 * built in, so most sellers arrive here with the answer chosen and press
 * Continue. It has to be askable, though, because our model list names ranges
 * and not variants: a Passat Variant is an estate and the model called it a
 * saloon, and estates are half the cars in the region.
 *
 * The list comes from the API's own vocabulary, so a shape added there appears
 * here without the app being rebuilt.
 */
export default function SellShapeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'listing', 'common']);
  const { draft, save } = useSell();

  const vocabularies = useQuery({ queryKey: ['vocabularies'], queryFn: referenceApi.vocabularies });

  const [selected, setSelected] = useState<string | null>(draft?.body_type ?? null);

  const onContinue = async () => {
    if (!selected) {
      return;
    }

    if (await save({ body_type: selected })) {
      router.push(pathTo('photos'));
    }
  };

  return (
    <SellStep
      screen="shape"
      title={t('sell:shape')}
      canContinue={selected !== null}
      onContinue={() => void onContinue()}
    >
      <Text variant="meta" tone="muted" style={{ marginBottom: theme.spacing.md }}>
        {t('sell:shape_hint')}
      </Text>

      <View style={{ gap: theme.spacing.sm }}>
        {(vocabularies.data?.body_types ?? []).map((shape) => (
          <OptionRow
            key={shape}
            label={t(`listing:body_type.${shape}`, shape)}
            selected={selected === shape}
            onPress={() => setSelected(shape)}
            testID={`shape-${shape}`}
          />
        ))}
      </View>
    </SellStep>
  );
}
