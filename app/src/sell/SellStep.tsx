import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button, Text } from '../components';
import { useTheme } from '../theme';
import { useSell } from './SellProvider';
import { progressOf, stepOf, TOTAL_STEPS, type SellScreen } from './steps';

export type SellStepProps = {
  screen: SellScreen;
  title: string;
  /** One line under the title saying what is being asked for, when it helps. */
  hint?: string;
  children: ReactNode;
  /** Label for the primary action. Defaults to Continue. */
  continueLabel?: string;
  /** Off while the answer is incomplete, so the flow cannot save nothing. */
  canContinue?: boolean;
  onContinue?: () => void;
  /** Shown beside Continue for the steps that are genuinely optional. */
  onSkip?: () => void;
  /** Lets a step own its own scrolling, for the ones that draw a list. */
  scroll?: boolean;
  /** Extra content pinned above the footer buttons, such as a photo counter. */
  footerNote?: ReactNode;
};

/**
 * Every screen in the sell flow, drawn the same way: where you are along the
 * top, one question in the middle, one way forward along the bottom.
 *
 * The footer is pinned rather than scrolled to, because a seller on a small
 * phone should never have to go looking for the way on.
 */
export function SellStep({
  screen,
  title,
  hint,
  children,
  continueLabel,
  canContinue = true,
  onContinue,
  onSkip,
  scroll = true,
  footerNote,
}: SellStepProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['sell', 'common']);
  const { saving, error } = useSell();

  const body = (
    <View style={{ flex: 1, paddingHorizontal: theme.screenPadding }}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      <View
        style={[
          styles.bar,
          { paddingHorizontal: theme.screenPadding, paddingVertical: theme.spacing.sm },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common:back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/sell'))}
          testID="sell-back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>

        <View
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 5,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <Text variant="caption" tone="muted">
            {t('sell:step', { current: stepOf(screen), total: TOTAL_STEPS })}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common:close')}
          onPress={() => router.replace('/(tabs)/sell')}
          testID="sell-close"
          hitSlop={8}
        >
          <Ionicons name="close" size={26} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* The bar moves on every screen, not only when a step completes, so
          answering something always visibly gets the seller somewhere. */}
      <View style={{ paddingHorizontal: theme.screenPadding, paddingTop: theme.spacing.xs }}>
        <View
          style={[
            styles.track,
            { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.full },
          ]}
        >
          <View
            style={{
              width: `${Math.round(progressOf(screen) * 100)}%`,
              height: '100%',
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.accent,
            }}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: theme.screenPadding, paddingTop: theme.spacing.xxl }}>
        <Text variant="display">{title}</Text>
        {hint ? (
          <Text variant="body" tone="muted" style={{ marginTop: theme.spacing.xs }}>
            {hint}
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1, paddingTop: theme.spacing.lg }}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: theme.screenPadding,
            paddingTop: theme.spacing.lg,
            paddingBottom: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.lg,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          theme.elevation.sheet,
        ]}
      >
        {footerNote}

        {error ? (
          <Text variant="meta" tone="danger" style={{ marginBottom: theme.spacing.sm }}>
            {error}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {onSkip ? (
            <Button
              label={t('sell:skip')}
              variant="secondary"
              size="lg"
              onPress={onSkip}
              style={{ flex: 1 }}
              testID="sell-skip"
            />
          ) : null}

          <Button
            label={continueLabel ?? t('sell:continue')}
            size="lg"
            disabled={!canContinue}
            loading={saving}
            onPress={onContinue}
            style={{ flex: onSkip ? 2 : 1 }}
            testID="sell-continue"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    height: 4,
    width: '100%',
    overflow: 'hidden',
  },
  footer: {
    borderTopWidth: 1,
  },
  stepPill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
