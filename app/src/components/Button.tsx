import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
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
  /** Drawn before the label, the way a Call button carries a handset. */
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * Draws a quiet button in the danger colour, for an action that takes
   * something away. A filled destructive action uses the danger variant.
   */
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One button, five weights of it.
 *
 * Only the primary is filled with the accent, and only one primary belongs on a
 * screen. Secondary actions are a soft neutral fill rather than an outline: a
 * row of outlined buttons all shout equally, and nothing leads.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  block = false,
  icon,
  destructive = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const inert = disabled || loading;

  const height = { sm: 36, md: 46, lg: 52 }[size];
  const paddingHorizontal = { sm: theme.spacing.md, md: theme.spacing.lg, lg: theme.spacing.xl }[size];
  const textVariant = size === 'sm' ? 'label' : 'bodyStrong';

  const filled = variant === 'primary' || variant === 'danger';
  const quiet = variant === 'ghost' || variant === 'outline';

  const accent = destructive ? theme.colors.danger : theme.colors.accent;
  const accentPressed = destructive ? theme.colors.dangerPressed : theme.colors.accentPressed;
  const accentTint = destructive ? theme.colors.dangerMuted : theme.colors.accentMuted;

  const surface: Record<Variant, { background: string; border: string; pressed: string }> = {
    primary: { background: accent, border: 'transparent', pressed: accentPressed },
    danger: { background: theme.colors.danger, border: 'transparent', pressed: theme.colors.dangerPressed },
    // A soft neutral fill. It reads as secondary without competing for the eye.
    secondary: {
      background: theme.colors.surfaceMuted,
      border: 'transparent',
      pressed: theme.colors.borderStrong,
    },
    outline: { background: 'transparent', border: accent, pressed: accentTint },
    ghost: { background: 'transparent', border: 'transparent', pressed: accentTint },
  };

  const contentColor = filled
    ? theme.colors.textOnAccent
    : quiet
      ? destructive
        ? theme.colors.danger
        : theme.colors.accentText
      : theme.colors.text;

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
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: inert ? 0.45 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <View style={[styles.label, { gap: theme.spacing.sm }]}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={contentColor} /> : null}
          <Text variant={textVariant} style={{ color: contentColor }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
