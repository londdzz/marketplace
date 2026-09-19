import { useCallback, useRef, useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';

export type SliderBand = {
  low: number;
  high: number;
};

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  /** Whole numbers only by default, because a credit cannot be halved. */
  step?: number;
  onChange: (value: number) => void;
  /**
   * A range to mark on the track, such as what other sellers spend. It is
   * drawn as two notches over everything else rather than as a shaded
   * segment, because a segment vanishes the moment the fill passes it — and
   * the range is most worth seeing exactly when the value has gone beyond it.
   */
  band?: SliderBand | null;
  accessibilityLabel?: string;
  style?: ViewStyle;
  testID?: string;
};

/** The circle under the thumb, and the padding that keeps it on the track. */
const THUMB = 26;

/** A touch target that a thumb of 26 does not fill on its own. */
const TOUCH_HEIGHT = 44;

const TRACK_HEIGHT = 6;

/** The notches that mark the range, wide enough to see and no wider. */
const TICK_WIDTH = 2;

/**
 * A value dragged left to right.
 *
 * Built on the responder system rather than a package: this is one track, one
 * thumb and an optional shaded range, and a dependency for that would be more
 * to keep current than to maintain. The thumb is only ever drawn at a step, so
 * what the finger does and what the readout says never disagree.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  band,
  accessibilityLabel,
  style,
  testID,
}: SliderProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  // The last value handed out, so a drag across a step's width does not call
  // back on every pixel of it.
  const last = useRef(value);

  const span = Math.max(max - min, 0);
  const track = Math.max(width - THUMB, 1);

  /** Where a value sits along the track, 0 at the left and 1 at the right. */
  const ratioOf = useCallback(
    (at: number) => (span === 0 ? 0 : (Math.min(Math.max(at, min), max) - min) / span),
    [max, min, span],
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const moveTo = useCallback(
    (event: GestureResponderEvent) => {
      if (span === 0) {
        return;
      }

      const ratio = Math.min(Math.max((event.nativeEvent.locationX - THUMB / 2) / track, 0), 1);
      const stepped = Math.round((min + ratio * span) / step) * step;
      const next = Math.min(Math.max(stepped, min), max);

      if (next !== last.current) {
        last.current = next;
        onChange(next);
      }
    },
    [max, min, onChange, span, step, track],
  );

  const nudge = useCallback(
    (by: number) => {
      const next = Math.min(Math.max(value + by * step, min), max);

      if (next !== value) {
        last.current = next;
        onChange(next);
      }
    },
    [max, min, onChange, step, value],
  );

  const filled = ratioOf(value) * track;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => nudge(event.nativeEvent.actionName === 'decrement' ? -1 : 1)}
      testID={testID}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={moveTo}
      onResponderMove={moveTo}
      onResponderTerminationRequest={() => false}
      style={[styles.touch, { paddingHorizontal: THUMB / 2 }, style]}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: theme.colors.borderStrong, borderRadius: theme.radius.full },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            {
              width: filled,
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.full,
            },
          ]}
        />

        {/* Over the fill, so the range still reads once the value passes it. */}
        {band && span > 0
          ? [band.low, band.high].map((at) => (
              <View
                key={at}
                pointerEvents="none"
                style={[
                  styles.tick,
                  {
                    left: Math.min(ratioOf(at) * track, track - TICK_WIDTH),
                    backgroundColor: theme.colors.background,
                  },
                ]}
              />
            ))
          : null}
      </View>

      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          theme.elevation.sheet,
          {
            left: filled,
            backgroundColor: theme.colors.text,
            borderRadius: theme.radius.full,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  touch: {
    height: TOUCH_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    overflow: 'hidden',
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: TICK_WIDTH,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    top: (TOUCH_HEIGHT - THUMB) / 2,
  },
});
