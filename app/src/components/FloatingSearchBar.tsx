import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../theme';
import { SearchBar, type SearchBarProps } from './SearchBar';

export type FloatingSearchBarProps = SearchBarProps & {
  /**
   * How far the page has scrolled, in points. The bar turns to glass as it
   * approaches the top of the screen and settles once it has pinned there.
   */
  scrollY: SharedValue<number>;
  /** The scroll offset at which the bar reaches the top and stops moving. */
  pinAt: number;
};

/** The pill's height, which every layer behind and in front of it matches. */
const PILL_HEIGHT = 46;

/** The gap kept above and below the pill, and so above it once pinned. */
const INSET = 8;

/**
 * How hard the page is blurred behind the glass, on expo-blur's 0 to 100.
 * Enough that a car passing underneath is colour and movement rather than a
 * shape competing with the field's own text.
 */
const BLUR = 72;

/**
 * The search bar at the top of the home screen, which turns to glass as it
 * takes the top for itself.
 *
 * Nothing is drawn behind the pill, so the cars run underneath it, into the
 * gutters beside it and through the gap above it: a strip carrying the bar
 * reads as a box stuck to the top of the screen, which is the opposite of
 * floating.
 *
 * The pill itself is solid while it is still part of the page, and becomes
 * translucent as it lifts off it — the fill fades out to leave the blur and
 * the glass tint that were behind it all along, and a lit edge and a gloss
 * arrive to give the material a thickness. A blur alone is a smear; the edge
 * is what makes it read as a pane with something behind it.
 *
 * The gloss is a fixed highlight rather than a sweep: a shimmer running across
 * it on every scroll would be the loudest thing on a screen whose job is to
 * show cars.
 *
 * There is no drop shadow. A shadow needs an opaque caster, which is the one
 * thing this cannot have, and on a near-black page it cast nothing worth
 * keeping anyway.
 */
export function FloatingSearchBar({ scrollY, pinAt, ...bar }: FloatingSearchBarProps) {
  const theme = useTheme();

  // It starts turning a little before it lands, so the material changes with
  // the movement rather than snapping over at the end of it.
  const lift = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [pinAt - 18, pinAt + 8], [0, 1], 'clamp'),
  }));

  // The solid fill goes the other way, uncovering the glass underneath it.
  const solid = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [pinAt - 18, pinAt + 8], [1, 0], 'clamp'),
  }));

  return (
    <View style={styles.dock} testID="home-search-dock">
      <View style={styles.pill}>
        {/* The glass, clipped to the pill: the page blurred, then tinted far
            enough that muted placeholder type holds up over a bright
            photograph sliding past underneath. */}
        <View pointerEvents="none" style={[styles.layer, styles.clip]}>
          <BlurView
            intensity={BLUR}
            tint={theme.isDark ? 'dark' : 'light'}
            // Android draws no blur at all without this.
            experimentalBlurMethod="dimezisBlurView"
            style={styles.fill}
          />
          <View style={[styles.fill, { backgroundColor: theme.colors.glass }]} />

          <Animated.View style={[styles.fill, lift]}>
            <Svg width="100%" height="100%">
              <Defs>
                {/* The light raking across the pane. */}
                <LinearGradient id="sheen" x1="0" y1="0" x2="0.45" y2="1">
                  <Stop offset="0" stopColor={theme.colors.text} stopOpacity={0.15} />
                  <Stop offset="0.5" stopColor={theme.colors.text} stopOpacity={0.04} />
                  <Stop offset="1" stopColor={theme.colors.text} stopOpacity={0} />
                </LinearGradient>
                {/* The lit top edge, which is where a pane of glass catches
                    the light and how the eye reads its thickness. Drawn
                    inside the clip, so it follows the pill's curve without
                    anything having to measure it. */}
                <LinearGradient id="crown" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.colors.text} stopOpacity={0.34} />
                  <Stop offset="0.08" stopColor={theme.colors.text} stopOpacity={0.10} />
                  <Stop offset="0.4" stopColor={theme.colors.text} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#sheen)" />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#crown)" />
            </Svg>
          </Animated.View>
        </View>

        {/* Over the glass while the bar is still part of the page, so at rest
            it looks like every other control rather than like a pane over a
            flat colour, which is all glass can be with nothing behind it. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.layer, { backgroundColor: theme.colors.surface }, solid]}
        />

        <SearchBar translucent {...bar} />

        {/* Two edges, one fading into the other: the hairline every control
            wears, and the lit one that gives the glass its thickness. */}
        <View
          pointerEvents="none"
          style={[styles.layer, { borderWidth: 1, borderColor: theme.colors.border }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.layer, { borderWidth: 1, borderColor: theme.colors.glassEdge }, lift]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    paddingVertical: INSET,
  },
  pill: {
    height: PILL_HEIGHT,
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  clip: {
    overflow: 'hidden',
  },
});
