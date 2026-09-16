import { Platform } from 'react-native';

import { api } from './client';
import type { ApiResource, Listing, ListingPage, ListingPhoto } from './types';

/** What a step of the sell flow sends. Every field is optional: a draft is saved
 * after each step, so it is incomplete by design until the last one. */
export type ListingDraftInput = {
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

export type PublishFailure = {
  /** The fields the API says are still missing, so the flow can jump back. */
  missing: string[];
};

/**
 * One photograph, in whatever shape the platform's FormData understands.
 *
 * React Native sends a file as {uri, name, type}. A browser has no idea what a
 * uri is and needs the bytes, so the web build reads the blob back out of the
 * uri the picker gave it. Both end up as one multipart part the API can read.
 */
async function uploadable(photo: { uri: string; name: string; type: string }): Promise<Blob> {
  if (Platform.OS !== 'web') {
    return photo as unknown as Blob;
  }

  const blob = await fetch(photo.uri).then((response) => response.blob());

  return new File([blob], photo.name, { type: photo.type || blob.type || 'image/jpeg' });
}

export const sellApi = {
  createDraft: (input: ListingDraftInput = {}) =>
    api.post<ApiResource<Listing>>('/listings', input).then((r) => r.data),

  updateDraft: (id: string, input: ListingDraftInput) =>
    api.patch<ApiResource<Listing>>(`/listings/${id}`, input).then((r) => r.data),

  show: (id: string) => api.get<ApiResource<Listing>>(`/listings/${id}`).then((r) => r.data),

  /**
   * @param photos already resized by the caller; the server resizes again
   *   regardless, but sending a 6MB original over a phone connection is rude.
   */
  uploadPhotos: async (id: string, photos: Array<{ uri: string; name: string; type: string }>) => {
    const form = new FormData();

    for (const photo of photos) {
      form.append('photos[]', await uploadable(photo));
    }

    const response = await api.upload<{ data: ListingPhoto[] }>(`/listings/${id}/photos`, form);

    return response.data;
  },

  deletePhoto: (listingId: string, photoId: string) =>
    api.delete<unknown>(`/listings/${listingId}/photos/${photoId}`),

  reorderPhotos: (listingId: string, photoIds: string[]) =>
    api
      .patch<{ data: ListingPhoto[] }>(`/listings/${listingId}/photos/order`, {
        photo_ids: photoIds,
      })
      .then((r) => r.data),

  publish: (id: string) => api.post<ApiResource<Listing>>(`/listings/${id}/publish`).then((r) => r.data),

  renew: (id: string) => api.post<ApiResource<Listing>>(`/listings/${id}/renew`).then((r) => r.data),

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

/** What `GET /credits` carries, once the resource wrapper is off. */
export type CreditBalance = CreditsResponse['data'];

export const creditsApi = {
  read: () => api.get<CreditsResponse>('/credits').then((r) => r.data),
};
