import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from './Text';
import { useTheme } from '../theme';

export type BodyTypeTileProps = {
  label: string;
  /** How many live cars have this shape. From the API or it is not shown. */
  count: string;
  shape: string;
  /** A cut-out of a car of this shape. Falls back to the drawing without one. */
  image?: ImageSource | number | null;
  width: number;
  onPress: () => void;
  testID?: string;
};

/**
 * Each shape drawn side on: the body and its glass as one line, and the wheels
 * as two circles the body sits on.
 *
 * A shape with a cut-out car of its own shows that instead. The drawing is
 * what every shape starts with, so a row is never half-finished: one with art
 * and one without sit at the same height, because both are centred in a box of
 * the same size.
 *
 * What the drawing must not be is a photograph of a car in a street. Each of
 * these stands for every car of its shape, and a photograph means one
 * particular car — which is why the fallback is a line and the art, when it
 * comes, is a studio cut-out rather than a scene.
 */
type Drawing = {
  d: string;
  /** Centre and radius of each wheel, in the same box as the body. */
  wheels: readonly (readonly [number, number, number])[];
};

const SHAPES: Record<string, Drawing> = {
  sedan: {
    d: 'M4 17.5c-.4-3.2.2-4.6 1.6-5l6.6-1.2 6.4-4.4c1.3-.9 2.6-1.3 4.2-1.3h11.4c1.7 0 3 .4 4.3 1.3l6.6 4.6 10.6.8c1.6.1 2.1 1.6 1.9 5.2M20.5 11.6l4.6-3.2c.8-.6 1.6-.8 2.6-.8h3.8v4H20.5ZM33.5 11.6v-4h4.2c1.1 0 2 .3 2.9.9l4.4 3.1H33.5Z',
    wheels: [[14, 17.6, 3.4], [48, 17.6, 3.4]],
  },
  hatchback: {
    d: 'M4 17.5c-.4-3.2.2-4.6 1.6-5l6.4-1.1 6.2-4.5c1.3-.9 2.6-1.3 4.2-1.3h10.8c1.6 0 2.8.5 3.9 1.6l7.6 7.6c1 1 1.4 1.7 1.3 2.7M20.6 11.4l4.4-3.1c.8-.6 1.6-.8 2.6-.8h3.5v3.9H20.6ZM33.1 11.4V7.5h2.8c1 0 1.8.3 2.5 1l3 2.9H33.1Z',
    wheels: [[14, 17.6, 3.4], [42, 17.6, 3.4]],
  },
  estate: {
    d: 'M3.6 17.5c-.4-3.2.2-4.6 1.6-5l6.6-1.2 6.4-4.4c1.3-.9 2.6-1.3 4.2-1.3h20.8c1.4 0 2.5.3 3.6 1l6.2 3.9c1.3.8 1.8 1.7 1.8 7M20.2 11.6l4.6-3.2c.8-.6 1.6-.8 2.6-.8h3.8v4H20.2ZM33.4 11.6v-4h4.4c1 0 1.9.2 2.7.7l5.2 3.3H33.4ZM47.6 11.6V8.9c0-.7.5-1.1 1.2-.8l4 2.1c.9.5.7 1.4-.3 1.4Z',
    wheels: [[14, 17.6, 3.4], [48, 17.6, 3.4]],
  },
  suv: {
    d: 'M3.4 16.4c-.5-5 .2-7.4 1.8-7.8l5.6-1 5.2-5c1.2-1.2 2.6-1.7 4.4-1.7h17.2c1.8 0 3.2.5 4.5 1.7l5.4 5.2 7 1c1.7.2 2.4 2.6 2 7.6M19.4 7.6l3.8-3.6c.7-.7 1.5-1 2.5-1h4.1v4.6H19.4ZM32.6 7.6V3h4.6c1.1 0 2 .3 2.8 1.1l3.8 3.5H32.6Z',
    wheels: [[14, 17, 4.2], [48, 17, 4.2]],
  },
  coupe: {
    d: 'M4 17.6c-.4-3.4.5-4.9 2.2-5.4l8-2 8.2-4.6c1.4-.8 2.8-1.2 4.5-1.2h4.4c2 0 3.6.6 5.2 1.9l8 6.6 7.4 1.1c1.5.2 2 1.6 1.8 3.6M22.6 10.2l6.4-3.6c.9-.5 1.8-.8 2.9-.8h2.2c1.2 0 2.2.4 3.1 1.2l5.2 4.4-19.8-1.2Z',
    wheels: [[15, 17.6, 3.4], [47, 17.6, 3.4]],
  },
  convertible: {
    d: 'M4 17.5c-.4-3.2.4-4.7 2-5.2l8.6-2.4h24l10.6 2.2c1.5.3 2 1.6 1.8 5.4M15.6 9.6c3-2.2 6.4-3.2 10.4-3.2',
    wheels: [[14, 17.6, 3.4], [48, 17.6, 3.4]],
  },
  minivan: {
    d: 'M3.6 17c-.5-5.4.1-8.4 1.6-8.8l5.2-.8 5.4-4.2c1.2-1 2.6-1.4 4.3-1.4h19.8c1.6 0 2.8.4 4 1.3l6.6 5.2c1.5 1.2 2 2.4 1.9 8.7M18 7.4l3.8-3c.8-.6 1.6-.8 2.6-.8h3.4v3.8H18ZM30.4 7.4V3.6h5c1 0 1.9.3 2.7.9l3.4 2.9H30.4Z',
    wheels: [[15, 17.6, 3.4], [47, 17.6, 3.4]],
  },
  pickup: {
    d: 'M4 17.5c-.4-3.2.2-4.6 1.6-5l5.2-.8 5.8-4.8c1.2-1 2.5-1.4 4.1-1.4h8.6c1.5 0 2.4.8 2.4 2.4v4.2h25.6c1.3 0 1.8 1.1 1.7 4.4M18.4 11.7l3.8-3.1c.8-.6 1.6-.9 2.6-.9h2.6v4H18.4ZM31.7 13.1v5.4',
    wheels: [[14, 17.6, 3.4], [48, 17.6, 3.4]],
  },
  van: {
    d: 'M3.6 17c-.5-7 .1-10.4 1.6-10.8l5.8-.8c1.2-1 2.6-1.4 4.3-1.4h32.2c2.4 0 3.7 1.3 3.7 3.8v9.2M17.6 9.4V5.6h-2c-1 0-1.8.3-2.6.9l-3.6 2.9H17.6ZM21 9.4V5.6h9.4v3.8Z',
    wheels: [[14, 17.6, 3.4], [45, 17.6, 3.4]],
  },
  other: {
    d: 'M4 17.5c-.4-3.2.2-4.6 1.6-5l6.6-1.2 6.4-4.4c1.3-.9 2.6-1.3 4.2-1.3h11.4c1.7 0 3 .4 4.3 1.3l6.6 4.6 10.4 1c1.5.2 2.1 1.6 1.9 5',
    wheels: [[14, 17.6, 3.4], [48, 17.6, 3.4]],
  },
};

