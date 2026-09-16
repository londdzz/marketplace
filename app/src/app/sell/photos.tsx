import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { sellApi } from '../../api/sell';
import type { ListingPhoto } from '../../api/types';
import { Button, Text } from '../../components';
import { SellStep } from '../../sell/SellStep';
import { useSell } from '../../sell/SellProvider';
import { pickPhotos, takePhoto } from '../../sell/photos';
import { pathTo } from '../../sell/steps';
import { useTheme } from '../../theme';

const MIN_PHOTOS = 4;
const MAX_PHOTOS = 15;

export default function SellPhotosScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['sell', 'common']);
  const { draft, applyPhotos } = useSell();

  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const photos = draft?.photos ?? [];
  const remaining = MAX_PHOTOS - photos.length;

  const gap = theme.spacing.sm;
  const tile = Math.floor((width - theme.screenPadding * 2 - gap * 2) / 3);

  const withListing = async (work: (listingId: string) => Promise<ListingPhoto[]>) => {
    if (!draft) {
      return;
    }

    setBusy(true);
    setFailure(null);

    try {
      applyPhotos(await work(draft.id));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const addFromLibrary = async () => {
    const picked = await pickPhotos(remaining);

    if (picked.length === 0) {
      return;
    }

    await withListing((id) => sellApi.uploadPhotos(id, picked));
  };

  const addFromCamera = async () => {
    const photo = await takePhoto();

    if (!photo) {
      return;
    }

    await withListing((id) => sellApi.uploadPhotos(id, [photo]));
  };

  const remove = (photo: ListingPhoto) =>
    withListing(async (id) => {
      await sellApi.deletePhoto(id, photo.id);

      return photos.filter((candidate) => candidate.id !== photo.id);
    });

  /** The cover is simply the first photo, so promoting one is a reorder. */
  const makeCover = (photo: ListingPhoto) =>
    withListing(async (id) => {
      const order = [photo.id, ...photos.filter((c) => c.id !== photo.id).map((c) => c.id)];

      return sellApi.reorderPhotos(id, order);
    });

  return (
    <SellStep
      screen="photos"
      title={t('sell:photos')}
      hint={t('sell:photos_hint', { min: MIN_PHOTOS, max: MAX_PHOTOS })}
      canContinue={photos.length >= MIN_PHOTOS && !busy}
      onContinue={() => router.push(pathTo('price'))}
      footerNote={
        <Text
          variant="meta"
          tone={photos.length >= MIN_PHOTOS ? 'muted' : 'danger'}
          style={{ marginBottom: theme.spacing.sm }}
        >
          {photos.length >= MIN_PHOTOS
            ? t('sell:photos_count', { count: photos.length, max: MAX_PHOTOS })
            : t('sell:photos_needed', { count: MIN_PHOTOS - photos.length })}
        </Text>
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {photos.map((photo, index) => (
          <View
            key={photo.id}
            style={{ width: tile, height: tile, borderRadius: theme.radius.md, overflow: 'hidden' }}
            testID={`photo-${index}`}
          >
            <Image
              source={{ uri: photo.thumb_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={120}
            />

            {index === 0 ? (
              <View
                style={[
                  styles.cover,
                  { backgroundColor: theme.colors.accent, borderRadius: theme.radius.sm },
                ]}
              >
                <Text variant="caption" style={{ color: theme.colors.textOnAccent }}>
                  {t('sell:cover')}
                </Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('sell:make_cover')}
                onPress={() => void makeCover(photo)}
                style={[styles.action, styles.left, { backgroundColor: theme.colors.scrim }]}
                testID={`photo-cover-${index}`}
              >
                <Ionicons name="star-outline" size={15} color="#FFFFFF" />
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('sell:remove_photo')}
              onPress={() => void remove(photo)}
              style={[styles.action, styles.right, { backgroundColor: theme.colors.scrim }]}
              testID={`photo-remove-${index}`}
            >
              <Ionicons name="close" size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}

        {remaining > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('sell:add_photos')}
            onPress={() => void addFromLibrary()}
            disabled={busy}
            style={({ pressed }) => [
              styles.add,
              {
                width: tile,
                height: tile,
                borderRadius: theme.radius.md,
                borderColor: theme.colors.accentBorder,
                backgroundColor: theme.colors.accentMuted,
                opacity: pressed || busy ? 0.6 : 1,
              },
            ]}
            testID="photo-add"
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              <Ionicons name="add" size={28} color={theme.colors.accent} />
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        <Button
          label={t('sell:add_photos')}
          icon="images-outline"
          variant="outline"
          block
          disabled={busy || remaining === 0}
          onPress={() => void addFromLibrary()}
        />
        <Button
          label={t('sell:take_photo')}
          icon="camera-outline"
          variant="outline"
          block
          disabled={busy || remaining === 0}
          onPress={() => void addFromCamera()}
        />
      </View>

      {failure ? (
        <Text variant="meta" tone="danger" style={{ marginTop: theme.spacing.lg }}>
          {failure}
        </Text>
      ) : null}
    </SellStep>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  action: {
    position: 'absolute',
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: {
    left: 6,
  },
  right: {
    right: 6,
  },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 4,
    borderStyle: 'dashed',
  },
});
