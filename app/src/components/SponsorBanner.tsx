import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import type { SponsorRow } from '../api/types';
import { useTheme } from '../theme';
import { Text } from './Text';

export type SponsorBannerProps = {
  sponsor: SponsorRow;
  onPress: (sponsor: SponsorRow) => void;
  label: string;
  testID?: string;
};

/** The same shape as the card it replaces, so the page does not jump. */
const RATIO = 104 / 358;

/**
 * The wide card under the search bar, when a sponsor has it.
 *
 * It takes the place of the card explaining how selling works, which comes
 * back the moment the booking ends — the slot is never an empty box, and the
 * explainer is not lost, only displaced. Same height either way, so the
 * screen below it does not move when a booking starts.
 */
export function SponsorBanner({ sponsor, onPress, label, testID }: SponsorBannerProps) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole={sponsor.link_url ? 'link' : 'image'}
      accessibilityLabel={sponsor.alt}
      disabled={!sponsor.link_url}
      onPress={() => onPress(sponsor)}
      style={{
        aspectRatio: 1 / RATIO,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.surfaceMuted,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Image
        source={{ uri: sponsor.image_url }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={180}
        accessibilityElementsHidden
      />

      {/*
        On the artwork rather than above it, because this card has no section
        header to hang a label from. Dark pill at low opacity: legible over
        whatever the sponsor sent, and quiet enough not to fight it.
      */}
      <View
        style={[
          styles.tag,
          {
            top: theme.spacing.sm,
            right: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
            borderRadius: theme.radius.full,
          },
        ]}
      >
        <Text variant="caption" style={{ color: '#EDF2F1' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: { position: 'absolute', backgroundColor: 'rgba(0, 0, 0, 0.45)' },
});
