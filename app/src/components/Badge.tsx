import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export type BadgeProps = {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A small rectangular tag. Used for the cross-border marker on a search result
 * and for listing status on the seller's own list.
 */
export function Badge({ label, tone = 'neutral', style, testID }: BadgeProps) {
  const theme = useTheme();

  const surfaces: Record<Tone, { background: string; text: string }> = {
    neutral: { background: theme.colors.surfaceMuted, text: theme.colors.textMuted },
    accent: { background: theme.colors.accentMuted, text: theme.colors.accent },
    success: { background: theme.colors.successMuted, text: theme.colors.success },
    warning: { background: theme.colors.warningMuted, text: theme.colors.warning },
    danger: { background: theme.colors.dangerMuted, text: theme.colors.danger },
  };

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: surfaces[tone].background,
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xxs,
        },
        style,
      ]}
    >
      <Text variant="caption" style={{ color: surfaces[tone].text, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
});
