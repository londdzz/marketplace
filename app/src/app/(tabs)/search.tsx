import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ListingCard, Screen, SearchBar, type ListingCardData } from '../../components';
import { useTheme } from '../../theme';

/**
 * Results. Phase 9 replaces these stand-ins with GET /listings, adds the filter
 * chips above them and the filter sheet behind those.
 */
const PLACEHOLDER: ListingCardData[] = [
  {
    id: '1',
    title: 'Volkswagen Passat 2.0 TDI',
    priceEur: '8.950 €',
    priceNote: '1.094.000 ALL',
    specs: ['2016', 'Diesel', '150 hp', '168.000 km', 'Manual'],
    location: '10000 Prishtinë, Kosovë',
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

export default function SearchTab() {
  const theme = useTheme();
  const { t } = useTranslation('home');

  return (
    <Screen flush edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.huge,
          gap: theme.spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar title={t('search_placeholder')} hint={t('search_hint')} />

        {PLACEHOLDER.map((listing) => (
          <View key={listing.id}>
            <ListingCard listing={listing} />
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
