import i18n from '../i18n';
import { apiUrl } from './config';
import { tokenStorage } from './storage';

export type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
  missing?: string[];
};

/**
 * A failed request, carrying enough for a screen to react: the status, the
 * message the API already translated, and any per-field validation errors.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: ApiErrorBody = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The API answers 402 when a listing needs a credit the seller lacks. */
  get needsCredits(): boolean {
    return this.status === 402;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  fieldError(field: string): string | undefined {
    return this.body.errors?.[field]?.[0];
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skips the bearer token, for the endpoints that do not take one. */
  anonymous?: boolean;
  signal?: AbortSignal;
};

/**
 * Every call to the API goes through here, so the token, the language and error
 * handling are in one place rather than repeated per screen.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false, signal } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    // The API answers in this language, so its messages can be shown as they
    // arrive without the app translating them again.
    'Accept-Language': i18n.language,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!anonymous) {
    const token = await tokenStorage.read();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${apiUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    const errorBody = (payload ?? {}) as ApiErrorBody;

    throw new ApiError(response.status, errorBody.message ?? `Request failed (${response.status})`, errorBody);
  }

  return payload as T;
}

/**
 * A multipart upload, for photographs.
 *
 * Content-Type is deliberately left unset: the runtime has to add the multipart
 * boundary itself, and setting it by hand produces a body the server cannot
 * parse.
 */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': i18n.language,
  };

  const token = await tokenStorage.read();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl()}${path}`, { method: 'POST', headers, body: form });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    const errorBody = (payload ?? {}) as ApiErrorBody;

    throw new ApiError(response.status, errorBody.message ?? `Upload failed (${response.status})`, errorBody);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  // Some deletes are validated like a post: the API wants to know which device
  // token to forget, not just that one should be forgotten.
  delete: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE', body }),
  upload,
};
