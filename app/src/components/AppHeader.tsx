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
};

/**
 * The bar across the top of every tab.
 *
 * Account on the left, wordmark in the middle, messages on the right. Every
 * tab wears it, so the mark is on screen wherever the app is opened and the
 * profile is two taps from anywhere — inside it account deletion is the
 * second, which is what the App Store asks for.
 *
 * There is no bell: saved-search alerts arrive as push notifications and there
 * is no inbox for them to open, and a bell that does nothing is worse than no
 * bell at all.
 */
export function AppHeader({
  accountBadge = false,
  unreadMessages = false,
  onAccount,
  onMessages,
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

      {/* Positioned rather than laid out, so the mark is in the same place on
          every screen whatever sits beside it. */}
      <View style={styles.brand} pointerEvents="none">
        <Wordmark size={20} />
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
