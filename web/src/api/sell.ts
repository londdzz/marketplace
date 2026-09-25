import { api } from './client';
import type {
  ApiResource,
  Listing,
  ListingPage,
  ListingPhoto,
  PromotionOptions,
  VehicleType,
} from './types';

/**
 * Selling, from a browser.
 *
 * The same endpoints the app calls — this is not a second idea of what a
 * listing is. It is the website's own file only because the app's imports
 * React Native to work out what shape a photograph is; here the file picker
 * hands over a `File`, which is what multipart wanted all along.
 */
export type ListingDraftInput = {
  vehicle_type?: VehicleType;
  make_id?: number;
  model_id?: number | null;
  variant?: string | null;
  year?: number;
  mileage_km?: number;
  fuel?: string;
  transmission?: string;
  body_type?: string | null;
  power_hp?: number | null;
  price_eur?: number;
  price_negotiable?: boolean;
  customs_cleared?: boolean;
  description?: string | null;
  features?: string[];
  country_code?: string;
  city_id?: number;
};

export const sellApi = {
  createDraft: (input: ListingDraftInput = {}) =>
    api.post<ApiResource<Listing>>('/listings', input).then((r) => r.data),

  updateDraft: (id: string, input: ListingDraftInput) =>
    api.patch<ApiResource<Listing>>(`/listings/${id}`, input).then((r) => r.data),

  show: (id: string) => api.get<ApiResource<Listing>>(`/listings/${id}`).then((r) => r.data),

  /**
   * @param photos straight from the picker. The server re-encodes every one
   *   to a 1600px long edge and a 400px thumbnail and strips EXIF, so nothing
   *   here has to resize — and a desktop's upload is not a phone's tariff.
   */
  uploadPhotos: async (id: string, photos: File[]) => {
    const form = new FormData();

    for (const photo of photos) {
      form.append('photos[]', photo);
    }

    const response = await api.upload<{ data: ListingPhoto[] }>(`/listings/${id}/photos`, form);

    return response.data;
  },

  deletePhoto: (listingId: string, photoId: string) =>
    api.delete<unknown>(`/listings/${listingId}/photos/${photoId}`),

  reorderPhotos: (listingId: string, photoIds: string[]) =>
    api
      .patch<{ data: ListingPhoto[] }>(`/listings/${listingId}/photos/order`, { photo_ids: photoIds })
      .then((r) => r.data),

  publish: (id: string) => api.post<ApiResource<Listing>>(`/listings/${id}/publish`).then((r) => r.data),

  renew: (id: string) => api.post<ApiResource<Listing>>(`/listings/${id}/renew`).then((r) => r.data),

  promotionOptions: (id: string) =>
    api.get<ApiResource<PromotionOptions>>(`/listings/${id}/promotion`).then((r) => r.data),

  promote: (id: string, credits: number) =>
    api.post<ApiResource<Listing>>(`/listings/${id}/promote`, { credits }).then((r) => r.data),

  markSold: (id: string) =>
    api.post<ApiResource<Listing>>(`/listings/${id}/mark-sold`).then((r) => r.data),

  remove: (id: string) => api.delete<unknown>(`/listings/${id}`),

  myListings: (status?: string) =>
    api.get<ListingPage>(`/my/listings${status ? `?status=${status}` : ''}`),
};

export type CreditPack = {
  product_id: string;
  credits: number;
  price_eur: string;
  most_popular: boolean;
};

export type CreditsResponse = {
  data: {
    balance: number;
    packs: CreditPack[];
    history: {
      data: Array<{
        id: string;
        delta: number;
        reason: string;
        balance_after: number;
        created_at: string | null;
      }>;
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    };
  };
};

export const creditsApi = {
  read: () => api.get<CreditsResponse>('/credits').then((r) => r.data),
};
