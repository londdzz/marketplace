import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Wordmark } from './Wordmark';

export type AppHeaderProps = {
  /** A dot on the account icon, for anything waiting on the person. */
  accountBadge?: boolean;
  unreadMessages?: boolean;
  onAccount?: () => void;
  onMessages?: () => void;
  onNotifications?: () => void;
};

/**
 * The bar across the top of the home screen.
 *
 * Account on the left, wordmark in the middle, messages and notifications on
 * the right, which is where the reference app keeps them. It also means the
 * profile is two taps from anywhere, and inside it account deletion is the
 * second, which is what the App Store asks for.
 */
export function AppHeader({
  accountBadge = false,
  unreadMessages = false,
  onAccount,
  onMessages,
  onNotifications,
}: AppHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingHorizontal: theme.screenPadding,
          paddingVertical: theme.spacing.md,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Pressable accessibilityRole="button" onPress={onAccount} testID="header-account">
        <View>
          <Ionicons name="person-circle-outline" size={26} color={theme.colors.text} />
          {accountBadge ? (
            <View style={[styles.dot, { backgroundColor: theme.colors.danger }]} />
          ) : null}
        </View>
      </Pressable>

      <View style={styles.brand}>
        <Wordmark size={22} />
      </View>

      <View style={[styles.actions, { gap: theme.spacing.md }]}>
        <Pressable accessibilityRole="button" onPress={onMessages} testID="header-messages">
          <View>
            <Ionicons name="chatbox-outline" size={22} color={theme.colors.text} />
            {unreadMessages ? (
              <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
            ) : null}
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onNotifications} testID="header-bell">
          <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 999,
  },
});
