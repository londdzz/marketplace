import i18n from '../i18n';
import { API_URL } from './config';
import { tokenStorage } from './storage';

export type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
  missing?: string[];
};

/** A failed request, carrying what a screen needs to react to it. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: ApiErrorBody = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

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
 * Every call goes through here, so the token, the language and error handling
 * live in one place rather than in every screen. The shape matches the app's
 * client exactly, which is what lets the two share everything above it.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false, signal } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    // The API answers in this language, so its messages can be shown as they
    // arrive rather than being translated again here.
    'Accept-Language': i18n.language,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!anonymous) {
    const token = tokenStorage.read();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
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

    throw new ApiError(
      response.status,
      errorBody.message ?? `Request failed (${response.status})`,
      errorBody,
    );
  }

  return payload as T;
}

/** Photograph upload. The website does not sell, so this is never called. */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': i18n.language,
  };

  const token = tokenStorage.read();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: form });
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
  delete: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE', body }),
  upload,
};
