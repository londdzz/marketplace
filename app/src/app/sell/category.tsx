import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { referenceApi } from '../../api/reference';
import type { VehicleType } from '../../api/types';
import { OptionRow, Text } from '../../components';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

/** The mark beside each answer, so the choice reads before it is read. */
const ICONS: Record<VehicleType, string> = {
  car: 'car-sport-outline',
  motorcycle: 'bicycle-outline',
};

/**
 * What is being sold, which is the first thing the flow has to know.
 *
 * Every screen after this one depends on it: the makes offered, the models
 * under them, and the shapes at the shape step are three different sets for a
 * car and for a motorcycle. Asking later would mean asking a seller to pick a
 * Volkswagen and then telling them it cannot be a motorcycle.
 *
 * The answers come from the API's own list of kinds rather than a copy kept
 * here, the same way every other closed vocabulary in the flow does.
 */
export default function SellCategoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'common']);
  const { draft, save } = useSell();

  const vocabularies = useQuery({
    queryKey: ['vocabularies'],
    queryFn: referenceApi.vocabularies,
    staleTime: 60 * 60 * 1000,
  });

  const [selected, setSelected] = useState<VehicleType>(draft?.vehicle_type ?? 'car');

  const onContinue = async () => {
    // Changing it lets the make and the model go with it, because neither
    // survives the move: Volkswagen sells no motorcycles and an MT-07 is not
    // a car. The shape goes too, since the vocabularies do not overlap.
    const changed = (draft?.vehicle_type ?? 'car') !== selected;
    const reset = changed && draft ? { make_id: undefined, model_id: null, body_type: null } : {};

    if (await save({ vehicle_type: selected, ...reset })) {
      router.push(pathTo('make'));
    }
  };

  return (
    <SellStep
      screen="category"
      title={t('sell:category')}
      canContinue
      onContinue={() => void onContinue()}
    >
      <Text variant="meta" tone="muted" style={{ marginBottom: theme.spacing.md }}>
        {t('sell:category_hint')}
      </Text>

      <View style={{ gap: theme.spacing.sm }}>
        {(vocabularies.data?.vehicle_types ?? ['car', 'motorcycle']).map((type) => (
          <OptionRow
            key={type}
            icon={ICONS[type] as never}
            // Singular here, plural on the search switch: one thing is being
            // sold, and a whole catalogue is being browsed.
            label={t(`sell:kind_${type}`)}
            selected={selected === type}
            onPress={() => setSelected(type)}
            testID={`sell-category-${type}`}
          />
        ))}
      </View>
    </SellStep>
  );
}
