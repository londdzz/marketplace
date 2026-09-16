/**
 * The shapes the API returns. Every endpoint wraps its payload in `data`.
 */
export type ApiResource<T> = { data: T };

export type Country = {
  code: string;
  currency: string;
  phone_prefix: string;
};

export type City = {
  id: number;
  name: string;
  country_code: string;
  latitude: string;
  longitude: string;
};

export type SellerType = 'private' | 'dealer';

export type User = {
  id: number;
  display_name: string | null;
  phone: string | null;
  phone_verified_at: string | null;
  country_code: string;
  city_id: number | null;
  city: City | null;
  preferred_language: string;
  seller_type: SellerType;
  dealer_name: string | null;
  credits: number;
  created_at: string | null;
};

export type AuthSession = {
  token: string;
  token_type: string;
  user: User;
};

export type OtpChallenge = {
  phone: string;
  code_length: number;
  expires_at: string;
  expires_in_seconds: number;
};
