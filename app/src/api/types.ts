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
  /** Set once the home screen's one question has been answered. */
  rated_at: string | null;
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

export type Make = {
  id: number;
  name: string;
  popular: boolean;
  logo_url: string | null;
};

export type VehicleModel = {
  id: number;
  make_id: number;
  name: string;
  body_type: string | null;
};

export type ListingPhoto = {
  id: string;
  url: string;
  thumb_url: string;
  position: number;
  width: number;
  height: number;
};

export type Seller = {
  id: number;
  display_name: string | null;
  seller_type: SellerType;
  dealer_name: string | null;
  phone: string | null;
  city: City | null;
  member_since: string | null;
};

export type Listing = {
  id: string;
  status: string;
  make: Make | null;
  model: VehicleModel | null;
  variant: string | null;
  year: number | null;
  mileage_km: number | null;
  fuel: string | null;
  transmission: string | null;
  body_type: string | null;
  engine_cc: number | null;
  power_hp: number | null;
  drivetrain: string | null;
  color: string | null;
  doors: number | null;
  seats: number | null;
  price_eur: string | null;
  price_negotiable: boolean;
  vat_deductible: boolean;
  customs_cleared: boolean | null;
  description: string | null;
  features: string[];
  country_code: string | null;
  city: City | null;
  photos: ListingPhoto[];
  photo_count?: number;
  seller?: Seller;
  view_count: number;
  is_featured: boolean;
  featured_until: string | null;
  published_at: string | null;
  expires_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: number;
  /** Decided by the API from the token, so a bubble never guesses its side. */
  is_mine: boolean;
  body: string;
  read_at: string | null;
  created_at: string | null;
};

export type Conversation = {
  id: string;
  listing_id: string;
  listing: Listing | null;
  /** Which side of this thread the signed-in account is on. */
  role: 'buyer' | 'seller';
  counterpart: Seller | null;
  unread_count?: number;
  last_message: Message | null;
  last_message_at: string | null;
  created_at: string | null;
};

export type Pagination = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ListingPage = {
  data: Listing[];
  meta: Pagination;
};

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'mileage_asc';

/** What the filter sheet holds. Everything optional; absent means no filter. */
/**
 * What a seller needs to choose a promotion budget.
 *
 * `typical` is null while too few sellers have promoted anything for the range
 * to mean something. The app says nothing rather than inventing a number.
 */
export type PromotionOptions = {
  days_per_credit: number;
  min_credits: number;
  max_credits: number;
  balance: number;
  featured_until: string | null;
  typical: { low: number; high: number; median: number; sample: number } | null;
};

/** A search a buyer kept, as GET /saved-searches returns it. */
export type SavedSearch = {
  id: string;
  name: string | null;
  filters: SearchFilters;
  notify: boolean;
  createdAt: string | null;
};

export type SearchFilters = {
  q?: string;
  makeId?: number;
  modelId?: number;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMax?: number;
  fuel?: string[];
  transmission?: string;
  bodyType?: string[];
  countries?: string[];
  cityId?: number;
  sort?: SortOption;
};
