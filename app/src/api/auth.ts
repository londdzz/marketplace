import { api } from './client';
import type { ApiResource, AuthSession, Country, OtpChallenge, User } from './types';

export const authApi = {
  /**
   * Ask for a one-time code. The API never returns the code itself.
   */
  requestOtp: (phone: string, phonePrefix?: string) =>
    api
      .post<ApiResource<OtpChallenge>>(
        '/auth/otp/request',
        { phone, phone_prefix: phonePrefix },
        { anonymous: true },
      )
      .then((response) => response.data),

  /**
   * Exchange a code for a token. The account is created on first success.
   */
  verifyOtp: (phone: string, code: string, deviceName: string, phonePrefix?: string) =>
    api
      .post<ApiResource<AuthSession>>(
        '/auth/otp/verify',
        // The prefix travels with the number, exactly as it did when the code
        // was requested. Without it the API normalizes a local number into a
        // different one and finds no code for it.
        { phone, code, device_name: deviceName, phone_prefix: phonePrefix },
        { anonymous: true },
      )
      .then((response) => response.data),

  logout: () => api.post<unknown>('/auth/logout'),

  me: () => api.get<ApiResource<User>>('/me').then((response) => response.data),

  countries: () =>
    api.get<ApiResource<Country[]>>('/countries', { anonymous: true }).then((response) => response.data),
};
