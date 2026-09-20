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
   * How far the page has scrolled, in points. The bar lifts as it approaches
   * the top of the screen and settles once it has pinned there.
   */
  scrollY: SharedValue<number>;
  /** The scroll offset at which the bar reaches the top and stops moving. */
  pinAt: number;
  /** The page gutter, which the dock has to bleed past to reach both edges. */
  gutter: number;
};

/** The pill's height, which the layers behind and in front of it match. */
const PILL_HEIGHT = 46;

/** The gap kept above and below the pill, and so above it once pinned. */
const INSET = 8;

/**
 * The search bar at the top of the home screen, drawn as something that lifts
 * off the page once it pins there.
 *
 * Below the fold it is flat, like every other card on the screen. As the app
 * bar slides away and the search bar takes the top for itself, three things
 * arrive together: a gloss across its upper edge, a brighter outline, and a
 * hairline ruling off the strip it sits on. On a near-black page a shadow
 * alone is invisible, so the lift is carried by light rather than by dark —
 * the sheet shadow is kept underneath for the platforms where it does read.
 *
 * The gloss is a fixed highlight rather than a sweep: a shimmer running across
 * it on every scroll would be the loudest thing on a screen whose job is to
 * show cars.
 *
 * It owns the strip as well as the pill because the two only make sense
 * together — the strip is what stops the cars showing through beside a bar
 * that is floating over them.
 */
export function FloatingSearchBar({ scrollY, pinAt, gutter, ...bar }: FloatingSearchBarProps) {
  const theme = useTheme();

  // It starts lifting a little before it lands, so the shadow and the gloss
  // arrive with the movement rather than snapping on at the end of it.
  const lift = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [pinAt - 18, pinAt + 8], [0, 1], 'clamp'),
  }));

  return (
    <View
      style={{
        marginHorizontal: -gutter,
        paddingHorizontal: gutter,
        paddingVertical: INSET,
        backgroundColor: theme.colors.background,
      }}
      testID="home-search-dock"
    >
      <View style={styles.pill}>
        {/* Behind the bar, so the shadow has something opaque to fall from. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.layer,
            theme.elevation.sheet,
            { backgroundColor: theme.colors.surface },
            lift,
          ]}
        />

        <SearchBar {...bar} />

        <Animated.View pointerEvents="none" style={[styles.layer, styles.clip, lift]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="sheen" x1="0" y1="0" x2="0.45" y2="1">
                <Stop offset="0" stopColor={theme.colors.text} stopOpacity={0.16} />
                <Stop offset="0.5" stopColor={theme.colors.text} stopOpacity={0.04} />
                <Stop offset="1" stopColor={theme.colors.text} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#sheen)" />
          </Svg>
        </Animated.View>

        {/* The outline the gloss needs to sit inside, drawn over the bar's own
            so the edge brightens rather than doubling. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.layer,
            { borderWidth: 1, borderColor: theme.colors.borderStrong },
            lift,
          ]}
        />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.rule, { backgroundColor: theme.colors.border }, lift]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  clip: {
    overflow: 'hidden',
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
