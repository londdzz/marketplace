import { forwardRef, useState } from 'react';
import {
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type InputProps = TextInputProps & {
  label?: string;
  /** Shown under the field in red, and outlines the field to match. */
  error?: string;
  /** Shown under the field in grey when there is no error. */
  hint?: string;
  /** Fixed text before the field, such as a dialling prefix. */
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, prefix, containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.accent
      : theme.colors.borderStrong;

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
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            // A focused field gains a second ring rather than moving, so the
            // layout never shifts under the thumb.
            borderWidth: focused || error ? 2 : StyleSheet.hairlineWidth * 2,
          },
        ]}
      >
        {prefix ? (
          <Text variant="body" tone="muted" style={{ marginRight: theme.spacing.sm }}>
            {prefix}
          </Text>
        ) : null}

        <TextInput
          ref={ref}
          style={[styles.input, theme.typography.body, { color: theme.colors.text }, style]}
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
    minHeight: 46,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
});
