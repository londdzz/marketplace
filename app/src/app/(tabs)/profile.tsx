import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { authApi } from '../../api/auth';
import { referenceApi } from '../../api/reference';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Input, ListGroup, OptionRow, Screen, Text, ToggleRow } from '../../components';
import i18n, { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type Language } from '../../i18n';
import { CreditsSheet } from '../../sell/CreditsSheet';
import { useCredits } from '../../sell/credits';
import { useTheme } from '../../theme';

export default function ProfileTab() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['profile', 'sell', 'common']);
  const { user, apply, signOut, deleteAccount } = useAuth();

  const credits = useCredits();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  const [name, setName] = useState(user?.display_name ?? '');
  const [dealerName, setDealerName] = useState(user?.dealer_name ?? '');
  const [isDealer, setIsDealer] = useState(user?.seller_type === 'dealer');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const country = countries.data?.find((entry) => entry.code === user?.country_code);

  const patch = async (changes: Parameters<typeof authApi.updateMe>[0]) => {
    setSaving(true);
    setFailure(null);
    setFieldErrors({});

    try {
      apply(await authApi.updateMe(changes));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      // The API's own message, on the field that caused it.
      const body = (error as { body?: { errors?: Record<string, string[]> } }).body;

      if (body?.errors) {
        setFieldErrors(
          Object.fromEntries(Object.entries(body.errors).map(([key, list]) => [key, list[0]])),
        );
      }

      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  /** The app switches straight away; the account remembers for next time. */
  const chooseLanguage = async (language: Language) => {
    await i18n.changeLanguage(language);
    await patch({ preferred_language: language });
  };

  const section = { marginTop: theme.spacing.xxl };

  return (
    <Screen flush edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingHorizontal: theme.screenPadding,
          paddingVertical: theme.spacing.md,
        }}
      >
        <Button
          label=""
          icon="chevron-back"
          variant="ghost"
          size="sm"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          testID="profile-back"
          style={{ paddingHorizontal: theme.spacing.xs }}
        />
        <Text variant="title">{t('profile:title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.screenPadding,
          paddingBottom: theme.spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Who this account is. The phone number is the login and cannot move. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.accentMuted,
            }}
          >
            <Ionicons name="person" size={26} color={theme.colors.accent} />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {user?.display_name || t('profile:no_name')}
            </Text>
            <Text variant="meta" tone="muted">
              {user?.phone ?? ''}
            </Text>
            {country ? (
              <Text variant="caption" tone="muted">
                {t(`search:country.${country.code}`, country.code)}
                {user?.city ? ` · ${user.city.name}` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Credits, because this is where a seller looks for them. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginTop: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Ionicons name="pricetag" size={20} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">
              {t('sell:credits_balance', { count: credits.data?.balance ?? 0 })}
            </Text>
            <Text variant="caption" tone="muted">
              {t('sell:credits_body')}
            </Text>
          </View>
          <Button
            label={t('profile:buy_credits')}
            size="sm"
            variant="secondary"
            onPress={() => setSheetOpen(true)}
            testID="profile-credits"
          />
        </View>

        <Text variant="title" style={section}>
          {t('profile:details')}
        </Text>

        <Input
          label={t('profile:display_name')}
          value={name}
          onChangeText={setName}
          placeholder={t('profile:display_name_placeholder')}
          error={fieldErrors.display_name}
          containerStyle={{ marginTop: theme.spacing.md }}
          testID="profile-name"
        />

        <View style={{ marginTop: theme.spacing.md }}>
          <ToggleRow
            label={t('profile:dealer')}
            hint={t('profile:dealer_hint')}
            value={isDealer}
            onValueChange={setIsDealer}
            testID="profile-dealer"
          />
        </View>

        {isDealer ? (
          <Input
            label={t('profile:dealer_name')}
            value={dealerName}
            onChangeText={setDealerName}
            placeholder={t('profile:dealer_name_placeholder')}
            error={fieldErrors.dealer_name}
            containerStyle={{ marginTop: theme.spacing.md }}
            testID="profile-dealer-name"
          />
        ) : null}

        <Button
          label={saved ? t('profile:saved') : t('common:save')}
          block
          loading={saving}
          icon={saved ? 'checkmark' : undefined}
          style={{ marginTop: theme.spacing.md }}
          onPress={() =>
            void patch({
              display_name: name.trim() === '' ? null : name.trim(),
              seller_type: isDealer ? 'dealer' : 'private',
              dealer_name: isDealer ? (dealerName.trim() === '' ? null : dealerName.trim()) : null,
            })
          }
          testID="profile-save"
        />

        {failure ? (
          <Text variant="meta" tone="danger" style={{ marginTop: theme.spacing.sm }}>
            {failure}
          </Text>
        ) : null}

        <Text variant="title" style={section}>
          {t('profile:language')}
        </Text>
        <ListGroup style={{ marginTop: theme.spacing.md }} inset={theme.spacing.lg}>
          {SUPPORTED_LANGUAGES.map((language) => (
            <OptionRow
              key={language}
              flat
              label={LANGUAGE_NAMES[language]}
              selected={i18n.language === language}
              onPress={() => void chooseLanguage(language)}
              testID={`language-${language}`}
            />
          ))}
        </ListGroup>

        <Text variant="title" style={section}>
          {t('profile:account')}
        </Text>

        <Button
          label={t('profile:sign_out')}
          icon="log-out-outline"
          variant="secondary"
          block
          disabled={busy}
          style={{ marginTop: theme.spacing.md }}
          onPress={() => {
            setBusy(true);
            void signOut().finally(() => setBusy(false));
          }}
          testID="sign-out"
        />

        {/* Apple requires deleting an account to be possible from inside the
            app. It asks once, says plainly what goes, and cannot be undone. */}
        <View
          style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            backgroundColor: theme.colors.dangerMuted,
          }}
        >
          <Text variant="bodyStrong" style={{ color: theme.colors.danger }}>
            {t('profile:delete_title')}
          </Text>
          <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xs }}>
            {t('profile:delete_body')}
          </Text>

          {confirmingDelete ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
              <Button
                label={t('common:cancel')}
                variant="secondary"
                style={{ flex: 1 }}
                disabled={busy}
                onPress={() => setConfirmingDelete(false)}
              />
              <Button
                label={t('profile:delete_confirm')}
                variant="danger"
                style={{ flex: 1 }}
                loading={busy}
                onPress={() => {
                  setBusy(true);
                  void deleteAccount()
                    .catch((error) =>
                      setFailure(error instanceof Error ? error.message : String(error)),
                    )
                    .finally(() => setBusy(false));
                }}
                testID="delete-confirm"
              />
            </View>
          ) : (
            <Button
              label={t('profile:delete_account')}
              variant="outline"
              destructive
              block
              style={{ marginTop: theme.spacing.md }}
              onPress={() => setConfirmingDelete(true)}
              testID="delete-account"
            />
          )}
        </View>

        <Text variant="caption" tone="subtle" style={[styles.version, { marginTop: theme.spacing.xl }]}>
          vetura {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>

      <CreditsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onGranted={() => setSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  version: {
    textAlign: 'center',
  },
});
