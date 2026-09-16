import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Screen, Text } from '../../components';
import { useSell } from '../../sell/SellProvider';
import { useTheme } from '../../theme';

/**
 * The end of the flow. The listing is live, the credit is spent, and the draft
 * is cleared so the next car starts from nothing.
 */
export default function SellPublishedScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('sell');
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { clear } = useSell();

  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.successMuted,
          }}
        >
          <Ionicons name="checkmark" size={40} color={theme.colors.success} />
        </View>

        <Text variant="display" style={{ textAlign: 'center' }}>
          {t('published')}
        </Text>
        <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
          {t('published_body')}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
        {id ? (
          <Button
            label={t('view_listing')}
            block
            size="lg"
            onPress={() => router.replace({ pathname: '/listing/[id]', params: { id } })}
          />
        ) : null}
        <Button
          label={t('my_listings')}
          variant="secondary"
          block
          size="lg"
          onPress={() => router.replace('/(tabs)/sell')}
        />
      </View>
    </Screen>
  );
}
