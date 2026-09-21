import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';

import { authApi } from '../../api/auth';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '../../api/client';
import { referenceApi } from '../../api/reference';
import { Button, Chip, Input, Screen, Text } from '../../components';
import { useTheme } from '../../theme';

/**
 * The dialling prefix, so a seller types the number the way they say it out
 * loud rather than in international form.
 *
 * The open markets come from the API, so opening one adds its prefix here
 * without an app release. This is only what to show before that answer
 * arrives, and on a phone with no connection.
 */
const FALLBACK_PREFIXES = [{ code: 'MK', prefix: '+389' }];

const schema = z.object({
  phone: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function PhoneScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common']);

  // Set when something sent them here — selling a car, messaging a seller,
  // calling one. Saying which is the difference between a demand and an
  // explanation, and it is the only reason they are looking at this screen.
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const why = reason ? t(`auth:why.${reason}`, { defaultValue: '' }) : '';

  const markets = useQuery({
    queryKey: ['countries'],
    queryFn: referenceApi.countries,
    staleTime: 60 * 60 * 1000,
  });

  const prefixes = (markets.data ?? []).length
    ? (markets.data ?? []).map((country) => ({ code: country.code, prefix: country.phone_prefix }))
    : FALLBACK_PREFIXES;

  const [chosen, setChosen] = useState<string | null>(null);
  const prefix = prefixes.find((item) => item.code === chosen) ?? prefixes[0];
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
          {why || t('auth:phone_subtitle')}
        </Text>
      </View>

      {/* One open market needs no chooser: the field carries its prefix. */}
      {prefixes.length > 1 ? (
        <>
          <Text variant="label" tone="muted" style={{ marginTop: theme.spacing.xxl }}>
            {t('auth:country_label')}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.xs,
              marginTop: theme.spacing.sm,
            }}
          >
            {prefixes.map((item) => (
              <Chip
                key={item.code}
                label={`${t(`search:country.${item.code}`, item.code)} ${item.prefix}`}
                selected={item.code === prefix.code}
                onPress={() => setChosen(item.code)}
                testID={`prefix-${item.code}`}
              />
            ))}
          </View>
        </>
      ) : null}

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

      {/* The way out. Everything a buyer does before contacting anybody works
          without an account, so nobody is made to hand over a number to look
          around — and what they keep while browsing follows them onto the
          account if they do sign in later. */}
      <Button
        label={t('auth:browse_instead')}
        variant="ghost"
        size="lg"
        block
        onPress={() => router.replace('/(tabs)/home')}
        style={{ marginTop: theme.spacing.sm }}
        testID="browse-instead"
      />

      <Text variant="caption" tone="subtle" style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}>
        {t('auth:terms')}
      </Text>
    </Screen>
  );
}
