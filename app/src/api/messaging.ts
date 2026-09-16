import { api } from './client';
import type { ApiResource, Conversation, Message, Pagination } from './types';

type Page<T> = { data: T[]; meta: Pagination };

/**
 * Messaging is polled rather than pushed, which the specification allows for
 * v1. The thread polls while it is open; the list polls while it is on screen.
 */
export const messagingApi = {
  conversations: () => api.get<Page<Conversation>>('/conversations'),

  /**
   * Newest first, as the API pages them. The thread reverses them for display.
   */
  messages: (conversationId: string, page = 1) =>
    api.get<Page<Message>>(`/conversations/${conversationId}/messages?page=${page}`),

  send: (conversationId: string, body: string) =>
    api
      .post<ApiResource<Message>>(`/conversations/${conversationId}/messages`, { body })
      .then((response) => response.data),

  markRead: (conversationId: string) => api.post<unknown>(`/conversations/${conversationId}/read`),

  /**
   * Reach the seller of a listing. Asking twice reopens the same thread rather
   * than starting another, so this is safe to call from a Message button.
   */
  start: (listingId: string, body?: string) =>
    api
      .post<ApiResource<Conversation>>(`/listings/${listingId}/conversations`, { body })
      .then((response) => response.data),
};
