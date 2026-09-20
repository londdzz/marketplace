import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from 'expo-router/tabs';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type CentreTabButtonProps = BottomTabBarButtonProps & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** The bar's own label style, so this label cannot drift from the others. */
  labelStyle: StyleProp<TextStyle>;
};

/** The disc, and the icon-sized slot it grows upward out of. */
const SIZE = 52;
const SLOT = 22;

/** A ring of the bar's own colour, so the disc cuts the hairline rather than
 *  sitting on it. */
const RING = 3;

/**
 * How far the disc reaches above the top of the bar.
 *
 * The bar gives each item 56 and centres 22 of slot, 3 of gap and 14 of label
 * in it, so the slot's foot — and with it the disc's — sits 30.5 down, leaving
 * 21.5 of a 52 disc standing proud. Anything pinned directly above the bar
 * keeps this much clear of its own contents, or the disc lands on them.
 */
export const CENTRE_TAB_OVERHANG = 22;

/**
 * The one tab drawn as a raised disc in the middle of the bar.
 *
 * It is the only azure thing down here, which is the whole point of it: the
 * other tabs mark themselves active by going white against the muted rest,
 * so nothing competes with the disc for the eye.
 *
 * The disc sits in a slot the size of an ordinary tab icon and grows upward
 * out of it, so its label lands on the same line as every other label however
 * big the disc gets.
 *
 * The top of it stands above the bar. On Android a touch outside a parent's
 * bounds is not delivered, so that part is not tappable there — the rest is,
 * which is a target larger than the other tabs' on its own.
 */
export function CentreTabButton({
  icon,
  label,
  labelStyle,
  style,
  accessibilityState,
  // The navigator hands down its own icon and label, and a ref typed for the
  // pressable it would have rendered. This draws both itself, so neither is
  // forwarded.
  children: _children,
  ref: _ref,
  ...rest
}: CentreTabButtonProps) {
  const theme = useTheme();
  const focused = accessibilityState?.selected ?? false;

  return (
    <Pressable
      {...rest}
      accessibilityState={accessibilityState}
      style={[style as StyleProp<ViewStyle>, styles.button]}
    >
      <View style={styles.slot}>
        <View
          style={[
            styles.disc,
            theme.elevation.sheet,
            {
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.accent,
              borderWidth: RING,
              borderColor: theme.colors.background,
            },
          ]}
        >
          <Ionicons name={icon} size={24} color={theme.colors.textOnAccent} />
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={[
          labelStyle,
          { color: focused ? theme.colors.text : theme.colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    width: SLOT,
    height: SLOT,
    alignItems: 'center',
  },
  disc: {
    position: 'absolute',
    bottom: 0,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
