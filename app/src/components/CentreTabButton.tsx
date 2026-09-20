import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from 'expo-router/tabs';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

/**
 * The bar's vertical geometry lives here, because the disc is drawn outside
 * the bar and has to land exactly on the slot the bar left for it. Split the
 * numbers across two files and they drift.
 */

/** Icon, label and the air around them; the device's own inset is added to it. */
export const TAB_CONTENT_HEIGHT = 56;

/** The slot an ordinary tab icon occupies, which the disc is centred on. */
const SLOT = 22;

/** The gap above a label and the line it is set on. */
const LABEL_GAP = 3;
const LABEL_LINE = 14;

/** The disc itself, and the ring of bar colour that separates it. */
const SIZE = 52;
const RING = 3;

/** What the bar centres in each item: a slot, a gap and a line of label. */
const CONTENT = SLOT + LABEL_GAP + LABEL_LINE;

/**
 * How far above the bar's bottom edge the slot's foot sits, and so the disc's.
 *
 * The item is centred, so half the slack above the content is the slot's top,
 * and the disc hangs its own bottom on the slot's.
 */
export const CENTRE_TAB_FOOT = (TAB_CONTENT_HEIGHT + CONTENT) / 2 - SLOT;

/**
 * How far the disc reaches above the top of the bar.
 *
 * Anything pinned directly above the bar keeps this much clear of its own
 * contents, or the disc lands on them.
 */
export const CENTRE_TAB_OVERHANG = CENTRE_TAB_FOOT + SIZE - TAB_CONTENT_HEIGHT;

export type CentreTabButtonProps = BottomTabBarButtonProps & {
  label: string;
  /** The bar's own label style, so this label cannot drift from the others. */
  labelStyle: StyleProp<TextStyle>;
};

/**
 * The middle tab's place in the bar: the slot the disc is drawn over, and the
 * label beneath it.
 *
 * The disc is not drawn here. On Android a touch outside a parent's bounds is
 * never delivered, so a disc standing above the bar would be dead along its
 * top — it is drawn by `CentreTabDisc`, over the whole screen, instead. This
 * still holds the tab's own hit area, its accessibility and its label, so the
 * disc itself can stay out of the way of a screen reader.
 */
export function CentreTabButton({
  label,
  labelStyle,
  style,
  accessibilityState,
  // The navigator hands down its own icon and label, and a ref typed for the
  // pressable it would have rendered. This draws its own, so neither is used.
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
      <View style={styles.slot} />

      <Text
        numberOfLines={1}
        style={[labelStyle, { color: focused ? theme.colors.text : theme.colors.textMuted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export type CentreTabDiscProps = {
  icon: keyof typeof Ionicons.glyphMap;
  /** Whatever the device keeps below the bar, which the bar sits on top of. */
  bottomInset: number;
  onPress: () => void;
};

/**
 * The raised disc in the middle of the bar, drawn over the whole screen.
 *
 * It is a sibling of the navigator rather than a child of the bar, so every
 * part of it is inside its own parent's bounds and Android delivers a touch
 * anywhere on it. It lands on the slot `CentreTabButton` leaves in the bar,
 * and that button is the accessible control, so this one stays hidden from a
 * screen reader rather than announcing the same tab twice.
 *
 * It is the only azure thing down here, which is the whole point of it: the
 * other tabs mark themselves active by going white against the muted rest, so
 * nothing competes with the disc for the eye.
 */
export function CentreTabDisc({ icon, bottomInset, onPress }: CentreTabDiscProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onPress={onPress}
      testID="centre-tab-disc"
      style={[
        styles.disc,
        theme.elevation.sheet,
        {
          bottom: bottomInset + CENTRE_TAB_FOOT,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.accent,
          borderWidth: RING,
          borderColor: theme.colors.background,
        },
      ]}
    >
      <Ionicons name={icon} size={24} color={theme.colors.textOnAccent} />
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
  },
  disc: {
    position: 'absolute',
    alignSelf: 'center',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
