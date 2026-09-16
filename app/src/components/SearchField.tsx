import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../theme';

export type SearchFieldProps = {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  /** Clears the search back to nothing, the circular arrow in the reference. */
  onReset?: () => void;
  onVoice?: () => void;
  testID?: string;
};

/**
 * The rounded search field at the top of the search tab, with the reset control
 * sitting outside it.
 *
 * The microphone is drawn because the reference has one, and wired to whatever
 * the host passes; with nothing passed it is not rendered at all rather than
 * shown as a button that does nothing.
 */
export function SearchField({
  value,
  placeholder,
  onChangeText,
  onReset,
  onVoice,
  testID,
}: SearchFieldProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { gap: theme.spacing.md }]}>
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.full,
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.md,
          },
        ]}
      >
        <Ionicons name="search" size={20} color={theme.colors.textMuted} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="search"
          testID={testID}
          style={[
            styles.input,
            theme.typography.body,
            { color: theme.colors.text },
            // The browser's own focus ring belongs to no design system.
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
        />

        {onVoice ? (
          <Pressable accessibilityRole="button" onPress={onVoice}>
            <Ionicons name="mic-outline" size={22} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {onReset ? (
        <Pressable accessibilityRole="button" onPress={onReset} testID="search-reset">
          <Ionicons name="refresh-outline" size={22} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
});
