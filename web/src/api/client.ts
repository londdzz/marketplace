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

/**
 * Read a body that is supposed to be JSON but might not be.
 *
 * Everything the API answers is JSON, error or not. What is not is whatever
 * sits in front of it: nginx writes an HTML page for 413 and 502. `JSON.parse`
 * on one throws a `SyntaxError` rather than an `ApiError`, so every screen's
 * error handling misses it and the person is shown a parser's complaint about
 * a page they cannot see. A body that will not parse is treated as no body;
 * the status still carries the meaning.
 */
function readBody(text: string): ApiErrorBody | undefined {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

/** What to say when the API did not say anything usable. */
function messageFor(status: number): string {
  if (status === 413) {
    return i18n.t('sell:photo_too_large');
  }

  if (status >= 500) {
    return i18n.t('common:server_error');
  }

  return i18n.t('common:error_loading');
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
  const payload = readBody(text);

  if (!response.ok) {
    const errorBody = payload ?? {};

    throw new ApiError(
      response.status,
      errorBody.message ?? messageFor(response.status),
      errorBody,
    );
  }

  return payload as T;
}

/**
 * Photograph upload. A browser hands over a `File`, so there is nothing to
 * resize here: the server re-encodes every photograph regardless.
 */
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
  const payload = readBody(text);

  if (!response.ok) {
    const errorBody = payload ?? {};

    throw new ApiError(response.status, errorBody.message ?? messageFor(response.status), errorBody);
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
