import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import type { SponsorRow } from '../api/types';
import { useTheme } from '../theme';
import { Text } from './Text';

export type PartnerStripProps = {
  partners: readonly SponsorRow[];
  onPress: (sponsor: SponsorRow) => void;
  label: string;
  testID?: string;
};

/**
 * The row of marks at the foot of the home screen.
 *
 * The quiet tier: presence rather than a headline, for the sponsor who wants
 * to be seen beside the product rather than to be clicked. Four across a
 * phone, wrapping to a second line beyond that, and `contain` rather than
 * `cover` because a logo cropped to fill a box is a logo nobody recognises.
 */
export function PartnerStrip({ partners, onPress, label, testID }: PartnerStripProps) {
  const theme = useTheme();

  if (partners.length === 0) {
    return null;
  }

  return (
    <View
      testID={testID}
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      <Text variant="caption" tone="subtle" style={{ letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {partners.map((partner) => (
          <Pressable
            key={partner.id}
            accessibilityRole={partner.link_url ? 'link' : 'image'}
            accessibilityLabel={partner.alt}
            disabled={!partner.link_url}
            onPress={() => onPress(partner)}
            style={{
              // Four to a row whatever the phone's width, the gaps taken off
              // first so the last one never wraps on its own.
              flexBasis: `${100 / 4}%`,
              flexGrow: 1,
              maxWidth: '25%',
              height: 44,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surfaceMuted,
              borderWidth: 1,
              borderColor: theme.colors.border,
              overflow: 'hidden',
            }}
          >
            <Image
              source={{ uri: partner.image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={140}
              accessibilityElementsHidden
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
