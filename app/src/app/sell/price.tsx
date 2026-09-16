import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { referenceApi } from '../../api/reference';
import { Input, Text, ToggleRow } from '../../components';
import { formatLocal } from '../../format';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { SHOW_LOCAL_CURRENCY } from '../../market';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

const MAX_PRICE = 9_999_999;

export default function SellPriceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'listing']);
  const { draft, save } = useSell();
  const { byCurrency } = useExchangeRates();

  const countries = useQuery({
    queryKey: ['countries'],
    queryFn: referenceApi.countries,
    staleTime: 60 * 60 * 1000,
  });

  const [value, setValue] = useState(draft?.price_eur ? String(Math.round(Number(draft.price_eur))) : '');
  const [negotiable, setNegotiable] = useState(draft?.price_negotiable ?? false);
  const [customs, setCustoms] = useState(draft?.customs_cleared ?? false);

  const price = value === '' ? null : Number(value);
  const valid = price !== null && price > 0 && price <= MAX_PRICE;

  // The seller's own market, so the euro price is shown in money they know.
  const currency =
    countries.data?.find((country) => country.code === draft?.country_code)?.currency ?? 'EUR';
  const local =
    valid && SHOW_LOCAL_CURRENCY ? formatLocal(price, currency, byCurrency[currency]) : undefined;

  const onContinue = async () => {
    if (!valid) {
      return;
    }

    const saved = await save({
      price_eur: price,
      price_negotiable: negotiable,
      customs_cleared: customs,
    });

    if (saved) {
      router.push(pathTo('location'));
    }
  };

  return (
    <SellStep
      screen="price"
      title={t('sell:price')}
      hint={t('sell:price_hint')}
      canContinue={valid}
      onContinue={() => void onContinue()}
    >
      <Input
        value={value}
        onChangeText={(next) => setValue(next.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        prefix="€"
        inputVariant="price"
        autoFocus
        error={price !== null && !valid ? t('sell:price_invalid') : undefined}
        testID="price-input"
      />

      {local ? (
        <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.sm }}>
          {t('sell:price_local', { amount: local })}
        </Text>
      ) : null}

      <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        <ToggleRow
          label={t('sell:negotiable')}
          hint={t('sell:negotiable_hint')}
          value={negotiable}
          onValueChange={setNegotiable}
          testID="price-negotiable"
        />
        <ToggleRow
          label={t('sell:customs')}
          hint={t('sell:customs_hint')}
          value={customs}
          onValueChange={setCustoms}
          testID="price-customs"
        />
      </View>
    </SellStep>
  );
}
