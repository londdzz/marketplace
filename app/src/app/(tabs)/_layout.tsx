import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { useTheme } from '../../theme';

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
  const { t } = useTranslation('tabs');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 86,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xxl,
        },
        tabBarLabelStyle: {
          ...theme.typography.caption,
          fontWeight: '600',
          marginTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('search'),
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-searches"
        options={{
          title: t('my_searches'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'star' : 'star-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t('saved'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: t('sell'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'pricetag' : 'pricetag-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* Reached from the header, so they stay out of the bar itself. */}
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
