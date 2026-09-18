import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  /** One sentence saying what to do next, not just that there is nothing here. */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** An emoji or short glyph. Kept optional so it is never load-bearing. */
  glyph?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Shown when a list has nothing in it, a search found nothing, or a request
 * failed. Always offers the next step rather than a dead end.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  glyph,
  style,
  testID,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View testID={testID} style={[styles.base, { padding: theme.spacing.xl }, style]}>
      {glyph ? (
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: theme.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <Text variant="display">{glyph}</Text>
        </View>
      ) : null}

      <Text variant="title" style={styles.centered}>
        {title}
      </Text>

      {description ? (
        <Text
          variant="body"
          tone="muted"
          style={[styles.centered, { marginTop: theme.spacing.sm }]}
        >
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          size="lg"
          // A button sets its own alignment, so centring the column is not
          // enough to centre the button in it.
          style={{ marginTop: theme.spacing.xl, alignSelf: 'center', paddingHorizontal: theme.spacing.xxl }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});
