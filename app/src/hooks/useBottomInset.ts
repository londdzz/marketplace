import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The space a pinned bar has to keep below its contents.
 *
 * On an iPhone that is the home indicator; on Android it is the gesture bar or
 * the button row, which reaches under the app because the build is edge to
 * edge. A bar that guesses instead — a fixed twenty-four, or a number chosen by
 * platform — is either cramped on one phone or floating on another.
 *
 * The bar keeps its own background all the way to the bottom of the screen and
 * pads its contents up out of the way, rather than the page stopping short and
 * showing a strip of itself below the bar.
 */
export function useBottomInset(minimum = 12): number {
  const insets = useSafeAreaInsets();

  return Math.max(insets.bottom, minimum);
}
