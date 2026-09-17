/**
 * There is no push on the web build, which exists only to preview the
 * interface. Both calls report honestly rather than pretending.
 */
export async function registerForPush(): Promise<boolean> {
  return false;
}

export async function unregisterFromPush(): Promise<void> {
  // Nothing to unregister.
}
