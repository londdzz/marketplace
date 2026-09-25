import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { VehicleType } from '../api/types';
import { Text } from './Text';
import { useTheme } from '../theme';

export type BodyTypeTileProps = {
  label: string;
  /** How many live cars have this shape. From the API or it is not shown. */
  count: string;
  shape: string;
  /** Which family of shapes `shape` belongs to. They share no vocabulary. */
  vehicleType?: VehicleType;
  /** A cut-out of a car of this shape. Falls back to the drawing without one. */
  image?: ImageSource | number | null;
  width: number;
  onPress: () => void;
  /** No live listing of this shape. Drawn, dimmed, and not pressable. */
  empty?: boolean;
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


/**
 * The same construction for motorcycles: one line for the body and the wheels
 * the size the kind actually wears, on the same ground line as the cars.
 *
 * Each has to be recognisable from its profile alone at a third of a screen
 * wide, which is the only size it is ever drawn at — a fairing dropping at the
 * nose, a step-through with a flat floor, a raked fork, a beak and a tall
 * stance, three wheels, four fat ones. They were drawn against a rendered
 * contact sheet rather than by eye, the same way the cars were.
 *
 * Five kinds are not in here on purpose. A naked bike and an unspecified one
 * are the same picture; an enduro, a motocrosser and a supermoto differ in
 * their tyres and their lights, neither of which survives being drawn at
 * forty-four pixels tall. Each borrows the closest drawing rather than being
 * given a worse one of its own, which is honest where three near-identical
 * scribbles would only look like a mistake.
 */
const MOTORCYCLE_SHAPES: Record<string, Drawing> = {
  other: {
    d: 'M12.5 18.8 18.5 8.2M18.5 8.2 23.5 6.6M20 10.8 27 9.8 34 10.6 44 10.6 52.5 9.4 51 12.2M50.5 18.8 42 14.8 35 14M30 12.6 30 16.6 38 16.6 39.5 13.2',
    wheels: [[12.5, 18.8, 5.2], [50.5, 18.8, 5.2], [9, 12.6, 2.4]],
  },
  sport: {
    d: 'M8 16.5 9.5 11Q11 7.4 15 7.6L21.5 10.6 28 10.2 34 11.2 40 12.2M40 12.2 47 8.2 53.5 7.6 51.5 10.8 43 13.8M50.5 18.8 42 15.2 34 13.8M12.5 18.8 15.4 13',
    wheels: [[12.5, 18.8, 5.2], [50.5, 18.8, 5.2]],
  },
  touring: {
    d: 'M8.5 16 10 10.4Q11 6.4 15 6.6Q17.6 2 18.6 3.4L20.4 8.8 28 9.8 36 10.8 42.6 11.2M43.2 11.4 44.6 7 53 7 54 11.8 43.2 11.8M50.5 18.8 44 15.2 36 13.8M12.5 18.8 15 12.2',
    wheels: [[12.5, 18.8, 5.2], [50.5, 18.8, 5.2]],
  },
  adventure: {
    d: 'M5.5 12.6 13 11 16.6 11.8M16.6 11.4 18 4.6M18 4.6 23.5 3.6M20 8.6 27 8.2 34 8.8 41 10 45 10.6M45 10.6 50 7 55 6.6 52.5 10 45.6 12.6M12 18 17 7.6M51 18 43.5 13.8 34 12.4',
    wheels: [[12, 18, 6], [51, 18, 6]],
  },
  cruiser: {
    d: 'M10.5 19.4 19.5 7.6M19.5 7.6 24 5.8 28.2 6.4M23 10.2Q28.5 12.4 34 12.4L41 12.8 47 13.8 52 11.4 56 11.4M53.5 19.4 46 16.6 36 15.2 30 15.2',
    wheels: [[10.5, 19.4, 4.6], [53.5, 19.4, 4.6]],
  },
  scooter: {
    d: 'M10 17 11.5 10.4Q12.5 7.4 16.5 7.6L21.5 6.6M15.5 9.4 18 14.4 21 16.8 31 16.8 34.5 11.4 44 10.8 49.5 12 52 16M12 20.4 15.6 10.4M49.5 20.4 46 16.4',
    wheels: [[12, 20.4, 3.6], [49.5, 20.4, 3.6]],
  },
  moped: {
    d: 'M12.5 20.8 17.5 9.4M17.5 9.4 22.5 8.4M18.6 11 25 13.6 32 14.6 36 12 45 11.8 49 13.2M35.5 11.6 43.5 11.6M49.5 20.8 45 17 38 15.2',
    wheels: [[12.5, 20.8, 3.2], [49.5, 20.8, 3.2], [31, 17.6, 2]],
  },
  trike: {
    d: 'M11 19.4 18 8.4M18 8.4 23 6.8 27 7.4M22 11 30 11.6 38 12 46 12.4 54 13M40 12 40 15.4 56 15.4',
    wheels: [[11, 19.4, 4.6], [44.5, 19.8, 4.2], [55, 19.8, 4.2]],
  },
  quad: {
    d: 'M6.5 13.4 12 11.8 18 12.6M18 12.6 22.5 12.2 25.5 8.8 34 8.8 37.5 12 45 12.4 51 12.8 57 14.2M22.5 11 21.5 6 17 5M21.5 6 26.5 7M45 12.4 47 9.6 55.5 10.2',
    wheels: [[14, 18.4, 5.6], [49.5, 18.4, 5.6]],
  },
};

MOTORCYCLE_SHAPES.naked = MOTORCYCLE_SHAPES.other;
MOTORCYCLE_SHAPES.enduro = MOTORCYCLE_SHAPES.adventure;
MOTORCYCLE_SHAPES.motocross = MOTORCYCLE_SHAPES.adventure;
MOTORCYCLE_SHAPES.supermoto = MOTORCYCLE_SHAPES.adventure;

export function BodyTypeTile({
  label,
  count,
  shape,
  vehicleType = 'car',
  image,
  width,
  onPress,
  empty = false,
  testID,
}: BodyTypeTileProps) {
  const theme = useTheme();
  const family = vehicleType === 'motorcycle' ? MOTORCYCLE_SHAPES : SHAPES;
  const drawing = family[shape] ?? family.other;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={empty}
      accessibilityState={{ disabled: empty }}
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
        // The same 0.38 the collection cards use, so a rail of both dims to
        // one level rather than two.
        empty && styles.empty,
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
  empty: {
    opacity: 0.38,
  },
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
