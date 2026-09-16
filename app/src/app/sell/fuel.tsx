import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { OptionRow } from '../../components';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

const FUELS: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'diesel', icon: 'water-outline' },
  { key: 'petrol', icon: 'flame-outline' },
  { key: 'hybrid', icon: 'git-merge-outline' },
  { key: 'electric', icon: 'flash-outline' },
  { key: 'lpg', icon: 'cube-outline' },
];

export default function SellFuelScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'listing']);
  const { draft, save } = useSell();

  const [selected, setSelected] = useState<string | null>(draft?.fuel ?? null);

  const onContinue = async () => {
    if (!selected) {
      return;
    }

    if (await save({ fuel: selected })) {
      router.push(pathTo('transmission'));
    }
  };

  return (
    <SellStep
      screen="fuel"
      title={t('sell:fuel')}
      canContinue={selected !== null}
      onContinue={() => void onContinue()}
    >
      <View style={{ gap: theme.spacing.sm }}>
        {FUELS.map((fuel) => (
          <OptionRow
            key={fuel.key}
            icon={fuel.icon}
            label={t(`listing:fuel.${fuel.key}`)}
            selected={selected === fuel.key}
            onPress={() => setSelected(fuel.key)}
            testID={`fuel-${fuel.key}`}
          />
        ))}
      </View>
    </SellStep>
  );
}
