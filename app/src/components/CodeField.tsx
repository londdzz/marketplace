import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type CodeFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  /** How many digits the code has. The API decides; this only draws them. */
  length?: number;
  /** Draws every box in the danger colour, for a code that was refused. */
  error?: boolean;
  /** While the code is being checked, so it cannot be edited mid-flight. */
  disabled?: boolean;
  autoFocus?: boolean;
  testID?: string;
};

/** The gap between boxes, from the spacing scale. */
const GAP = 8;

/**
 * One box per digit of a sign-in code.
 *
 * It is one real text field with boxes drawn over it, not six fields. Six
 * would each own a digit and have to hand focus back and forth, which breaks
 * every time somebody pastes a code, holds backspace, or lets the phone fill
 * it in — and those are most of the ways a code is actually entered. Here the
 * field holds the whole string, the boxes are a picture of it, and paste,
 * autofill and backspace behave the way the platform already makes them
 * behave.
 *
 * The caret is hidden because the lit box is the caret: the empty box waiting
 * for the next digit carries the accent, so it is obvious where typing lands
 * without a bar blinking inside it.
 */
export function CodeField({
  value,
  onChangeText,
  length = 6,
  error = false,
  disabled = false,
  autoFocus = false,
  testID,
}: CodeFieldProps) {
  const theme = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const digits = value.slice(0, length).split('');
  // Once the code is full there is no next box, so the last one stays lit
  // rather than the ring vanishing at the moment it matters most.
  const active = Math.min(digits.length, length - 1);

  return (
    <Pressable
      accessibilityRole="none"
      onPress={() => input.current?.focus()}
      style={{ flexDirection: 'row', gap: GAP }}
    >
      {Array.from({ length }).map((_, index) => {
        const filled = index < digits.length;
        const lit = focused && !disabled && index === active;

        return (
          <View
            key={index}
            style={{
              flex: 1,
              height: 58,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.md,
              borderWidth: lit ? 2 : 1,
              borderColor: error
                ? theme.colors.danger
                : lit
                  ? theme.colors.accent
                  : filled
                    ? theme.colors.borderStrong
                    : theme.colors.border,
              backgroundColor: filled ? theme.colors.surface : theme.colors.surfaceMuted,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <Text variant="display" tone={error ? 'danger' : 'default'}>
              {digits[index] ?? ''}
            </Text>
          </View>
        );
      })}

      {/* The real field, invisible over the boxes. It keeps the testID so it
          is what a test or a screenshot run types into. */}
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        editable={!disabled}
        autoFocus={autoFocus}
        caretHidden
        // Lets the phone offer the code rather than making somebody read it
        // off a notification and type it back in.
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.field, { color: 'transparent' }]}
        testID={testID}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    // Android will not focus a field with no height, and iOS needs somewhere
    // for the selection to live even when nothing is drawn.
    textAlign: 'center',
    fontSize: 1,
  },
});
