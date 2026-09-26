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

/** Four to a row is what fits a phone before a wordmark stops being readable. */
const PER_ROW = 4;

/** One height for all of them, which is what makes a row of marks read as a row. */
const MARK_HEIGHT = 26;

/**
 * The row of marks at the foot of the home screen.
 *
 * **No box around each logo.** The first version gave every one a bordered,
 * filled tile, and a logo inside a frame on a dark page reads as a picture
 * that failed to load — the eye sees the frame first and the mark second. A
 * partner row is marks on the page, spaced evenly, and nothing else.
 *
 * **Every mark is drawn to the same height, not to the same width.** Given an
 * equal share of the row each, a short mark scales up to fill its share and
 * comes out twice the size of the long one beside it — which is most of what
 * makes a partner row look amateur. So the height is fixed and each takes the
 * width its own proportions ask for, spaced out along the row. A mark stored
 * before the API measured them falls back to an equal share.
 *
 * Fixed quarter-width columns were the first attempt, and left a hole where
 * the fourth would have been whenever three were booked.
 *
 * **They are dimmed a little.** These are other people's marks in other
 * people's colours, at the foot of a screen whose job is to show cars. Full
 * strength, four of them out-shout everything above. A press brings the one
 * being pressed up to full, which is also what says it is a link.
 */
export function PartnerStrip({ partners, onPress, label, testID }: PartnerStripProps) {
  const theme = useTheme();

  if (partners.length === 0) {
    return null;
  }

  // Balanced rows rather than a full row and a remainder: five partners go
  // three and two, not four and one, because one mark alone on a line reads
  // as an afterthought.
  const rows = Math.ceil(partners.length / PER_ROW);
  const perRow = Math.ceil(partners.length / rows);
  const lines: SponsorRow[][] = [];

  for (let at = 0; at < partners.length; at += perRow) {
    lines.push(partners.slice(at, at + perRow) as SponsorRow[]);
  }

  return (
    <View
      testID={testID}
      style={{
        gap: theme.spacing.md,
        alignItems: 'center',
        // A hairline above rather than a card around. This is a foot to the
        // page, not another thing on it, and a card here would be a third
        // bordered block under two rows that are already bordered blocks.
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.xl,
        marginTop: theme.spacing.sm,
      }}
    >
      <Text variant="caption" tone="subtle" style={{ letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>

      {lines.map((line, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            // Spread along the line rather than packed, so a row of three and
            // a row of five both sit evenly under the label.
            justifyContent: 'space-between',
            gap: theme.spacing.lg,
            alignSelf: 'stretch',
          }}
        >
          {line.map((partner) => {
            const ratio = partner.width && partner.height ? partner.width / partner.height : null;

            return (
              <Pressable
                key={partner.id}
                accessibilityRole={partner.link_url ? 'link' : 'image'}
                accessibilityLabel={partner.alt}
                disabled={!partner.link_url}
                onPress={() => onPress(partner)}
                style={({ pressed }) => ({
                  height: MARK_HEIGHT,
                  // Asks for the width its own proportions want, and gives it
                  // up when the row cannot spare it: a long wordmark then
                  // comes out shorter than the height rather than pushing the
                  // mark beside it off the screen. `contain` keeps it in
                  // proportion whatever width it ends up with.
                  flexGrow: 0,
                  flexShrink: 1,
                  ...(ratio ? { flexBasis: MARK_HEIGHT * ratio } : { flexGrow: 1, flexBasis: 0 }),
                  opacity: pressed ? 1 : 0.72,
                })}
              >
                <Image
                  source={{ uri: partner.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  // Never cover: a logo cropped to fill its space is a logo
                  // nobody recognises.
                  contentFit="contain"
                  transition={140}
                  accessibilityElementsHidden
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
