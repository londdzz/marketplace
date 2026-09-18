import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

/**
 * Icon, label and the air around them; the device's own inset is added to it.
 *
 * The navigator's stock bar is 49 tall and gives each item 7.5 of margin and 5
 * of padding on top of that, which leaves 25 for a 22 icon and its label — so
 * the label is drawn outside the item and, on a phone with no bottom inset,
 * cut in half. The item's margin is dropped below and this is the height the
 * contents actually need.
 */
const TAB_CONTENT_HEIGHT = 52;

/**
 * Five tabs, mirroring the reference app: home, search, saved searches, saved
 * cars and selling.
 *
 * Messages and the profile live in the header rather than down here, which is
 * also where the reference app keeps them. The profile stays two taps away, so
 * account deletion inside it is the second tap, which is what the App Store
 * requires.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('tabs');

  // Whatever the device keeps below the bar: an iPhone's home indicator, or
  // Android's gesture bar or button row, which reach under the app because the
  // build is edge to edge.
  const bottomInset = Math.max(insets.bottom, theme.spacing.sm);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        // Without this the navigator decides for itself whether the label
        // goes below the icon or beside it, and on a short bar it drops the
        // labels altogether.
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: { marginVertical: 0, paddingVertical: 0, justifyContent: 'center' },
        // Height and the bottom padding are left to the navigator, which
        // measures the device: an iPhone's home indicator, or Android's
        // gesture bar or button row, which reach under the app because the
        // build is edge to edge. A fixed height guesses, and guesses wrong on
        // most phones — the labels ended up clipped on some and floating above
        // a gap on others.
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: TAB_CONTENT_HEIGHT + bottomInset,
          paddingTop: 0,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontFamily: theme.typography.caption.fontFamily,
          fontSize: 11,
          lineHeight: 14,
          fontWeight: '600',
          marginTop: 3,
          // The label is a flex child of a fixed-height item, so without this
          // it is the thing that gives when the row is tight, and it is drawn
          // cut in half rather than simply smaller.
          flexShrink: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('search'),
          tabBarIcon: ({ color }) => <Ionicons name="search" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-searches"
        options={{
          title: t('my_searches'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'star' : 'star-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t('saved'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: t('sell'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pricetag' : 'pricetag-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* Reached from the header, so they stay out of the bar itself. */}
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
