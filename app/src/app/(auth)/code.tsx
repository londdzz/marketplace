import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';

import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Input, Screen, Text } from '../../components';
import { useTheme } from '../../theme';

const RESEND_SECONDS = 60;

export default function CodeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  const { phone, prefix } = useLocalSearchParams<{ phone: string; prefix: string }>();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const codeLength = 6;
  const submitted = useRef(false);

  // Counts down to when another code may be asked for, which mirrors the limit
  // the API enforces anyway.
  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function verify(value: string) {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFailure(null);

    try {
      const session = await authApi.verifyOtp(
        phone ?? '',
        value,
        Platform.OS === 'web' ? 'web' : Platform.OS,
        prefix,
      );

      await signIn(session);
      router.replace('/(tabs)/home');
    } catch (error) {
      setCode('');
      submitted.current = false;
      setFailure(error instanceof ApiError ? error.message : t('auth:invalid_code'));
    } finally {
      setSubmitting(false);
    }
  }

  function onChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, codeLength);
    setCode(digits);

    // Submit as soon as the last digit lands, so nobody hunts for a button
    // after typing a code they just read off a notification.
    if (digits.length === codeLength && !submitted.current) {
      submitted.current = true;
      void verify(digits);
    }
  }

  async function resend() {
    setFailure(null);
    setSecondsLeft(RESEND_SECONDS);

    try {
      await authApi.requestOtp(phone ?? '', prefix);
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : t('common:retry'));
    }
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: theme.spacing.xxxl }}>
        <Text variant="display">{t('auth:code_title')}</Text>
        <Text variant="body" tone="muted" style={{ marginTop: theme.spacing.sm }}>
          {t('auth:code_subtitle', { phone: `${prefix ?? ''} ${phone ?? ''}`.trim() })}
        </Text>
      </View>

      <Input
        label={t('auth:code_label')}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={codeLength}
        value={code}
        onChangeText={onChange}
        error={failure ?? undefined}
        containerStyle={{ marginTop: theme.spacing.xxl }}
        style={{ letterSpacing: 8, fontSize: 22 }}
        testID="code-input"
      />

      <Button
        label={t('auth:verify')}
        size="lg"
        block
        loading={submitting}
        disabled={code.length !== codeLength}
        onPress={() => verify(code)}
        style={{ marginTop: theme.spacing.xl }}
        testID="verify"
      />

      <View style={{ alignItems: 'center', marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
        {secondsLeft > 0 ? (
          <Text variant="meta" tone="subtle">
            {t('auth:resend_in', { seconds: secondsLeft })}
          </Text>
        ) : (
          <Pressable onPress={resend} accessibilityRole="button">
            <Text variant="meta" tone="accent">
              {t('auth:resend')}
            </Text>
          </Pressable>
        )}

        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text variant="meta" tone="muted">
            {t('auth:change_number')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
