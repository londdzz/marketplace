import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../theme';
import type { TypographyKey } from '../theme/typography';

type Tone = 'default' | 'muted' | 'subtle' | 'accent' | 'onAccent' | 'danger' | 'success';

export type TextProps = RNTextProps & {
  variant?: TypographyKey;
  tone?: Tone;
};

/**
 * Every piece of text goes through here, so no screen picks its own size,
 * weight or colour.
 *
 * Text follows the phone's own size setting, but only so far: iOS Dynamic Type
 * and Android's font scale both reach 2× and beyond, which turns a row with a
 * fixed height into a row with its label clipped. A third larger is the most
 * the layouts take, and a caller that can give more room passes its own
 * multiplier.
 */
export function Text({
  variant = 'body',
  tone = 'default',
  maxFontSizeMultiplier = 1.3,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const color = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    subtle: theme.colors.textSubtle,
    accent: theme.colors.accent,
    onAccent: theme.colors.textOnAccent,
    danger: theme.colors.danger,
    success: theme.colors.success,
  }[tone];

  return (
    <RNText
      style={[theme.typography[variant], { color }, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...rest}
    />
  );
}
