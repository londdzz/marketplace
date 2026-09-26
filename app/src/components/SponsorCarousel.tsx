import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import type { SponsorRow } from '../api/types';
import { useTheme } from '../theme';
import { Text } from './Text';

export type SponsorCarouselProps = {
  sponsors: readonly SponsorRow[];
  /** The screen's full width, not the content width: the rail is full-bleed. */
  width: number;
  /** The page gutter this sits inside, which the rail cancels out. */
  gutter: number;
  onPress: (sponsor: SponsorRow) => void;
  label: string;
  testID?: string;
};

/** 16:9, which is the shape a sponsor's designer will hand you without asking. */
const RATIO = 9 / 16;

/** Long enough to read a card, short enough that a second sponsor is seen. */
const DWELL_MS = 5000;

/**
 * The sponsors, one card at a time, swiped sideways.
 *
 * **The next card peeks at the right edge.** A full-width card with nothing
 * beside it looks like a single banner, and most people never try to swipe
 * it; a sliver of the next one is the whole of what says there are more.
 *
 * **It advances on its own, and stops the moment it is touched.** A carousel
 * that keeps moving under a thumb takes somebody to a sponsor they were not
 * reading, which is worse for the sponsor than being missed. It does not
 * start again afterwards either: the person is steering now.
 *
 * With one booking there is no rotation, no dots and no timer — a single
 * sponsor is a banner, and dressing it as a carousel of one is a lie about
 * how much is there.
 */
export function SponsorCarousel({ sponsors, width, gutter, onPress, label, testID }: SponsorCarouselProps) {
  const theme = useTheme();
  const scroller = useRef<ScrollView>(null);
  const [at, setAt] = useState(0);
  const [steering, setSteering] = useState(false);

  // Full-bleed, like the collection and shape rails: negative margin cancels
  // the page's gutter so the rail reaches both edges of the display, while
  // the content's own padding keeps the first card lined up with the headings
  // above it. That is what leaves room for the next card to sit half off the
  // right-hand edge — the first attempt padded inside a container that was
  // already inset, so the card was centred with nothing beside it and nothing
  // said it could be swiped at all.
  const gap = theme.spacing.sm;
  const card = width - gutter * 2 - theme.spacing.xl;
  const stride = card + gap;
  const many = sponsors.length > 1;

  useEffect(() => {
    if (!many || steering) {
      return;
    }

    const timer = setTimeout(() => {
      const next = (at + 1) % sponsors.length;
      scroller.current?.scrollTo({ x: next * stride, animated: true });
      setAt(next);
    }, DWELL_MS);

    return () => clearTimeout(timer);
  }, [at, many, sponsors.length, steering, stride]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(event.nativeEvent.contentOffset.x / stride);

      if (page !== at) {
        setAt(page);
      }
    },
    [at, stride],
  );

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <View testID={testID}>
      {/*
        Said once above the rail rather than stamped on every card. Both
        stores require an advertisement to be marked as one, and a label on
        the section is what a person actually reads — a badge in the corner of
        artwork somebody else designed competes with the artwork.
      */}
      <Text variant="caption" tone="subtle" style={{ marginBottom: theme.spacing.sm, letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Snapping to the stride rather than to the screen is what leaves the
        // next card peeking instead of centring each one.
        snapToInterval={stride}
        decelerationRate="fast"
        scrollEventThrottle={64}
        onScroll={onScroll}
        onScrollBeginDrag={() => setSteering(true)}
        style={{ marginHorizontal: -gutter }}
        contentContainerStyle={{ paddingHorizontal: gutter, gap }}
      >
        {sponsors.map((sponsor) => (
          <Pressable
            key={sponsor.id}
            accessibilityRole={sponsor.link_url ? 'link' : 'image'}
            // The description the sponsor gave, not the word "advertisement":
            // somebody listening deserves to know what is being advertised.
            accessibilityLabel={sponsor.alt}
            // A booking with no link bought presence, so it must not look
            // tappable and must not swallow a press that does nothing.
            disabled={!sponsor.link_url}
            onPress={() => onPress(sponsor)}
            style={{
              width: card,
              height: Math.round(card * RATIO),
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
              // Described on the Pressable above, so the picture itself is
              // skipped rather than read out twice.
              accessibilityElementsHidden
            />
          </Pressable>
        ))}
      </ScrollView>

      {many ? (
        <View style={[styles.dots, { gap: theme.spacing.xs, marginTop: theme.spacing.sm }]}>
          {sponsors.map((sponsor, index) => (
            <View
              key={sponsor.id}
              style={{
                height: 5,
                width: index === at ? 16 : 5,
                borderRadius: 999,
                backgroundColor: index === at ? theme.colors.accent : theme.colors.borderStrong,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
