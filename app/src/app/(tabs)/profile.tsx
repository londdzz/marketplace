import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { authApi } from '../../api/auth';
import { referenceApi } from '../../api/reference';
import { useAuth } from '../../auth/AuthProvider';
import { Button, ListGroup, Screen, SettingRow, StackHeader, Text } from '../../components';
import i18n, { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type Language } from '../../i18n';
import { CreditsSheet } from '../../sell/CreditsSheet';
import { useCredits } from '../../sell/credits';
import { useTheme } from '../../theme';

export default function ProfileTab() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['profile', 'sell', 'tabs', 'common']);
  const { user, apply, signOut, deleteAccount } = useAuth();

  const credits = useCredits();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const country = countries.data?.find((entry) => entry.code === user?.country_code);
  const balance = credits.data?.balance ?? 0;

  const location = [user?.city?.name, country ? t(`search:country.${country.code}`, country.code) : null]
    .filter(Boolean)
    .join(', ');

  const chooseLanguage = async (language: Language) => {
    await i18n.changeLanguage(language);

    // A guest has no account to remember the choice on, so the switch simply
    // changes the app and there is nothing to save. It follows them onto the
    // account the first time they sign in, because the account takes the
    // device's language when it is created.
    if (!user) {
      return;
    }

    try {
      apply(await authApi.updateMe({ preferred_language: language }));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    }
  };

  const sectionLabel = {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  };

  return (
    <Screen flush edges={['top']}>
      <StackHeader fallback="/(tabs)/home" backTestID="profile-back" backLabel={t('common:back')} />

      <Text
        variant="title"
        style={{ paddingHorizontal: theme.screenPadding, paddingBottom: theme.spacing.md }}
      >
        {t('profile:title')}
      </Text>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.screenPadding,
          paddingBottom: theme.spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* A guest has no identity to show, so the card says where they stand
            and what signing in would change. Everything they have kept so far
            follows them onto the account, which is the part worth saying. */}
        {!user ? (
          <View
            style={{
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.accentBorder,
              backgroundColor: theme.colors.accentMuted,
            }}
            testID="profile-guest"
          >
            <Text variant="bodyStrong">{t('profile:guest_title')}</Text>
            <Text variant="meta" tone="muted">
              {t('profile:guest_body')}
            </Text>
            <Button
              label={t('common:sign_in')}
              block
              onPress={() => router.push('/(auth)/phone')}
              testID="profile-sign-in"
            />
          </View>
        ) : null}

        {/* Who this account is, and the one thing a seller checks most. */}
        {user ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/profile/edit')}
          testID="profile-identity"
          style={({ pressed }) => [
            styles.identity,
            {
              padding: theme.spacing.lg,
              gap: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
            },
          ]}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.accentMuted,
            }}
          >
            {user?.display_name?.trim() ? (
              <Text variant="bodyStrong" tone="accent">
                {user.display_name.trim().charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="person" size={22} color={theme.colors.accent} />
            )}
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {user?.display_name || t('profile:no_name')}
            </Text>
            <Text variant="meta" tone="muted">
              {user?.phone ?? ''}
            </Text>
            {location ? (
              <Text variant="caption" tone="muted">
                {location}
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSubtle} />
        </Pressable>
        ) : null}

        {/* Credits, because this is where a seller comes looking for them. */}
        {user ? (
        <View
          style={[
            styles.credits,
            {
              marginTop: theme.spacing.md,
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.accentMuted,
              borderWidth: 1,
              borderColor: theme.colors.accentBorder,
            },
          ]}
        >
          <Ionicons name="pricetag" size={19} color={theme.colors.accent} />

          <View style={{ flex: 1 }}>
            <Text variant="priceSmall" tone="accent">
              {t('sell:credits_balance', { count: balance })}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 1 }}>
              {t('sell:credits_body')}
            </Text>
          </View>

          <Button
            label={t('profile:buy_credits')}
            size="sm"
            onPress={() => setSheetOpen(true)}
            testID="profile-credits"
          />
        </View>
        ) : null}

        {/* Selling and messaging both need an account, so neither is drawn
            for somebody who has not got one. */}
        {user ? (
          <>
        <Text variant="overline" tone="muted" style={sectionLabel}>
          {t('profile:selling')}
        </Text>
        <ListGroup inset={56}>
          <SettingRow
            icon="pricetag-outline"
            label={t('sell:my_listings')}
            hint={t('profile:my_listings_hint')}
            onPress={() => router.replace('/(tabs)/sell')}
            testID="profile-listings"
          />
          <SettingRow
            icon="chatbubble-ellipses-outline"
            label={t('messages:title')}
            onPress={() => router.replace('/(tabs)/messages')}
            testID="profile-messages"
          />
        </ListGroup>
          </>
        ) : null}

        {/* The one section that works either way. */}
        <Text variant="overline" tone="muted" style={sectionLabel}>
          {t('profile:language')}
        </Text>
        <ListGroup inset={theme.spacing.lg}>
          {SUPPORTED_LANGUAGES.map((language) => (
            <SettingRow
              key={language}
              label={LANGUAGE_NAMES[language]}
              chevron={false}
              accessory={
                i18n.language === language ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                ) : undefined
              }
              onPress={() => void chooseLanguage(language)}
              testID={`language-${language}`}
            />
          ))}
        </ListGroup>

        {user ? (
          <>
        <Text variant="overline" tone="muted" style={sectionLabel}>
          {t('profile:account')}
        </Text>
        <ListGroup inset={56}>
          <SettingRow
            icon="person-remove-outline"
            label={t('profile:blocked')}
            hint={t('profile:blocked_hint')}
            onPress={() => router.push('/profile/blocked')}
            testID="profile-blocked"
          />
          <SettingRow
            icon="log-out-outline"
            label={t('profile:sign_out')}
            chevron={false}
            onPress={() => {
              setBusy(true);
              void signOut().finally(() => setBusy(false));
            }}
            testID="sign-out"
          />
          <SettingRow
            icon="trash-outline"
            label={t('profile:delete_account')}
            destructive
            chevron={false}
            onPress={() => setConfirmingDelete(true)}
            testID="delete-account"
          />
        </ListGroup>
          </>
        ) : null}

        {confirmingDelete ? (
          <View
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.danger,
              backgroundColor: theme.colors.dangerMuted,
              gap: theme.spacing.md,
            }}
            testID="delete-confirm-panel"
          >
            <Text variant="bodyStrong" style={{ color: theme.colors.danger }}>
              {t('profile:delete_title')}
            </Text>
            <Text variant="meta" tone="muted">
              {t('profile:delete_body')}
            </Text>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
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
                    .catch((error) => setFailure(error instanceof Error ? error.message : String(error)))
                    .finally(() => setBusy(false));
                }}
                testID="delete-confirm"
              />
            </View>
          </View>
        ) : null}

        {failure ? (
          <Text variant="meta" tone="danger" style={{ marginTop: theme.spacing.md }}>
            {failure}
          </Text>
        ) : null}

        <Text variant="caption" tone="subtle" style={{ marginTop: theme.spacing.xxl, textAlign: 'center' }}>
          Autevo {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>

      <CreditsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onGranted={() => setSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credits: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
