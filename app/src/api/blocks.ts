import { api } from './client';
import type { Pagination, SellerType } from './types';

export type BlockedUser = {
  id: number;
  display_name: string | null;
  dealer_name: string | null;
  seller_type: SellerType;
  blocked_at?: string | null;
};

/**
 * Blocking hides someone both ways: their listings leave your search and yours
 * leave theirs, and neither of you can write to the other. Nothing is deleted,
 * so unblocking gives all of it back.
 */
export const blocksApi = {
  list: () => api.get<{ data: BlockedUser[]; meta: Pagination }>('/blocks'),

  block: (userId: number) =>
    api.post<{ data: BlockedUser }>('/blocks', { user_id: userId }).then((r) => r.data),

  unblock: (userId: number) => api.delete<unknown>(`/blocks/${userId}`),
};
