import { Redirect } from 'expo-router';

/**
 * Replaced by the search tab in phase 9. For now the design gallery is the only
 * thing to look at.
 */
export default function Index() {
  return <Redirect href="/design" />;
}
