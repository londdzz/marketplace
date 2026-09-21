import { useFonts } from 'expo-font';
import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
} from '@expo-google-fonts/onest';
import { Sora_600SemiBold } from '@expo-google-fonts/sora';

/**
 * Onest for everything the app says, Sora for the wordmark alone.
 *
 * **Sora has no Cyrillic.** Not a subset we did not load — the font contains
 * no Cyrillic glyphs at all, which means every screen in Macedonian, the
 * launch language, fell back to whatever face the phone happened to have.
 * Latin and Cyrillic ended up side by side in two different typefaces on the
 * same line, and the type scale, which is tuned to Sora's metrics, did not
 * apply to any of it.
 *
 * Onest covers both scripts, was drawn with Cyrillic as a first-class script
 * rather than an afterthought, and sits within a couple of percent of Sora's
 * x-height and cap height — so the scale below it still holds and nothing had
 * to be re-measured.
 *
 * Sora stays for the one word that is always Latin and is the brand: AUTEVO
 * in the header. The mark beside it is SVG paths and never needed a font.
 *
 * Nothing renders until they are here: a screen that paints in the system font
 * and then reflows is worse than a splash screen held for half a second
 * longer.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Sora_600SemiBold,
  });

  // A font that cannot load must not leave the app on a blank screen for good.
  return loaded || error !== null;
}
