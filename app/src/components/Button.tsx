import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** Fills the width of its parent, which is what a form's submit does. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  block = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const inert = disabled || loading;

  const height = { sm: 34, md: 44, lg: 52 }[size];
  const paddingHorizontal = { sm: theme.spacing.md, md: theme.spacing.lg, lg: theme.spacing.xl }[size];
  const textVariant = size === 'sm' ? 'label' : 'bodyStrong';

  const surface: Record<Variant, { background: string; border: string; pressed: string }> = {
    primary: {
      background: theme.colors.accent,
      border: theme.colors.accent,
      pressed: theme.colors.accentPressed,
    },
    secondary: {
      background: theme.colors.surface,
      border: theme.colors.borderStrong,
      pressed: theme.colors.surfaceMuted,
    },
    ghost: {
      background: 'transparent',
      border: 'transparent',
      pressed: theme.colors.accentMuted,
    },
    danger: {
      background: theme.colors.danger,
      border: theme.colors.danger,
      pressed: theme.colors.dangerPressed,
    },
  };

  const tone = variant === 'primary' || variant === 'danger' ? 'onAccent' : variant === 'ghost' ? 'accent' : 'default';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      testID={testID}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? surface[variant].pressed : surface[variant].background,
          borderColor: surface[variant].border,
          opacity: inert ? 0.5 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? theme.colors.textOnAccent : theme.colors.accent}
        />
      ) : (
        <View style={styles.label}>
          <Text variant={textVariant} tone={tone} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
