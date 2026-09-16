import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  AppHeader,
  Fab,
  ListingCard,
  PromoBanner,
  Screen,
  SearchBar,
  Text,
  type ListingCardData,
} from '../../components';
import { useTheme } from '../../theme';

/**
 * Stand-ins until phase 9 wires this to GET /listings.
 */
function placeholders(offerLabel: string, crossBorderLabel: string): ListingCardData[] {
  return [
    {
      id: '1',
      title: 'Volkswagen Passat 2.0 TDI',
      priceEur: '8.950 €',
      priceNote: '1.094.000 ALL',
      specs: ['2016', 'Diesel', '168.000 km', 'Manual'],
      location: 'Prishtinë, XK',
      featured: true,
      featuredLabel: offerLabel,
      favorited: true,
    },
    {
      id: '2',
      title: 'Audi A4 Avant 2.0 TDI',
      priceEur: '12.400 €',
      priceNote: '762.000 MKD',
      specs: ['2018', 'Diesel', '121.000 km', 'Automatic'],
      location: 'Skopje, MK',
      crossBorder: true,
      crossBorderLabel,
      favorited: true,
    },
    {
      id: '3',
      title: 'Škoda Octavia 1.6 TDI',
      priceEur: '7.300 €',
      priceNote: '855.000 RSD',
      specs: ['2015', 'Diesel', '198.000 km', 'Manual'],
      location: 'Beograd, RS',
      crossBorder: true,
      crossBorderLabel,
      favorited: true,
    },
    {
      id: '4',
      title: 'BMW 320d Touring',
      priceEur: '14.900 €',
      priceNote: '29.100 BGN',
      specs: ['2019', 'Diesel', '96.000 km', 'Automatic'],
      location: 'Sofia, BG',
      crossBorder: true,
      crossBorderLabel,
      favorited: true,
    },
  ];
}

export default function HomeTab() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['home', 'common']);

  // Two columns and the gap between them fill the row exactly, on any screen.
  const gap = theme.spacing.md;
  const cardWidth = Math.floor((width - theme.screenPadding * 2 - gap) / 2);

  return (
    <Screen flush edges={['top']}>
      <AppHeader
        accountBadge
        unreadMessages
        onAccount={() => router.push('/(tabs)/profile')}
        onMessages={() => router.push('/(tabs)/messages')}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.screenPadding,
          paddingBottom: theme.spacing.huge,
          gap: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar
          title={t('home:search_placeholder')}
          hint={t('home:search_hint')}
          onPress={() => router.push('/(tabs)/search')}
        />

        <PromoBanner
          title={t('home:promo_title')}
          body={t('home:promo_body')}
          cta={t('home:promo_cta')}
          onPress={() => router.push('/(tabs)/sell')}
        />

        <View style={styles.sectionHeader}>
          <Text variant="display" style={{ fontSize: 24, lineHeight: 30 }}>
            {t('home:parked')}
          </Text>
          <Pressable accessibilityRole="button" style={styles.showAll}>
            <Text variant="bodyStrong" tone="accent">
              {t('home:show_all')}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={17}
              color={theme.colors.accent}
              style={{ marginLeft: theme.spacing.xs }}
            />
          </Pressable>
        </View>

        <View style={[styles.grid, { gap, marginTop: -theme.spacing.sm }]}>
          {placeholders(t('home:special_offer'), t('home:cross_border')).map((listing) => (
            <ListingCard key={listing.id} listing={listing} compact width={cardWidth} />
          ))}
        </View>
      </ScrollView>

      <Fab accessibilityLabel={t('common:continue')} onPress={() => router.push('/(tabs)/sell')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
