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

/**
 * Read a response body that is supposed to be JSON but might not be.
 *
 * Everything the API itself answers is JSON, error or not. What is not is
 * whatever sits in front of it: nginx writes an HTML page for 413 and 502,
 * and a captive portal on a café network writes its own login page over any
 * request at all. `JSON.parse` on those throws a `SyntaxError` — "unexpected
 * character <" — which is not an `ApiError`, so every screen's error handling
 * misses it and the person is shown a parser's complaint about a page they
 * cannot see.
 *
 * So a body that will not parse is treated as no body. The status still
 * carries the meaning, and `messageFor` turns it into a sentence.
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

/**
 * What to say when the API did not say anything we can use.
 *
 * 413 is the one worth naming. It is nginx refusing the request before Laravel
 * ever sees it, because the body is over `client_max_body_size`, and it is
 * what a photograph too large for the server looks like from here. "Upload
 * failed (413)" tells a seller nothing they can act on; "that photograph is
 * too large" tells them to pick another one.
 */
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
  const payload = readBody(text);

  if (!response.ok) {
    const errorBody = payload ?? {};

    throw new ApiError(response.status, errorBody.message ?? messageFor(response.status), errorBody);
  }

  return payload as T;
}

/**
 * A multipart upload, for photographs.
 *
 * This one goes through XMLHttpRequest rather than `fetch`, which everything
 * else uses. Expo installs a WinterCG `fetch` as the global, and its multipart
 * encoder takes a string, a real `Blob`, or anything with `bytes()` — never
 * React Native's `{uri, name, type}`, which it refuses with "Unsupported
 * FormDataPart implementation". Its own source says as much: "`uri` is not
 * supported for React Native's FormData."
 *
 * XMLHttpRequest is what that shape was written for. The native layer opens the
 * file and streams it, so a photograph never becomes a base64 string in
 * JavaScript on the way out — fifteen of those at 1600px is memory a phone
 * should not have to find. It is also why `uploadable()` reads the blob back
 * out of the picker's uri on web and not here: a browser has no idea what a uri
 * is, and XHR there takes the `File` it builds instead.
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

  const { status, text } = await new Promise<{ status: number; text: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('POST', `${apiUrl()}${path}`);

    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }

    request.onload = () => resolve({ status: request.status, text: request.responseText ?? '' });

    // The shape `fetch` fails with, so a screen that already handles a dropped
    // connection does not have to learn a second one.
    request.onerror = () => reject(new TypeError('Network request failed'));
    request.onabort = () => reject(new TypeError('Network request failed'));

    request.send(form);
  });

  const payload = readBody(text);

  if (status < 200 || status >= 300) {
    const errorBody = payload ?? {};

    throw new ApiError(status, errorBody.message ?? messageFor(status), errorBody);
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