export function BodyTypeTile({
  label,
  count,
  shape,
  image,
  width,
  onPress,
  testID,
}: BodyTypeTileProps) {
  const theme = useTheme();
  const drawing = SHAPES[shape] ?? SHAPES.other;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.tile,
        {
          width,
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.sm,
          gap: theme.spacing.xs,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
        },
      ]}
    >
      <View style={styles.art}>
        {image ? (
          <Image source={image} style={styles.photo} contentFit="contain" transition={140} />
        ) : (
          <Svg width={78} height={32} viewBox="0 0 64 26" fill="none">
            <Path
              d={drawing.d}
              stroke={theme.colors.text}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {drawing.wheels.map(([cx, cy, r]) => (
              <Circle
                key={cx}
                cx={cx}
                cy={cy}
                r={r}
                stroke={theme.colors.text}
                strokeWidth={1.4}
                fill="none"
              />
            ))}
          </Svg>
        )}
      </View>

      <Text variant="label" numberOfLines={1} style={{ marginTop: theme.spacing.xs }}>
        {label}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {count}
      </Text>
    </Pressable>
  );
}

/** Both a cut-out and a drawing sit in this, so a mixed row stays level. */
const ART_HEIGHT = 44;

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
  },
  art: {
    // Stretched, because the cut-out sizes itself to the full width of the
    // tile and a box that hugs its content gives it nothing to fill.
    alignSelf: 'stretch',
    height: ART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: ART_HEIGHT,
  },
});
