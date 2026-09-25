import { Ionicons } from '@expo/vector-icons';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import type { VehicleType } from '../api/types';
import { useTheme } from '../theme';
import { Text } from './Text';

export type CategorySwitchProps = {
  value: VehicleType;
  onChange: (type: VehicleType) => void;
  /** The kinds to offer, in order. Whatever the API says it has. */
  types?: readonly VehicleType[];
  /** The wording, which lives in the screens' translation files, not here. */
  label: (type: VehicleType) => string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** One mark per kind, so the switch reads at a glance rather than by its words. */
const ICONS: Record<VehicleType, keyof typeof Ionicons.glyphMap> = {
  car: 'car-sport',
  motorcycle: 'bicycle',
};

/**
 * Which catalogue is being read: cars or motorcycles.
 *
 * It is a switch rather than a filter, and the difference matters. A filter
 * narrows what is already on screen; this changes what "everything" means, so
 * it sits above the search rather than inside it, and it is drawn as one track
 * with the chosen side raised out of it — the shape that says the two are
 * alternatives and that one of them is always chosen.
 *
 * The chosen side is a raised neutral pane with accent text rather than an
 * azure fill. Filled azure is the app's one action colour, and both screens
 * that carry this already spend it: the search tab on the offer-count button
 * at the foot, the home screen on the tab bar's disc. A second azure block at
 * the top competed with both and nothing led — the same reason the tab bar
 * gives only its centre the accent.
 */
export function CategorySwitch({
  value,
  onChange,
  types = ['car', 'motorcycle'],
  label,
  style,
  testID,
}: CategorySwitchProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={[
        styles.track,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.md,
          padding: 3,
          gap: 3,
        },
        style,
      ]}
    >
      {types.map((type) => {
        const active = type === value;

        return (
          <Pressable
            key={type}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(type)}
            testID={`category-${type}`}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: active
                  ? theme.colors.surfaceRaised
                  : pressed
                    ? theme.colors.surface
                    : 'transparent',
                borderWidth: 1,
                borderColor: active ? theme.colors.accentBorder : 'transparent',
                borderRadius: theme.radius.sm,
                paddingVertical: theme.spacing.sm - 1,
                gap: theme.spacing.xs,
              },
            ]}
          >
            <Ionicons
              name={ICONS[type]}
              size={16}
              color={active ? theme.colors.accentText : theme.colors.textMuted}
            />
            <Text
              variant="label"
              numberOfLines={1}
              style={{ color: active ? theme.colors.accentText : theme.colors.textMuted }}
            >
              {label(type)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
