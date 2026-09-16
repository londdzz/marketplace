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
 */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
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

  return <RNText style={[theme.typography[variant], { color }, style]} {...rest} />;
}
