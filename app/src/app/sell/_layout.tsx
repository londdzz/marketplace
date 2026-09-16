import { Stack } from 'expo-router';

/**
 * The sell flow, as its own stack over the tabs.
 *
 * Each screen asks one thing and saves it, so backing out at any point leaves a
 * draft on the server rather than losing the work.
 */
export default function SellLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
