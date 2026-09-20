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

const GEARBOXES: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'manual', icon: 'options-outline' },
  { key: 'automatic', icon: 'sync-outline' },
];

export default function SellTransmissionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'listing']);
  const { draft, save } = useSell();

  const [selected, setSelected] = useState<string | null>(draft?.transmission ?? null);

  const onContinue = async () => {
    if (!selected) {
      return;
    }

    if (await save({ transmission: selected })) {
      router.push(pathTo('shape'));
    }
  };

  return (
    <SellStep
      screen="transmission"
      title={t('sell:transmission')}
      canContinue={selected !== null}
      onContinue={() => void onContinue()}
    >
      <View style={{ gap: theme.spacing.sm }}>
        {GEARBOXES.map((gearbox) => (
          <OptionRow
            key={gearbox.key}
            icon={gearbox.icon}
            label={t(`listing:transmission.${gearbox.key}`)}
            selected={selected === gearbox.key}
            onPress={() => setSelected(gearbox.key)}
            testID={`transmission-${gearbox.key}`}
          />
        ))}
      </View>
    </SellStep>
  );
}
