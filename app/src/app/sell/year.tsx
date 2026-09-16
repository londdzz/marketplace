import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '../../components';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

/** The oldest year the API will accept. */
const EARLIEST = 1950;

export default function SellYearScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation('sell');
  const { draft, save } = useSell();

  const [selected, setSelected] = useState<number | null>(draft?.year ?? null);

  const latest = new Date().getFullYear() + 1;
  const years = Array.from({ length: latest - EARLIEST + 1 }, (_, index) => latest - index);

  const gap = theme.spacing.sm;
  const tile = Math.floor((width - theme.screenPadding * 2 - gap * 2) / 3);

  const onContinue = async () => {
    if (selected === null) {
      return;
    }

    if (await save({ year: selected })) {
      router.push(pathTo('mileage'));
    }
  };

  return (
    <SellStep
      screen="year"
      title={t('year')}
      hint={t('year_hint')}
      canContinue={selected !== null}
      onContinue={() => void onContinue()}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {years.map((year) => {
          const active = selected === year;

          return (
            <Pressable
              key={year}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`year-${year}`}
              onPress={() => setSelected(year)}
              style={({ pressed }) => [
                styles.tile,
                {
                  width: tile,
                  paddingVertical: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                  borderColor: active ? theme.colors.accent : theme.colors.border,
                  borderWidth: active ? 1.5 : 1,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text
                variant="bodyStrong"
                style={{ color: active ? theme.colors.textOnAccent : theme.colors.text }}
              >
                {year}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SellStep>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
  },
});
