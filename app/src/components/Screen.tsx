import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../theme';

export type ScreenProps = {
  children: ReactNode;
  /** Wraps the content in a scroll view. Off for screens that own a list. */
  scroll?: boolean;
  /** Removes the side gutter, for a screen whose content runs edge to edge. */
  flush?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The outermost element of every screen. It owns the page background, the safe
 * areas, the side gutter and keyboard avoidance, so no screen repeats them.
 */
export function Screen({
  children,
  scroll = false,
  flush = false,
  edges = ['top', 'bottom'],
  style,
  contentStyle,
  testID,
}: ScreenProps) {
  const theme = useTheme();

  const padding: ViewStyle = { paddingHorizontal: flush ? 0 : theme.screenPadding };

  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      style={[styles.flex, { backgroundColor: theme.colors.background }, style]}
    >
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[padding, { paddingVertical: theme.spacing.lg }, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padding, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
