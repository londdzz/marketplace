import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { SortOption } from '../api/types';
import { ListGroup, Text } from '../components';
import { useTheme } from '../theme';

export type SortSheetProps = {
  open: boolean;
  current: SortOption;
  onChoose: (sort: SortOption) => void;
  onClose: () => void;
};

/**
 * Every ordering, each with the icon that says which way it runs.
 *
 * Relevance leads because it is the default, then the two a buyer reaches for
 * most — cheapest first, then dearest — then newest and least driven.
 */
const OPTIONS: ReadonlyArray<{ value: SortOption; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'relevance', icon: 'sparkles-outline' },
  { value: 'price_asc', icon: 'arrow-down-outline' },
  { value: 'price_desc', icon: 'arrow-up-outline' },
  { value: 'newest', icon: 'time-outline' },
  { value: 'mileage_asc', icon: 'speedometer-outline' },
];

/**
 * How the results are ordered.
 *
 * A sheet rather than a button that cycles: cycling makes someone tap four
 * times to reach the fourth ordering and never shows them what the others are.
 */
export function SortSheet({ open, current, onChoose, onClose }: SortSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation(['search', 'common']);
  const sheet = useRef<BottomSheet>(null);

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

  const snapPoints = useMemo(() => ['52%'], []);

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
      backgroundStyle={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
    >
      <BottomSheetView
        style={{ paddingHorizontal: theme.screenPadding, paddingBottom: theme.spacing.xxxl }}
      >
        <View style={[styles.head, { marginBottom: theme.spacing.lg }]}>
          <Text variant="title">{t('search:sort')}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} testID="sort-close">
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <ListGroup inset={56}>
          {OPTIONS.map((option) => {
            const chosen = option.value === current;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                testID={`sort-${option.value}`}
                onPress={() => onChoose(option.value)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.md,
                    gap: theme.spacing.md,
                    backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent',
                  },
                ]}
              >
                <View
                  style={[
                    styles.icon,
                    {
                      borderRadius: theme.radius.sm,
                      backgroundColor: chosen ? theme.colors.accentMuted : theme.colors.surfaceMuted,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={chosen ? theme.colors.accent : theme.colors.textMuted}
                  />
                </View>

                <Text variant={chosen ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
                  {t(`search:sort_${option.value}`)}
                </Text>

                {chosen ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </ListGroup>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  icon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
