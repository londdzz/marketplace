import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { Text } from './Text';

export type PhotoViewerProps = {
  photos: { id: string; url: string }[];
  /** Which one the buyer tapped. */
  index: number;
  visible: boolean;
  onClose: () => void;
};

/** What a double tap, or a pinch let go of, settles on. */
const ZOOMED = 2.5;

/**
 * A car's photographs, full screen.
 *
 * Drawn `contain` rather than `cover`: the carousel on the listing crops to a
 * tidy 16:10 band, and the whole reason for opening a photograph is to see the
 * parts that band cut off — a sill, a bumper corner, the boot floor.
 *
 * Zoom is not a flourish here. A buyer is looking for kerbed alloys and paint
 * that does not match, and none of that is visible at a phone's width. Double
 * tap goes in and out; pinch is free-form. While a photograph is zoomed the
 * pager is disabled, so dragging around the picture cannot skip to the next
 * car — and letting go at 1× hands paging straight back.
 */
export function PhotoViewer({ photos, index, visible, onClose }: PhotoViewerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const pager = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(index);
  const [zoomed, setZoomed] = useState(false);

  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  // Where the gesture started, so a second pinch continues from the last one.
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Opening on the photograph that was tapped, not on the first one.
  useEffect(() => {
    if (!visible) {
      return;
    }

    setCurrent(index);
    reset();
    // Laid out before it can be scrolled, so this waits a frame.
    const timer = setTimeout(() => pager.current?.scrollTo({ x: index * width, animated: false }), 0);

    return () => clearTimeout(timer);
  }, [visible, index, width]);

  function reset() {
    scale.value = withTiming(1);
    offsetX.value = withTiming(0);
    offsetY.value = withTiming(0);
    setZoomed(false);
  }

  /** Beyond this the picture would be dragged off the screen entirely. */
  function clamp(value: number, limit: number): number {
    'worklet';

    return Math.min(Math.max(value, -limit), limit);
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(startScale.value * event.scale, 1), 6);
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        scale.value = withTiming(1);
        offsetX.value = withTiming(0);
        offsetY.value = withTiming(0);
        runOnJS(setZoomed)(false);
      } else {
        runOnJS(setZoomed)(true);
      }
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1) {
        return;
      }

      const spare = (scale.value - 1) / 2;
      offsetX.value = clamp(startX.value + event.translationX, width * spare);
      offsetY.value = clamp(startY.value + event.translationY, height * spare);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        offsetX.value = withTiming(0);
        offsetY.value = withTiming(0);
        runOnJS(setZoomed)(false);
      } else {
        scale.value = withTiming(ZOOMED);
        runOnJS(setZoomed)(true);
      }
    });

  // Pinch can always run. A one-finger touch is either a double tap or a drag,
  // and the drag is only live while zoomed — at 1x a sideways swipe belongs to
  // the pager, and a pan competing for it is why swiping felt dead.
  const gesture = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan.enabled(zoomed)));

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      // The photograph should have the whole screen, including behind the
      // status bar. Android needs telling separately.
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: '#000000' }]}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          // onScroll rather than onMomentumScrollEnd, which React Native Web
          // does not implement: the counter would sit on 1 for ever in the web
          // preview, and a thing that cannot be checked is a thing that breaks
          // quietly. It also reads better on a phone, since the number turns
          // over as the next photograph arrives rather than once it lands.
          scrollEventThrottle={16}
          onScroll={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);

            if (next !== current && next >= 0 && next < photos.length) {
              setCurrent(next);
              reset();
            }
          }}
        >
          {photos.map((photo, position) => (
            <GestureDetector key={photo.id} gesture={gesture}>
              <Animated.View style={[{ width, height }, position === current ? zoomStyle : null]}>
                <Image
                  source={{ uri: photo.url }}
                  style={{ width, height }}
                  contentFit="contain"
                  transition={120}
                  accessibilityIgnoresInvertColors
                />
              </Animated.View>
            </GestureDetector>
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={12}
          style={[
            styles.close,
            { top: insets.top + theme.spacing.sm, left: theme.spacing.md, backgroundColor: theme.colors.scrim },
          ]}
          testID="photo-close"
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>

        {zoomed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            onPress={reset}
            hitSlop={12}
            style={[
              styles.close,
              {
                top: insets.top + theme.spacing.sm,
                right: theme.spacing.md,
                backgroundColor: theme.colors.scrim,
              },
            ]}
            testID="photo-zoom-out"
          >
            <Ionicons name="contract-outline" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {photos.length > 1 ? (
          <View
            style={[
              styles.counter,
              {
                bottom: insets.bottom + theme.spacing.lg,
                backgroundColor: theme.colors.scrim,
              },
            ]}
          >
            <Text variant="caption" style={{ color: '#FFFFFF' }}>
              {current + 1} / {photos.length}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  close: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
