import { forwardRef, useState } from 'react';
import {
  Platform,
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';
import type { TypographyKey } from '../theme/typography';
import { Text } from './Text';

/**
 * The browser draws its own focus ring on a text field, in its own colour,
 * which has nothing to do with this design. The field already shows focus.
 */
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export type InputProps = TextInputProps & {
  label?: string;
  /** Shown under the field in red, and outlines the field to match. */
  error?: string;
  /** Shown under the field in grey when there is no error. */
  hint?: string;
  /** Fixed text before the field, such as a dialling prefix. */
  prefix?: string;
  /** The type the value is set in. A price deserves to be read as a price. */
  inputVariant?: TypographyKey;
  containerStyle?: StyleProp<ViewStyle>;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, prefix, inputVariant = 'body', containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.accent
      : theme.colors.border;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" tone="muted" style={{ marginBottom: theme.spacing.xs }}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            borderColor,
            // Resting fields are a soft fill; focus lifts one to a white
            // surface with an accent ring, so the active field is obvious.
            backgroundColor: focused ? theme.colors.surface : theme.colors.surfaceMuted,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.lg,
            borderWidth: 1.5,
          },
        ]}
      >
        {prefix ? (
          <Text variant={inputVariant} tone="muted" style={{ marginRight: theme.spacing.sm }}>
            {prefix}
          </Text>
        ) : null}

        <TextInput
          maxFontSizeMultiplier={1.3}
          ref={ref}
          style={[styles.input, theme.typography[inputVariant], { color: theme.colors.text }, noOutline, style]}
          placeholderTextColor={theme.colors.textSubtle}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
      </View>

      {error ? (
        <Text variant="caption" tone="danger" style={{ marginTop: theme.spacing.xs }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
});
