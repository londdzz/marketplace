import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { CreditPack } from '../api/sell';
import { Badge, Button, Text } from '../components';
import { formatEurExact } from '../format';
import * as purchases from '../purchases';
import { useTheme } from '../theme';
import { awaitGrantedCredits, useCredits } from './credits';

export type CreditsSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Called once the API confirms the credits have actually arrived. */
  onGranted?: (balance: number) => void;
};

type Phase = 'idle' | 'buying' | 'confirming' | 'slow' | 'failed';

/**
 * The credit packs, shown whenever a seller runs out.
 *
 * Nothing here grants a credit. The store takes the payment, RevenueCat tells
 * our API, the API grants, and this sheet waits for the balance to rise. That
 * is slower than granting locally and it is the only way the ledger can be
 * trusted.
 */
export function CreditsSheet({ open, onClose, onGranted }: CreditsSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation(['sell', 'common']);
  const sheet = useRef<BottomSheet>(null);

  const credits = useCredits();
  const balance = credits.data?.balance ?? 0;
  const packs = credits.data?.packs ?? [];

  const [phase, setPhase] = useState<Phase>('idle');
  const [failure, setFailure] = useState<string | null>(null);
  const [storePackages, setStorePackages] = useState<purchases.PurchasesPackage[]>([]);

  const available = purchases.isConfigured();

  useEffect(() => {
    if (!open || !available) {
      return;
    }

    let cancelled = false;

    // The store's own prices, in the buyer's currency, rather than our euro
    // copy of them. What the store says is what the buyer is charged.
    purchases
      .loadPackages()
      .then((loaded) => {
        if (!cancelled) {
          setStorePackages(loaded);
        }
      })
      .catch(() => {
        // The euro prices from the API stand in; the buy button will report
        // the real failure if one is pressed.
      });

    return () => {
      cancelled = true;
    };
  }, [open, available]);

  useEffect(() => {
    if (open) {
      sheet.current?.expand();
      setPhase('idle');
      setFailure(null);
    } else {
      sheet.current?.close();
    }
  }, [open]);

  const priceFor = useCallback(
    (pack: CreditPack) => {
      const fromStore = storePackages.find(
        (candidate) => candidate.product.identifier === pack.product_id,
      );

      return fromStore?.product.priceString ?? formatEurExact(pack.price_eur);
    },
    [storePackages],
  );

  const buy = useCallback(
    async (pack: CreditPack) => {
      setFailure(null);

      const storePackage = storePackages.find(
        (candidate) => candidate.product.identifier === pack.product_id,
      );

      if (!available || !storePackage) {
        setFailure(t('sell:credits_unavailable'));

        return;
      }

      try {
        setPhase('buying');

        const completed = await purchases.purchase(storePackage);

        if (!completed) {
          setPhase('idle');

          return;
        }

        setPhase('confirming');

        const granted = await awaitGrantedCredits(balance, credits.refetch);

        if (granted === null) {
          setPhase('slow');

          return;
        }

        setPhase('idle');
        onGranted?.(granted);
      } catch (error) {
        // A cancelled purchase is not a failure worth shouting about.
        const cancelled =
          typeof error === 'object' && error !== null && 'userCancelled' in error
            ? Boolean((error as { userCancelled?: boolean }).userCancelled)
            : false;

        setPhase(cancelled ? 'idle' : 'failed');

        if (!cancelled) {
          setFailure(error instanceof Error ? error.message : String(error));
        }
      }
    },
    [available, balance, credits.refetch, onGranted, storePackages, t],
  );

  const backdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  const snapPoints = useMemo(() => ['70%'], []);
  const working = phase === 'buying' || phase === 'confirming';

  if (!open) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheet}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
    >
      <BottomSheetView style={{ paddingHorizontal: theme.screenPadding, paddingBottom: theme.spacing.xxxl }}>
        <View style={[styles.head, { marginBottom: theme.spacing.xs }]}>
          <Text variant="title">{t('sell:credits_title')}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} testID="credits-close">
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <Text variant="meta" tone="muted">
          {t('sell:credits_body')}
        </Text>

        <Text variant="label" style={{ marginTop: theme.spacing.md }}>
          {t('sell:credits_balance', { count: balance })}
        </Text>

        {credits.isLoading ? (
          <ActivityIndicator style={{ marginTop: theme.spacing.xxl }} color={theme.colors.accent} />
        ) : null}

        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
          {packs.map((pack) => (
            <View
              key={pack.product_id}
              style={[
                styles.pack,
                {
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.lg,
                  gap: theme.spacing.md,
                  backgroundColor: pack.most_popular ? theme.colors.accentMuted : theme.colors.surfaceMuted,
                  borderColor: pack.most_popular ? theme.colors.accent : theme.colors.border,
                },
              ]}
              testID={`pack-${pack.product_id}`}
            >
              <View style={{ flex: 1 }}>
                <View style={[styles.head, { gap: theme.spacing.sm, justifyContent: 'flex-start' }]}>
                  <Text variant="priceSmall">
                    {t('sell:credits_count', { count: pack.credits })}
                  </Text>
                  {pack.most_popular ? <Badge label={t('sell:most_popular')} tone="accent" /> : null}
                </View>
                <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xxs }}>
                  {t('sell:credits_listings', { count: pack.credits })}
                </Text>
              </View>

              <Button
                label={priceFor(pack)}
                size="md"
                variant={pack.most_popular ? 'primary' : 'secondary'}
                disabled={working}
                onPress={() => void buy(pack)}
                testID={`buy-${pack.product_id}`}
              />
            </View>
          ))}
        </View>

        {phase === 'confirming' ? (
          <View style={[styles.status, { marginTop: theme.spacing.lg, gap: theme.spacing.sm }]}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text variant="meta" tone="muted">
              {t('sell:credits_confirming')}
            </Text>
          </View>
        ) : null}

        {phase === 'slow' ? (
          <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.lg }}>
            {t('sell:credits_slow')}
          </Text>
        ) : null}

        {failure ? (
          <Text variant="meta" tone="danger" style={{ marginTop: theme.spacing.lg }}>
            {failure}
          </Text>
        ) : null}

        {!available ? (
          <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.lg }}>
            {t('sell:credits_unavailable')}
          </Text>
        ) : null}
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
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
