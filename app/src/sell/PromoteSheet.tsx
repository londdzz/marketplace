import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { sellApi } from '../api/sell';
import type { Listing, PromotionOptions } from '../api/types';
import { Button, Text } from '../components';
import { useTheme } from '../theme';

export type PromoteSheetProps = {
  listing: Listing | null;
  onClose: () => void;
  /** Called once the API confirms the promotion is running. */
  onPromoted?: (listing: Listing) => void;
};

/** Where a budget sits against what other sellers spend. */
type Standing = 'below' | 'typical' | 'above';

function standingFor(credits: number, typical: PromotionOptions['typical']): Standing | null {
  if (!typical) {
    return null;
  }

  if (credits < typical.low) {
    return 'below';
  }

  return credits > typical.high ? 'above' : 'typical';
}

/**
 * Put a listing in front of the others, for as long as the credits buy.
 *
 * The seller sets a budget and everything follows from it: the days, the date
 * it runs until, and where the amount sits against what other sellers spend.
 * That last part is measured from the ledger, so when too few people have
 * promoted anything it is absent rather than guessed — a made-up benchmark
 * would be advice about someone's money.
 */
export function PromoteSheet({ listing, onClose, onPromoted }: PromoteSheetProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation(['sell', 'common']);
  const sheet = useRef<BottomSheet>(null);
  const queryClient = useQueryClient();

  const [credits, setCredits] = useState(1);
  const [failure, setFailure] = useState<string | null>(null);

  const options = useQuery({
    queryKey: ['promotion-options', listing?.id],
    queryFn: () => sellApi.promotionOptions(listing!.id),
    enabled: Boolean(listing),
  });

  const data = options.data;

  // Open on what other sellers actually spend, when that is known — the same
  // place a seller would land after reading the line below the slider.
  useEffect(() => {
    if (data) {
      setCredits(Math.min(Math.max(data.typical?.median ?? 1, data.min_credits), data.max_credits));
    }
  }, [data]);

  const promote = useMutation({
    mutationFn: () => sellApi.promote(listing!.id, credits),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      await queryClient.invalidateQueries({ queryKey: ['credits'] });
      onPromoted?.(updated);
      onClose();
    },
    onError: (error) => setFailure(error instanceof Error ? error.message : String(error)),
  });

  const backdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const snapPoints = useMemo(() => ['72%'], []);

  if (!listing) {
    return null;
  }

  const balance = data?.balance ?? 0;
  const maximum = Math.min(data?.max_credits ?? 1, Math.max(balance, data?.min_credits ?? 1));
  const minimum = data?.min_credits ?? 1;
  const days = credits * (data?.days_per_credit ?? 0);
  const standing = data ? standingFor(credits, data.typical) : null;
  const affordable = credits <= balance;

  /** Where the promotion runs to, counted from any time still on the clock. */
  const until = (() => {
    const running =
      data?.featured_until && new Date(data.featured_until) > new Date()
        ? new Date(data.featured_until)
        : new Date();

    running.setDate(running.getDate() + days);

    return running.toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'long',
    });
  })();

  const step = (by: number) =>
    setCredits((current) => Math.min(Math.max(current + by, minimum), maximum));

  return (
    <BottomSheet
      ref={sheet}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
    >
      <BottomSheetView
        style={{ paddingHorizontal: theme.screenPadding, paddingBottom: theme.spacing.xxxl }}
      >
        <View style={styles.head}>
          <Text variant="title">{t('sell:promote_title')}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} testID="promote-close">
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          {t('sell:promote_body')}
        </Text>

        {options.isLoading ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xxl }} />
        ) : options.isError ? (
          <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
            <Text variant="body" tone="danger">
              {t('common:error_loading')}
            </Text>
            <Button
              label={t('common:retry')}
              variant="secondary"
              onPress={() => void options.refetch()}
            />
          </View>
        ) : (
          <>
            {/* The budget, and what it buys, as one figure the seller sets. */}
            <View
              style={[
                styles.dial,
                {
                  marginTop: theme.spacing.xl,
                  paddingVertical: theme.spacing.lg,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.surfaceMuted,
                  gap: theme.spacing.lg,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('sell:promote_less')}
                onPress={() => step(-1)}
                disabled={credits <= minimum}
                hitSlop={10}
                testID="promote-less"
                style={[styles.step, { opacity: credits <= minimum ? 0.35 : 1 }]}
              >
                <Ionicons name="remove" size={20} color={theme.colors.text} />
              </Pressable>

              <View style={styles.readout}>
                <Text variant="display">{t('sell:promote_credits', { count: credits })}</Text>
                <Text variant="meta" tone="muted">
                  {t('sell:promote_days', { count: days })}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('sell:promote_more')}
                onPress={() => step(1)}
                disabled={credits >= maximum}
                hitSlop={10}
                testID="promote-more"
                style={[styles.step, { opacity: credits >= maximum ? 0.35 : 1 }]}
              >
                <Ionicons name="add" size={20} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
              <View style={[styles.line, { gap: theme.spacing.sm }]}>
                <Ionicons name="calendar-outline" size={15} color={theme.colors.textMuted} />
                <Text variant="meta" tone="muted" style={{ flex: 1 }}>
                  {t('sell:promote_until', { date: until })}
                </Text>
              </View>

              {/* Measured from the ledger, or absent. Never estimated. */}
              {data?.typical && standing ? (
                <View style={[styles.line, { gap: theme.spacing.sm }]}>
                  <Ionicons
                    name={standing === 'below' ? 'trending-down-outline' : 'people-outline'}
                    size={15}
                    color={standing === 'below' ? theme.colors.warning : theme.colors.textMuted}
                  />
                  <Text
                    variant="meta"
                    tone={standing === 'below' ? 'default' : 'muted'}
                    style={{ flex: 1 }}
                  >
                    {t(`sell:promote_standing_${standing}`, {
                      low: data.typical.low,
                      high: data.typical.high,
                    })}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.line, { gap: theme.spacing.sm }]}>
                <Ionicons name="pricetag-outline" size={15} color={theme.colors.textMuted} />
                <Text variant="meta" tone={affordable ? 'muted' : 'danger'} style={{ flex: 1 }}>
                  {affordable
                    ? t('sell:promote_balance', { count: balance })
                    : t('sell:promote_short', { count: credits - balance })}
                </Text>
              </View>
            </View>

            {failure ? (
              <Text variant="meta" tone="danger" style={{ marginTop: theme.spacing.md }}>
                {failure}
              </Text>
            ) : null}

            <Button
              label={t('sell:promote_confirm', { count: credits })}
              size="lg"
              block
              icon="rocket-outline"
              style={{ marginTop: theme.spacing.xl }}
              loading={promote.isPending}
              disabled={!affordable}
              onPress={() => {
                setFailure(null);
                promote.mutate();
              }}
              testID="promote-confirm"
            />
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dial: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    minWidth: 150,
    alignItems: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
