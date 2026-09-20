import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '../theme';

export type RateCardProps = {
  /** Sends the score. Resolves when the API has it, rejects if it has not. */
  onRate: (score: number) => Promise<void>;
};

/**
 * One to five, left to right. The faces carry the meaning, and the two words
 * beneath the ends carry it for anyone the faces do not reach.
 */
const FACES = ['😞', '🙁', '😐', '🙂', '😀'];

/** Above this, someone is pleased; at or below it, they are telling us something. */
const PLEASED = 4;

/**
 * The one question the home screen asks, at the bottom where it interrupts
 * nothing.
 *
 * It asks once: answering sets `rated_at` on the account, and the home screen
 * stops rendering it after that, on every device that account signs in on. A
 * score that could not be sent says so and leaves the faces tappable, because
 * a card that silently swallowed the answer would be worse than not asking.
 */
export function RateCard({ onRate }: RateCardProps) {
  const theme = useTheme();
  const { t } = useTranslation('home');

  const [sending, setSending] = useState<number | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const choose = async (score: number) => {
    setFailed(false);
    setSending(score);

    try {
      await onRate(score);
      setSent(score);
    } catch {
      setFailed(true);
    } finally {
      setSending(null);
    }
  };

  const card = {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  };

  if (sent !== null) {
    return (
      <View style={[card, { gap: theme.spacing.xs }]} testID="rate-thanks">
        <Text variant="bodyStrong">{t('rate_thanks')}</Text>
        <Text variant="meta" tone="muted">
          {t(sent >= PLEASED ? 'rate_thanks_high' : 'rate_thanks_low')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[card, { gap: theme.spacing.md }]} testID="rate-card">
      <View style={{ gap: 2 }}>
        <Text variant="bodyStrong">{t('rate_title')}</Text>
        <Text variant="meta" tone="muted">
          {t('rate_body')}
        </Text>
      </View>

      <View style={styles.faces}>
        {FACES.map((face, index) => {
          const score = index + 1;

          return (
            <Pressable
              key={face}
              accessibilityRole="button"
              accessibilityLabel={`${score}`}
              disabled={sending !== null}
              onPress={() => void choose(score)}
              testID={`rate-${score}`}
              style={({ pressed }) => [
                styles.face,
                {
                  borderRadius: theme.radius.md,
                  backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent',
                  opacity: sending !== null && sending !== score ? 0.35 : 1,
                },
              ]}
            >
              {sending === score ? (
                <ActivityIndicator color={theme.colors.accent} />
              ) : (
                <Text variant="display">{face}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.ends}>
        <Text variant="caption" tone="subtle">
          {t('rate_1')}
        </Text>
        <Text variant="caption" tone="subtle">
          {t('rate_5')}
        </Text>
      </View>

      {failed ? (
        <Text variant="caption" tone="danger">
          {t('rate_failed')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  faces: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  face: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
