import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type ToggleRowProps = {
  label: string;
  /** One quiet line saying what turning it on actually means. */
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
};

/**
 * A labelled switch on a card, for the yes-or-no facts about a car: whether the
 * price is negotiable, whether it has cleared customs.
 */
export function ToggleRow({ label, hint, value, onValueChange, testID }: ToggleRowProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.md,
          minHeight: 52,
          gap: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="meta" tone="muted" style={{ marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        testID={testID}
        trackColor={{ false: theme.colors.borderStrong, true: theme.colors.accent }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
