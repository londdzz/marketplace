import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body?: string;
  /** The wording on the button that goes through with it. */
  confirmLabel: string;
  cancelLabel: string;
  /** Draws the confirming button in the danger colour. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
};

/**
 * A question that has to be answered before anything happens.
 *
 * It sits above everything rather than inside the page: a confirmation drawn
 * in the flow of a screen can end up under a pinned action bar, where the
 * person is asked something they cannot answer.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, { backgroundColor: theme.colors.scrim, padding: theme.spacing.xl }]}>
        {/* Behind the card rather than around it: a button inside a button is
            invalid, and the outer one would swallow the answer. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />

        <View
          testID={testID}
          style={[
            styles.card,
            {
              padding: theme.spacing.xl,
              gap: theme.spacing.md,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            theme.elevation.lg,
          ]}
        >
          <Text variant="title">{title}</Text>

          {body ? (
            <Text variant="body" tone="muted">
              {body}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
            <Button
              label={cancelLabel}
              variant="secondary"
              size="lg"
              style={{ flex: 1 }}
              disabled={loading}
              onPress={onCancel}
              testID="confirm-cancel"
            />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              size="lg"
              style={{ flex: 1 }}
              loading={loading}
              onPress={onConfirm}
              testID="confirm-action"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
  },
});
