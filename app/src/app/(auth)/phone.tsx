import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';

import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { Button, Chip, Input, Screen, Text } from '../../components';
import { useTheme } from '../../theme';

/**
 * The dialling prefixes of the five markets, so a seller types the number the
 * way they say it out loud rather than in international form.
 */
const PREFIXES = [
  { code: 'XK', prefix: '+383', label: 'Kosovë' },
  { code: 'AL', prefix: '+355', label: 'Shqipëri' },
  { code: 'MK', prefix: '+389', label: 'Македонија' },
  { code: 'RS', prefix: '+381', label: 'Србија' },
  { code: 'BG', prefix: '+359', label: 'България' },
];

const schema = z.object({
  phone: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function PhoneScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common']);

  const [prefix, setPrefix] = useState(PREFIXES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
    mode: 'onSubmit',
  });

  const onSubmit = handleSubmit(async ({ phone }) => {
    setSubmitting(true);
    setFailure(null);

    try {
      await authApi.requestOtp(phone, prefix.prefix);

      router.push({
        pathname: '/(auth)/code',
        params: { phone, prefix: prefix.prefix },
      });
    } catch (error) {
      // The API has already translated its message into this language.
      setFailure(
        error instanceof ApiError
          ? (error.fieldError('phone') ?? error.message)
          : t('auth:invalid_phone'),
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen scroll>
      <View style={{ marginTop: theme.spacing.xxxl }}>
        <Text variant="display">{t('auth:phone_title')}</Text>
        <Text variant="body" tone="muted" style={{ marginTop: theme.spacing.sm }}>
          {t('auth:phone_subtitle')}
        </Text>
      </View>

      <Text variant="label" tone="muted" style={{ marginTop: theme.spacing.xxl }}>
        {t('auth:country_label')}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
        {PREFIXES.map((item) => (
          <Chip
            key={item.code}
            label={`${item.label} ${item.prefix}`}
            selected={item.code === prefix.code}
            onPress={() => setPrefix(item)}
            testID={`prefix-${item.code}`}
          />
        ))}
      </View>

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('auth:phone_label')}
            prefix={prefix.prefix}
            placeholder={t('auth:phone_placeholder')}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={failure ?? (formState.errors.phone ? t('auth:invalid_phone') : undefined)}
            containerStyle={{ marginTop: theme.spacing.xl }}
            testID="phone-input"
          />
        )}
      />

      <Button
        label={t('auth:send_code')}
        size="lg"
        block
        loading={submitting}
        onPress={onSubmit}
        style={{ marginTop: theme.spacing.xl }}
        testID="send-code"
      />

      <Text variant="caption" tone="subtle" style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}>
        {t('auth:terms')}
      </Text>
    </Screen>
  );
}
