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
 * Opens the app, signed in or not.
 *
 * Browsing needs no account: a buyer can search, open a car, keep a shortlist
 * and save a search before they have given us a telephone number, and what
 * they keep lives on the phone until they do. Asking for a number at the door
 * is asking somebody to prove they are serious about a marketplace they have
 * not been allowed to look at yet.
 *
 * What does need an account is anything that involves another person —
 * selling, messaging, reporting, and seeing a seller's number — and each of
 * those asks at the point it is needed, with the reason in front of them.
 *
 * The only redirect left is the other way round: somebody already signed in
 * has no business on the sign-in screen.
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

    if (user && segments[0] === '(auth)') {
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
