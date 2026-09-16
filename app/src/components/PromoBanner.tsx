import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type PromoBannerProps = {
  title: string;
  body: string;
  cta: string;
  onPress?: () => void;
};

/**
 * The wide card under the search bar.
 *
 * The reference app sells this space to advertisers; we use it to explain how
 * selling works, which is the thing a new seller most needs to know. It does
 * not carry their little information and menu buttons: those belong to an
 * advertisement, and on our own card they would do nothing.
 */
export function PromoBanner({ title, body, cta, onPress }: PromoBannerProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID="promo-banner"
      style={{
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.banner,
        padding: theme.spacing.xl,
        justifyContent: 'flex-end',
      }}
    >
      <Text variant="title" style={{ maxWidth: '85%', color: theme.colors.bannerText }}>
        {title}
      </Text>
      <Text variant="body" style={{ marginTop: theme.spacing.xs, color: theme.colors.bannerText, opacity: 0.92 }}>
        {body}
      </Text>

      <View
        style={[
          styles.cta,
          {
            marginTop: theme.spacing.lg,
            gap: theme.spacing.xs,
            alignSelf: 'flex-start',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radius.full,
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
          },
        ]}
      >
        <Text variant="label" style={{ color: theme.colors.bannerText }}>
          {cta}
        </Text>
        <Ionicons name="arrow-forward" size={15} color={theme.colors.bannerText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
