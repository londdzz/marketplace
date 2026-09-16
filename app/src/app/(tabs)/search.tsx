import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { ListingCard, Screen, Text, type ListingCardData } from '../../components';
import { useTheme } from '../../theme';

/**
 * The landing screen: a search bar, then cars.
 *
 * The real results arrive in phase 9, wired to GET /listings. These stand-ins
 * are here so the layout can be judged now.
 */
const PLACEHOLDER: ListingCardData[] = [
  {
    id: '1',
    title: 'Volkswagen Passat 2.0 TDI',
    priceEur: '8.950 €',
    priceLocal: '1.094.000 ALL',
    specs: ['2016', 'Diesel', '150 hp', '168.000 km', 'Manual'],
    location: 'Prishtinë, Kosovë',
    featured: true,
    favorited: true,
  },
  {
    id: '2',
    title: 'Audi A4 Avant 2.0 TDI',
    priceEur: '12.400 €',
    priceLocal: '762.000 MKD',
    specs: ['2018', 'Diesel', '190 hp', '121.000 km', 'Automatic'],
    location: 'Skopje, North Macedonia',
    crossBorder: true,
  },
];

export default function SearchTab() {
  const theme = useTheme();
  const { t } = useTranslation(['home', 'tabs']);

  return (
    <Screen flush edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.screenPadding,
          paddingBottom: theme.spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="search"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            marginTop: theme.spacing.md,
          }}
        >
          <Ionicons name="search" size={22} color={theme.colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('home:search_placeholder')}</Text>
            <Text variant="meta" tone="muted">
              {t('home:search_hint')}
            </Text>
          </View>
        </Pressable>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: theme.spacing.xxl,
            marginBottom: theme.spacing.md,
          }}
        >
          <Text variant="title">{t('home:saved')}</Text>
          <Pressable accessibilityRole="button">
            <Text variant="label" tone="accent">
              {t('home:show_all')}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          {PLACEHOLDER.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
