import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip, Input, Text } from '../../components';
import { formatKm } from '../../format';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

/** The round numbers people actually say, so most sellers type nothing. */
const SHORTCUTS = [10_000, 50_000, 100_000, 150_000, 200_000, 300_000];

const MAX_KM = 2_000_000;

export default function SellMileageScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('sell');
  const { draft, save } = useSell();

  const [value, setValue] = useState(draft?.mileage_km !== null && draft?.mileage_km !== undefined ? String(draft.mileage_km) : '');

  const km = value === '' ? null : Number(value);
  const valid = km !== null && Number.isFinite(km) && km >= 0 && km <= MAX_KM;

  const onContinue = async () => {
    if (!valid) {
      return;
    }

    if (await save({ mileage_km: km })) {
      router.push(pathTo('fuel'));
    }
  };

  return (
    <SellStep
      screen="mileage"
      title={t('mileage')}
      hint={t('mileage_hint')}
      canContinue={valid}
      onContinue={() => void onContinue()}
    >
      <Input
        value={value}
        onChangeText={(next) => setValue(next.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        inputVariant="price"
        autoFocus
        error={km !== null && !valid ? t('mileage_too_high') : undefined}
        hint={valid && km !== null ? formatKm(km) : undefined}
        testID="mileage-input"
      />

      <Text variant="heading" tone="muted" style={{ marginTop: theme.spacing.xl }}>
        {t('quick_pick')}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        {SHORTCUTS.map((shortcut) => (
          <Chip
            key={shortcut}
            label={formatKm(shortcut)}
            selected={km === shortcut}
            onPress={() => setValue(String(shortcut))}
            testID={`mileage-${shortcut}`}
          />
        ))}
      </View>
    </SellStep>
  );
}
