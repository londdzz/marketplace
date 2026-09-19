import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { useWarmUp } from '../boot/useWarmUp';
import { BootScreen } from '../components/BootScreen';
import { useAppFonts } from '../theme/fonts';
import { FiltersProvider } from '../search/FiltersProvider';
import { SellProvider } from '../sell/SellProvider';
import '../i18n';
import { ThemeProvider } from '../theme/ThemeProvider';

// The native splash stays up until the typeface has loaded, and the launch
// screen it hands over to is drawn to match it, so nothing flashes between the
// two and the app is only revealed once it has something to show.
void SplashScreen.preventAutoHideAsync();

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
  const [ready, setReady] = useState(false);

  // Reference data, and the home screen's own cars, fetched while the launch
  // screen is still up rather than after it has gone.
  const warm = useWarmUp(!restoring, Boolean(user));

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

  if (restoring || !ready || !warm) {
    return <BootScreen />;
  }

  return <Slot />;
}

export default function RootLayout() {
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <FiltersProvider>
                <SellProvider>
                  <AuthGate />
                </SellProvider>
              </FiltersProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
