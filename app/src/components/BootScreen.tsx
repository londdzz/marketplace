import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Wordmark } from './Wordmark';

/**
 * What the app shows while it is waking up.
 *
 * It is drawn to match the native splash exactly — the same mark, the same
 * ground — so handing over from one to the other is invisible and the launch
 * reads as a single held moment rather than a flash of one screen into
 * another. The spinner appears only after a beat, because a spinner that shows
 * up on a fast connection makes a quick launch look slow.
 */
export function BootScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.base, { backgroundColor: theme.colors.background }]}>
      <Wordmark size={40} />

      <ActivityIndicator
        color={theme.colors.textSubtle}
        style={styles.spinner}
        accessibilityLabel={undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    position: 'absolute',
    bottom: 72,
  },
});
