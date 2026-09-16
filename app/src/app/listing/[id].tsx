import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { listingsApi } from '../../api/listings';
import { referenceApi } from '../../api/reference';
import { Button, Chip, Screen, Text } from '../../components';
import { formatEur, formatKm, formatLocal, listingLocation, listingTitle } from '../../format';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useTheme } from '../../theme';

export default function ListingDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(['listing', 'home', 'common']);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [favorited, setFavorited] = useState(false);

  const listing = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.show(id),
    enabled: Boolean(id),
  });

  const { byCurrency } = useExchangeRates();
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });

  if (listing.isLoading || !listing.data) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.huge }} />
      </Screen>
    );
  }

  const car = listing.data;
  const currency = countries.data?.find((c) => c.code === car.country_code)?.currency ?? 'EUR';
  const local = formatLocal(car.price_eur, currency, byCurrency[currency]);

  const specs: Array<[string, string | null]> = [
    [t('listing:year'), car.year ? String(car.year) : null],
    [t('listing:mileage'), car.mileage_km !== null ? formatKm(car.mileage_km) : null],
    [t('listing:fuel_label'), car.fuel ? t(`listing:fuel.${car.fuel}`, car.fuel) : null],
    [
      t('listing:transmission_label'),
      car.transmission ? t(`listing:transmission.${car.transmission}`, car.transmission) : null,
    ],
    [t('listing:power'), car.power_hp ? `${car.power_hp} hp` : null],
    [t('listing:body'), car.body_type ? t(`listing:body_type.${car.body_type}`, car.body_type) : null],
    [t('listing:doors'), car.doors ? String(car.doors) : null],
    [t('listing:seats'), car.seats ? String(car.seats) : null],
  ];

  return (
    <Screen flush scroll={false} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

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

          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.round, { top: theme.spacing.md, left: theme.spacing.md, backgroundColor: theme.colors.surface }]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            testID="favorite-toggle"
            onPress={() => setFavorited((value) => !value)}
            style={[
              styles.round,
              {
                top: theme.spacing.md,
                right: theme.spacing.md,
                backgroundColor: favorited ? theme.colors.success : theme.colors.surface,
              },
            ]}
          >
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={22}
              color={favorited ? '#FFFFFF' : theme.colors.text}
            />
          </Pressable>

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
            <Chip label={t('listing:views', { count: car.view_count })} />
          </View>

          <Text variant="heading" tone="muted" style={{ marginTop: theme.spacing.xxl }}>
            {t('listing:specs')}
          </Text>

          <View style={[styles.specGrid, { marginTop: theme.spacing.md }]}>
            {specs
              .filter(([, value]) => value !== null)
              .map(([label, value]) => (
                <View key={label} style={{ width: '50%', marginBottom: theme.spacing.md }}>
                  <Text variant="caption" tone="subtle">
                    {label}
                  </Text>
                  <Text variant="bodyStrong">{value}</Text>
                </View>
              ))}
          </View>

          {car.description ? (
            <>
              <Text variant="heading" tone="muted" style={{ marginTop: theme.spacing.lg }}>
                {t('listing:description')}
              </Text>
              <Text variant="body" style={{ marginTop: theme.spacing.sm }}>
                {car.description}
              </Text>
            </>
          ) : null}

          {car.features.length > 0 ? (
            <>
              <Text variant="heading" tone="muted" style={{ marginTop: theme.spacing.xxl }}>
                {t('listing:features')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
                {car.features.map((feature) => (
                  <Chip key={feature} label={t(`listing:feature.${feature}`, feature.replace(/_/g, ' '))} />
                ))}
              </View>
            </>
          ) : null}

          <Text variant="heading" tone="muted" style={{ marginTop: theme.spacing.xxl }}>
            {t('listing:seller')}
          </Text>

          <View
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surface,
              borderWidth: StyleSheet.hairlineWidth * 2,
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

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/report/${car.id}`)}
            style={{ marginTop: theme.spacing.xl, alignSelf: 'flex-start' }}
          >
            <Text variant="meta" tone="muted">
              {t('listing:report')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

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
        ]}
      >
        <Button
          label={t('listing:message')}
          size="lg"
          style={{ flex: 1 }}
          onPress={() => router.push('/(tabs)/messages')}
        />
        <Button
          label={t('listing:call')}
          variant="secondary"
          size="lg"
          style={{ flex: 1 }}
          onPress={() => {
            if (car.seller?.phone) {
              void Linking.openURL(`tel:${car.seller.phone}`);
            }
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  round: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
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
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
