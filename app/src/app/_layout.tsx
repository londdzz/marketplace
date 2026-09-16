import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { FiltersProvider } from '../search/FiltersProvider';
import '../i18n';
import { ThemeProvider } from '../theme/ThemeProvider';
import { useTheme } from '../theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Sends people to the sign-in step until they have an account, and into the
 * tabs once they do. Nothing in the app is reachable before verifying a phone
 * number.
 */
function AuthGate() {
  const { user, restoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (restoring) {
      return;
    }

    const inAuthFlow = segments[0] === '(auth)';

    if (!user && !inAuthFlow) {
      router.replace('/(auth)/phone');
    } else if (user && inAuthFlow) {
      router.replace('/(tabs)/home');
    }

    setReady(true);
  }, [restoring, user, segments, router]);

  if (restoring || !ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <FiltersProvider>
                <AuthGate />
              </FiltersProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
