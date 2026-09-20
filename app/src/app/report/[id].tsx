import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { listingsApi } from '../../api/listings';
import { Button, EmptyState, Input, ListGroup, OptionRow, Screen, StackHeader, Text } from '../../components';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useTheme } from '../../theme';

/**
 * The reasons the API accepts, in the order a buyer is likely to want them:
 * the ones about the advert first, the ones about the seller after.
 */
const REASONS = [
  'sold',
  'duplicate',
  'wrong_category',
  'scam_suspected',
  'offensive',
  'other',
] as const;

type Reason = (typeof REASONS)[number];

/** A note is what makes "something else" worth reading. */
const NOTE_MAX = 1000;

/**
 * Telling us something is wrong with an advert.
 *
 * Reporting is the slow lane — we read it and act on it — so the screen says
 * plainly that nothing happens to the advert straight away, and points at
 * blocking, which the buyer can do themselves and which takes effect at once.
 */
export default function ReportListingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const bottomInset = useBottomInset();
  const { t } = useTranslation(['listing', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');

  const file = useMutation({
    mutationFn: () => listingsApi.report(id, reason!, note.trim() || undefined),
  });

  if (file.isSuccess) {
    return (
      <Screen flush scroll={false} edges={['top']}>
        <StackHeader fallback="/(tabs)/home" backLabel={t('common:back')} />
        <View style={{ flex: 1, paddingHorizontal: theme.screenPadding }}>
          <EmptyState
            glyph="✓"
            title={t('listing:report_thanks')}
            description={t('listing:report_thanks_body')}
            actionLabel={t('common:done')}
            onAction={() => router.back()}
            testID="report-thanks"
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen flush scroll={false} edges={['top']}>
      <StackHeader fallback="/(tabs)/home" backLabel={t('common:back')} />

      <Screen scroll contentStyle={{ paddingBottom: theme.spacing.xxl }}>
        <Text variant="display">{t('listing:report_title')}</Text>
        <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          {t('listing:report_body')}
        </Text>

        <ListGroup style={{ marginTop: theme.spacing.xl }}>
          {REASONS.map((value) => (
            <OptionRow
              key={value}
              flat
              label={t(`listing:report_reason_${value}`)}
              selected={reason === value}
              onPress={() => setReason(value)}
              testID={`reason-${value}`}
            />
          ))}
        </ListGroup>

        <Input
          label={t('listing:report_note')}
          hint={t('listing:report_note_hint')}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={NOTE_MAX}
          numberOfLines={4}
          style={styles.note}
          containerStyle={{ marginTop: theme.spacing.xl }}
          testID="report-note"
        />

        {/* The server's own words, on the screen that caused them. */}
        {file.isError ? (
          <Text variant="meta" tone="danger" style={{ marginTop: theme.spacing.md }}>
            {file.error instanceof Error ? file.error.message : String(file.error)}
          </Text>
        ) : null}
      </Screen>

      <View
        style={{
          paddingHorizontal: theme.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: bottomInset,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Button
          label={t('listing:report_send')}
          size="lg"
          block
          disabled={!reason}
          loading={file.isPending}
          onPress={() => file.mutate()}
          testID="report-send"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
