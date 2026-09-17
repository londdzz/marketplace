import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  useFonts,
} from '@expo-google-fonts/sora';

/**
 * Sora, in the three weights the brand uses.
 *
 * Nothing renders until they are here: a screen that paints in the system font
 * and then reflows into Sora is worse than a splash screen held for half a
 * second longer.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
  });

  // A font that cannot load must not leave the app on a blank screen for good.
  return loaded || error !== null;
}
