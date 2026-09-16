import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '../../api/client';
import { sellApi } from '../../api/sell';
import { Chip, Text } from '../../components';
import { formatEur, formatKm, listingLocation, listingTitle } from '../../format';
import { CreditsSheet } from '../../sell/CreditsSheet';
import { useCredits } from '../../sell/credits';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { missingForPublish, pathTo, screenForField } from '../../sell/steps';
import { useTheme } from '../../theme';

const MIN_PHOTOS = 4;

export default function SellReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation(['sell', 'listing', 'common']);
  const { draft } = useSell();

  const credits = useCredits();
  const balance = credits.data?.balance ?? 0;

  const [publishing, setPublishing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // What the API will refuse to publish, worked out before asking it, so the
  // seller can fix it without a round trip. The API still has the final say.
  const [missing, setMissing] = useState<string[]>(missingForPublish(draft, MIN_PHOTOS));

  const publish = async () => {
    if (!draft) {
      return;
    }

    setPublishing(true);
    setFailure(null);

    try {
      const published = await sellApi.publish(draft.id);

      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      void credits.refetch();

      router.replace({ pathname: '/sell/published', params: { id: published.id } });
    } catch (error) {
      if (error instanceof ApiError && error.needsCredits) {
        setSheetOpen(true);
      } else if (error instanceof ApiError && error.status === 422) {
        setMissing(error.body.missing ?? []);
        setFailure(error.message);
      } else {
        setFailure(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setPublishing(false);
    }
  };

  const onPublish = () => {
    if (balance < 1) {
      setSheetOpen(true);

      return;
    }

    void publish();
  };

  const section = (label: string, value: string | null, screen: Parameters<typeof pathTo>[0]) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      onPress={() => router.push(pathTo(screen))}
      style={[styles.row, { paddingVertical: theme.spacing.md, borderBottomColor: theme.colors.border }]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="body" tone={value ? 'default' : 'muted'}>
          {value ?? t('sell:not_set')}
        </Text>
      </View>
      <Ionicons name="pencil" size={16} color={theme.colors.textMuted} />
    </Pressable>
  );

  const specs = [
    draft?.year ? String(draft.year) : null,
    draft?.mileage_km !== null && draft?.mileage_km !== undefined ? formatKm(draft.mileage_km) : null,
    draft?.fuel ? t(`listing:fuel.${draft.fuel}`, draft.fuel) : null,
    draft?.transmission ? t(`listing:transmission.${draft.transmission}`, draft.transmission) : null,
  ].filter((value): value is string => value !== null);

  return (
    <>
      <SellStep
        screen="review"
        title={t('sell:review')}
        hint={t('sell:credits_balance', { count: balance })}
        continueLabel={publishing ? t('sell:publishing') : t('sell:publish')}
        canContinue={!publishing && missing.length === 0}
        onContinue={onPublish}
        footerNote={
          failure ? (
            <Text variant="meta" tone="danger" style={{ marginBottom: theme.spacing.sm }}>
              {failure}
            </Text>
          ) : null
        }
      >
        {draft && draft.photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.sm }}
            style={{ marginBottom: theme.spacing.lg }}
          >
            {draft.photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.thumb_url }}
                style={{ width: 96, height: 72, borderRadius: theme.radius.md }}
                contentFit="cover"
                transition={120}
              />
            ))}
          </ScrollView>
        ) : null}

        <Text variant="title">{draft ? listingTitle(draft) : ''}</Text>
        {draft?.variant ? (
          <Text variant="meta" tone="muted">
            {draft.variant}
          </Text>
        ) : null}

        <Text variant="price" style={{ marginTop: theme.spacing.sm }}>
          {draft?.price_eur ? formatEur(draft.price_eur) : t('sell:not_set')}
        </Text>

        {specs.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.xs,
              marginTop: theme.spacing.md,
            }}
          >
            {specs.map((spec) => (
              <Chip key={spec} label={spec} size="sm" />
            ))}
          </View>
        ) : null}

        {missing.length > 0 ? (
          <View
            style={{
              marginTop: theme.spacing.xl,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.warningMuted,
              gap: theme.spacing.sm,
            }}
            testID="review-missing"
          >
            <Text variant="label" style={{ color: theme.colors.warning }}>
              {t('sell:missing')}
            </Text>

            {missing.map((field) => {
              const screen = screenForField(field);

              return (
                <Pressable
                  key={field}
                  accessibilityRole="button"
                  onPress={() => (screen ? router.push(pathTo(screen)) : undefined)}
                  style={styles.row}
                  testID={`missing-${field}`}
                >
                  <Text variant="meta" style={{ flex: 1 }}>
                    {t(`sell:field.${field}`, field)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.text} />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ marginTop: theme.spacing.xl }}>
          {section(t('sell:summary_make'), draft?.make?.name ?? null, 'make')}
          {section(t('sell:summary_model'), draft?.model?.name ?? null, 'model')}
          {section(t('sell:summary_photos'), t('sell:photos_count', { count: draft?.photos.length ?? 0, max: 15 }), 'photos')}
          {section(t('sell:summary_location'), draft ? listingLocation(draft) || null : null, 'location')}
          {section(
            t('sell:summary_description'),
            draft?.description ? draft.description.slice(0, 80) : null,
            'description',
          )}
          {section(
            t('sell:summary_features'),
            draft && draft.features.length > 0
              ? t('sell:features_selected', { count: draft.features.length })
              : null,
            'description',
          )}
        </View>

        <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.xl }}>
          {t('sell:publish_note')}
        </Text>
      </SellStep>

      <CreditsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onGranted={() => {
          setSheetOpen(false);
          void publish();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
