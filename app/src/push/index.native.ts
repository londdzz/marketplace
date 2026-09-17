import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '../api/client';

/**
 * Push registration.
 *
 * The API sends through FCM and APNs directly, so what it needs is the native
 * device token rather than an Expo push token. Registration happens after
 * sign-in, because a token belongs to an account: the same phone can be handed
 * to someone else, and signing out takes the token with it.
 *
 * Nothing here interrupts anyone. A refusal is an answer, and the app carries
 * on without notifications until the person turns them on in system settings.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const platform = Platform.OS === 'ios' ? 'ios' : 'android';

export async function registerForPush(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  const granted =
    existing.granted ||
    (existing.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);

  if (!granted) {
    return false;
  }

  if (Platform.OS === 'android') {
    // Android delivers into a channel, so there has to be one first.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Autevo',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#1E4FD8',
    });
  }

  const device = await Notifications.getDevicePushTokenAsync();

  await api.post<unknown>('/device-tokens', { token: String(device.data), platform });

  return true;
}

export async function unregisterFromPush(): Promise<void> {
  try {
    const device = await Notifications.getDevicePushTokenAsync();

    await api.delete<unknown>('/device-tokens', { token: String(device.data), platform });
  } catch {
    // A token the server never had, or a device that will not give one up, is
    // not worth blocking a sign-out over.
  }
}
