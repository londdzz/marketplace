import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Input, Text, ToggleRow } from '../../components';
import { useTheme } from '../../theme';

/**
 * Editing lives on its own screen rather than inline on the profile.
 *
 * A settings page that is half a list and half a form reads as neither. Here
 * there are fields and one way to save them, pinned where a thumb reaches.
 */
export default function ProfileEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['profile', 'common']);
  const { user, apply } = useAuth();

  const [name, setName] = useState(user?.display_name ?? '');
  const [isDealer, setIsDealer] = useState(user?.seller_type === 'dealer');
  const [dealerName, setDealerName] = useState(user?.dealer_name ?? '');
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const save = async () => {
    setSaving(true);
    setFailure(null);
    setFieldErrors({});

    try {
      apply(
        await authApi.updateMe({
          display_name: name.trim() === '' ? null : name.trim(),
          seller_type: isDealer ? 'dealer' : 'private',
          dealer_name: isDealer ? (dealerName.trim() === '' ? null : dealerName.trim()) : null,
        }),
      );

      // Saying where to land rather than trusting history: this screen can be
      // opened from the profile, from a deep link, or after a reload.
      router.replace('/(tabs)/profile');
    } catch (error) {
      // The API's own message, on the field that caused it.
      if (error instanceof ApiError && error.body.errors) {
        setFieldErrors(
          Object.fromEntries(Object.entries(error.body.errors).map(([key, list]) => [key, list[0]])),
        );
      }

      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.screenPadding, paddingVertical: theme.spacing.md, gap: theme.spacing.md },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
          hitSlop={8}
          testID="edit-back"
        >
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text variant="title">{t('profile:details')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: theme.screenPadding, paddingTop: theme.spacing.md }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Input
          label={t('profile:display_name')}
          hint={t('profile:display_name_hint')}
          placeholder={t('profile:display_name_placeholder')}
          value={name}
          onChangeText={setName}
          error={fieldErrors.display_name}
          testID="profile-name"
        />

        <View style={{ marginTop: theme.spacing.xl }}>
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
            placeholder={t('profile:dealer_name_placeholder')}
            value={dealerName}
            onChangeText={setDealerName}
            error={fieldErrors.dealer_name}
            containerStyle={{ marginTop: theme.spacing.lg }}
            testID="profile-dealer-name"
          />
        ) : null}

        {/* The phone number is the login, so it is shown and not editable. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginTop: theme.spacing.xl,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <Ionicons name="call-outline" size={18} color={theme.colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{user?.phone ?? ''}</Text>
            <Text variant="caption" tone="muted">
              {t('profile:phone_fixed')}
            </Text>
          </View>
        </View>

        {failure ? (
          <Text variant="meta" tone="danger" style={{ marginTop: theme.spacing.lg }}>
            {failure}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: theme.screenPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.lg,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          theme.elevation.md,
        ]}
      >
        <Button
          label={t('common:save')}
          size="lg"
          block
          loading={saving}
          onPress={() => void save()}
          testID="profile-save"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    borderTopWidth: 1,
  },
});
