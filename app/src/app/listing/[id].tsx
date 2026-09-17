import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { blocksApi } from '../../api/blocks';
import { listingsApi } from '../../api/listings';
import { messagingApi } from '../../api/messaging';
import { referenceApi } from '../../api/reference';
import { ApiError } from '../../api/client';
import { Button, Chip, ConfirmDialog, EmptyState, Screen, Text } from '../../components';
import { formatEur, formatKm, formatLocal, listingLocation, listingTitle } from '../../format';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { SHOW_LOCAL_CURRENCY } from '../../market';
import { useTheme } from '../../theme';

export default function ListingDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(['listing', 'home', 'common']);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [contactFailure, setContactFailure] = useState<string | null>(null);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const queryClient = useQueryClient();

  const listing = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.show(id),
    enabled: Boolean(id),
  });

  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  // The heart saves the car rather than only colouring itself in.
  const favorites = useQuery({ queryKey: ['favorites'], queryFn: listingsApi.favorites });
  const favorited = (favorites.data?.data ?? []).some((saved) => saved.id === id);

  const save = useMutation({
    mutationFn: () => (favorited ? listingsApi.removeFavorite(id) : listingsApi.addFavorite(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  /**
   * Messaging the seller opens the thread for this listing, or reopens the one
   * that already exists: the API keeps one thread per buyer per listing.
   */
  const block = useMutation({
    mutationFn: (sellerId: number) => blocksApi.block(sellerId),
    onSuccess: () => {
      // Their listings leave every list this account sees, including this one.
      void queryClient.invalidateQueries();
      router.replace('/(tabs)/home');
    },
    onError: (error) => setContactFailure(error instanceof Error ? error.message : String(error)),
  });

  const contact = useMutation({
    mutationFn: () => messagingApi.start(id),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push({ pathname: '/conversation/[id]', params: { id: conversation.id } });
    },
    onError: (error) => setContactFailure(error instanceof Error ? error.message : String(error)),
  });

  if (listing.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.huge }} />
      </Screen>
    );
  }

  // A listing can be gone, sold, or from someone this account has blocked.
  // Without this the screen spins forever on a 403 or a 404.
  if (!listing.data) {
    const gone =
      listing.error instanceof ApiError &&
      (listing.error.status === 403 || listing.error.status === 404);

    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            glyph={gone ? '🚗' : '⚠️'}
            title={gone ? t('listing:unavailable') : t('common:error_loading')}
            description={gone ? t('listing:unavailable_body') : undefined}
            actionLabel={gone ? t('listing:back_to_search') : t('common:retry')}
            onAction={() =>
              gone ? router.replace('/(tabs)/search') : void listing.refetch()
            }
          />
        </View>
      </Screen>
    );
  }

  const car = listing.data;
  const currency = countries.data?.find((c) => c.code === car.country_code)?.currency ?? 'EUR';
  const local = SHOW_LOCAL_CURRENCY
    ? formatLocal(car.price_eur, currency, byCurrency[currency])
    : undefined;

  const specs: Array<[keyof typeof Ionicons.glyphMap, string, string | null]> = [
    ['speedometer-outline', t('listing:mileage'), car.mileage_km !== null ? formatKm(car.mileage_km) : null],
    ['calendar-outline', t('listing:year'), car.year ? String(car.year) : null],
    ['flash-outline', t('listing:power'), car.power_hp ? `${car.power_hp} hp` : null],
    ['water-outline', t('listing:fuel_label'), car.fuel ? t(`listing:fuel.${car.fuel}`, car.fuel) : null],
    [
      'git-branch-outline',
      t('listing:transmission_label'),
      car.transmission ? t(`listing:transmission.${car.transmission}`, car.transmission) : null,
    ],
    ['car-outline', t('listing:body'), car.body_type ? t(`listing:body_type.${car.body_type}`, car.body_type) : null],
    ['browsers-outline', t('listing:doors'), car.doors ? String(car.doors) : null],
    ['people-outline', t('listing:seats'), car.seats ? String(car.seats) : null],
  ];

  return (
    <Screen flush scroll={false} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.topBar,
          {
            paddingHorizontal: theme.screenPadding,
            paddingVertical: theme.spacing.sm,
            gap: theme.spacing.md,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Pressable accessibilityRole="button" onPress={() => router.back()} testID="detail-back">
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>

        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {listingTitle(car)}
        </Text>

        <Pressable
          accessibilityRole="button"
          testID="share-listing"
          onPress={() => {
            void Share.share({ message: `${listingTitle(car)} — ${formatEur(car.price_eur)}` });
          }}
        >
          <Ionicons name="share-outline" size={24} color={theme.colors.text} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          testID="favorite-toggle"
          onPress={() => save.mutate()}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={24}
            color={favorited ? theme.colors.danger : theme.colors.text}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / width))
            }
          >
            {(car.photos.length > 0 ? car.photos : [null]).map((photo, index) => (
              <View
                key={photo?.id ?? index}
                style={{ width, height: width * 0.7, backgroundColor: theme.colors.skeleton }}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo.url }}
                    style={{ width, height: width * 0.7 }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : null}
              </View>
            ))}
          </ScrollView>

          {car.photos.length > 1 ? (
            <View style={[styles.counter, { bottom: theme.spacing.md, right: theme.spacing.md, backgroundColor: theme.colors.scrim }]}>
              <Text variant="caption" style={{ color: '#FFFFFF' }}>
                {photoIndex + 1} / {car.photos.length}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ padding: theme.screenPadding }}>
          <Text variant="title">{listingTitle(car)}</Text>
          {car.variant ? (
            <Text variant="meta" tone="muted" style={{ marginTop: 2 }}>
              {car.variant}
            </Text>
          ) : null}

          <Text variant="display" style={{ marginTop: theme.spacing.md }}>
            {formatEur(car.price_eur)}
          </Text>
          {local ? (
            <Text variant="body" tone="muted">
              {local}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
            {car.price_negotiable ? <Chip label={t('listing:negotiable')} /> : null}
            {car.customs_cleared ? <Chip label={t('listing:customs')} /> : null}
          </View>

          <Text variant="meta" tone="muted" style={{ marginTop: theme.spacing.md }}>
            {t('listing:views', { count: car.view_count })}
          </Text>

          <Text variant="title" style={{ marginTop: theme.spacing.xxl }}>
            {t('listing:specs')}
          </Text>

          <View style={[styles.specGrid, { marginTop: theme.spacing.md }]}>
            {specs
              .filter(([, , value]) => value !== null)
              .map(([icon, label, value]) => (
                <View key={label} style={[styles.spec, { marginBottom: theme.spacing.lg, gap: theme.spacing.md }]}>
                  <Ionicons name={icon} size={20} color={theme.colors.textMuted} />
                  <View style={{ flexShrink: 1 }}>
                    <Text variant="caption" tone="muted">
                      {label}
                    </Text>
                    <Text variant="bodyStrong">{value}</Text>
                  </View>
                </View>
              ))}
          </View>

          {car.description ? (
            <>
              <Text variant="title" style={{ marginTop: theme.spacing.lg }}>
                {t('listing:description')}
              </Text>
              <Text variant="body" style={{ marginTop: theme.spacing.sm }}>
                {car.description}
              </Text>
            </>
          ) : null}

          {car.features.length > 0 ? (
            <>
              <Text variant="title" style={{ marginTop: theme.spacing.xxl }}>
                {t('listing:features')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
                {car.features.map((feature) => (
                  <Chip key={feature} label={t(`listing:feature.${feature}`, feature.replace(/_/g, ' '))} />
                ))}
              </View>
            </>
          ) : null}

          <Text variant="title" style={{ marginTop: theme.spacing.xxl }}>
            {t('listing:seller')}
          </Text>

          <View
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text variant="bodyStrong">
              {car.seller?.dealer_name ?? car.seller?.display_name ?? ''}
            </Text>
            <Text variant="meta" tone="muted" style={{ marginTop: 2 }}>
              {car.seller?.seller_type === 'dealer' ? t('listing:dealer') : t('listing:private')}
            </Text>
            <Text variant="meta" tone="muted">
              {listingLocation(car)}
            </Text>
          </View>

          {/* Reporting tells us; blocking is what the buyer can do on their
              own, right now, without waiting for us. */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.xl, marginTop: theme.spacing.xl }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/report/${car.id}`)}
              testID="report-listing"
            >
              <Text variant="meta" tone="muted">
                {t('listing:report')}
              </Text>
            </Pressable>

            {car.seller ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmingBlock(true)}
                testID="block-seller"
              >
                <Text variant="meta" tone="muted">
                  {t('listing:block_seller')}
                </Text>
              </Pressable>
            ) : null}
          </View>

        </View>
      </ScrollView>

      {contactFailure ? (
        <Text
          variant="meta"
          tone="danger"
          style={{ paddingHorizontal: theme.screenPadding, paddingBottom: theme.spacing.sm }}
        >
          {contactFailure}
        </Text>
      ) : null}

      <ConfirmDialog
        open={confirmingBlock}
        title={t('listing:block_title')}
        body={t('listing:block_body')}
        confirmLabel={t('listing:block_confirm')}
        cancelLabel={t('common:cancel')}
        destructive
        loading={block.isPending}
        onCancel={() => setConfirmingBlock(false)}
        onConfirm={() => car.seller && block.mutate(car.seller.id)}
        testID="block-confirm"
      />

      <View
        style={[
          styles.actions,
          {
            padding: theme.screenPadding,
            paddingBottom: theme.spacing.xxl,
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            gap: theme.spacing.md,
          },
          theme.elevation.md,
        ]}
      >
        <Button
          label={t('listing:call')}
          size="lg"
          icon="call"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => {
            if (car.seller?.phone) {
              void Linking.openURL(`tel:${car.seller.phone}`);
            }
          }}
          testID="call-seller"
        />
        <Button
          label={t('listing:message')}
          size="lg"
          icon="mail"
          style={{ flex: 1 }}
          loading={contact.isPending}
          onPress={() => contact.mutate()}
          testID="message-seller"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  counter: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  spec: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
});
