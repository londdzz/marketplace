import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

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
function placeholders(offerLabel: string): ListingCardData[] {
  return [
    {
      id: '1',
      title: 'Volkswagen Passat 2.0 TDI',
      priceEur: '8.950 €',
      priceNote: '1.094.000 ALL',
      specs: ['2016', 'Diesel', '150 hp', '168.000 km', 'Manual'],
      location: '10000 Prishtinë, Kosovë',
      featured: true,
      featuredLabel: offerLabel,
      favorited: true,
    },
    {
      id: '2',
      title: 'Audi A4 Avant 2.0 TDI',
      priceEur: '12.400 €',
      priceNote: '762.000 MKD',
      specs: ['2018', 'Diesel', '190 hp', '121.000 km', 'Automatic'],
      location: '1000 Skopje, North Macedonia',
      crossBorder: true,
    },
  ];
}

export default function HomeTab() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['home', 'common']);

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

        <View style={{ gap: theme.spacing.xxxl, marginTop: -theme.spacing.sm }}>
          {placeholders(t('home:special_offer')).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </View>
      </ScrollView>

      <Fab
        accessibilityLabel={t('common:continue')}
        onPress={() => router.push('/(tabs)/sell')}
      />
    </Screen>
  );
}

const styles = {
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  showAll: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
};
