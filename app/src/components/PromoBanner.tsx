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
 * selling works, which is the thing a new seller most needs to know. It keeps
 * the same shape and the same information and menu affordances, so the slot can
 * hold a real advertisement later without the layout changing.
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
        minHeight: 168,
        justifyContent: 'flex-end',
      }}
    >
      <View style={[styles.controls, { top: theme.spacing.sm, right: theme.spacing.sm, gap: theme.spacing.xs }]}>
        <View style={[styles.control, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm }]}>
          <Ionicons name="information-circle-outline" size={15} color={theme.colors.textMuted} />
        </View>
        <View style={[styles.control, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm }]}>
          <Ionicons name="ellipsis-vertical" size={15} color={theme.colors.textMuted} />
        </View>
      </View>

      <Text variant="display" style={{ maxWidth: '85%', color: theme.colors.bannerText }}>
        {title}
      </Text>
      <Text variant="body" style={{ marginTop: theme.spacing.xs, color: theme.colors.bannerText, opacity: 0.92 }}>
        {body}
      </Text>

      <View style={[styles.cta, { marginTop: theme.spacing.lg, gap: theme.spacing.xs }]}>
        <Text variant="bodyStrong" style={{ color: theme.colors.bannerText }}>
          {cta}
        </Text>
        <Ionicons name="arrow-forward" size={17} color={theme.colors.bannerText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    flexDirection: 'row',
  },
  control: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
