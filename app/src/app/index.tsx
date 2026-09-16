import { Redirect } from 'expo-router';

/**
 * The gate in the root layout decides where this actually lands.
 */
export default function Index() {
  return <Redirect href="/(tabs)/search" />;
}
