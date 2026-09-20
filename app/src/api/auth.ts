import { api } from './client';
import type { ApiResource, AuthSession, Country, OtpChallenge, SellerType, User } from './types';

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

  /** Change what the account says about itself. Never the phone number. */
  updateMe: (patch: {
    display_name?: string | null;
    preferred_language?: string;
    country_code?: string;
    city_id?: number | null;
    seller_type?: SellerType;
    dealer_name?: string | null;
  }) => api.patch<ApiResource<User>>('/me', patch).then((response) => response.data),

  /** How the app is doing, from 1 to 5, with anything they want to add. */
  rate: (score: number, note?: string) =>
    api.post<ApiResource<{ rated_at: string | null }>>('/feedback', { score, note }).then((r) => r.data),

  /**
   * Delete the account and everything attached to it, for good. Apple requires
   * this to be reachable from inside the app, and it is not reversible.
   */
  deleteAccount: () => api.delete<unknown>('/me'),

  countries: () =>
    api.get<ApiResource<Country[]>>('/countries', { anonymous: true }).then((response) => response.data),
};
