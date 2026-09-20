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
};

/** The pill's height, which the layers behind and in front of it match. */
const PILL_HEIGHT = 46;

/** The gap kept above and below the pill, and so above it once pinned. */
const INSET = 8;

/**
 * The search bar at the top of the home screen, drawn as something that lifts
 * off the page once it pins there.
 *
 * Nothing is drawn behind it. The pill alone stays on screen and the cars run
 * underneath it, into the gutters beside it and through the gap above it — a
 * strip carrying the bar reads as a box stuck to the top of the screen, which
 * is the opposite of floating.
 *
 * Below the fold it is flat, like every other card. As the app bar slides away
 * and the search bar takes the top for itself, it gains a gloss across its
 * upper edge, a brighter outline and the sheet shadow, which now has a
 * photograph to fall on rather than a near-black page.
 *
 * The gloss is a fixed highlight rather than a sweep: a shimmer running across
 * it on every scroll would be the loudest thing on a screen whose job is to
 * show cars.
 */
export function FloatingSearchBar({ scrollY, pinAt, ...bar }: FloatingSearchBarProps) {
  const theme = useTheme();

  // It starts lifting a little before it lands, so the shadow and the gloss
  // arrive with the movement rather than snapping on at the end of it.
  const lift = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [pinAt - 18, pinAt + 8], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.dock} testID="home-search-dock">
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
  clip: {
    overflow: 'hidden',
  },
});
