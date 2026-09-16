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
    <View testID={testID} style={[styles.base, { padding: theme.spacing.xxl }, style]}>
      {glyph ? (
        <Text variant="display" tone="subtle" style={{ marginBottom: theme.spacing.md }}>
          {glyph}
        </Text>
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
          variant="secondary"
          style={{ marginTop: theme.spacing.xl }}
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
