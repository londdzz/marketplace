import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { Button, CodeField, Screen, Text, Wordmark } from '../../components';
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
  /**
   * True when the API refused the code — wrong, expired, or too many tries.
   * A connection that simply failed is not the same thing and must not throw
   * away six digits somebody has already typed.
   */
  const [refused, setRefused] = useState(false);
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
    setRefused(false);

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
      const answered = error instanceof ApiError;

      setRefused(answered);
      submitted.current = false;

      // Clear only when the code itself was wrong. A dropped connection
      // leaves the digits alone, and the retry below picks them back up.
      if (answered) {
        setCode('');
      }

      setFailure(answered ? error.message : t('common:error_loading'));
    } finally {
      setSubmitting(false);
    }
  }

  function onChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, codeLength);

    setCode(digits);

    // Editing after a refusal clears the red, so the boxes stop shouting
    // about a code that is no longer on screen.
    if (failure) {
      setFailure(null);
      setRefused(false);
    }

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
    <Screen scroll contentStyle={{ flexGrow: 1 }}>
      <View style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
        <Wordmark size={26} />
      </View>

      <View style={{ marginTop: theme.spacing.xxl }}>
        <Text variant="display">{t('auth:code_title')}</Text>
        <Text variant="body" tone="muted" style={{ marginTop: theme.spacing.sm }}>
          {t('auth:code_subtitle', { phone: `${prefix ?? ''} ${phone ?? ''}`.trim() })}
        </Text>
      </View>

      <View style={{ marginTop: theme.spacing.xxl }}>
        <CodeField
          value={code}
          onChangeText={onChange}
          length={codeLength}
          error={refused}
          disabled={submitting}
          autoFocus
          testID="code-input"
        />
      </View>

      {/* There is no Confirm button: the code is checked the moment the last
          digit lands. Nobody should have to hunt for a button after typing
          something they just read off a notification, and a button that only
          ever does what has already happened is a button that does nothing.
          This row is what replaces it — the state of the check, in the space
          the button used to take, so the screen never jumps. */}
      <View
        style={{
          height: 48,
          marginTop: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {submitting ? (
          <ActivityIndicator color={theme.colors.accent} testID="code-checking" />
        ) : failure ? (
          <Text variant="meta" tone="danger" style={{ textAlign: 'center' }}>
            {failure}
          </Text>
        ) : null}
      </View>

      {/* Only when the code never reached the API. A refused code is cleared
          and retyped; this is for the times nothing was wrong with it. */}
      {failure && !refused && code.length === codeLength ? (
        <Button
          label={t('common:retry')}
          size="lg"
          block
          loading={submitting}
          onPress={() => verify(code)}
          testID="verify"
        />
      ) : null}

      <View
        style={{
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: theme.spacing.xxl,
          gap: theme.spacing.md,
        }}
      >
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
