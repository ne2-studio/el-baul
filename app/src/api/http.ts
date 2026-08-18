import { getEnv } from '../runtimeConfig';

export const API_BASE = getEnv('VITE_API_URL');
export const API_FORBIDDEN_EVENT = 'elbaul:api-forbidden';
export const API_UNAUTHORIZED_EVENT = 'elbaul:api-unauthorized';
export const API_CONNECTIVITY_LOST_EVENT = 'elbaul:api-connectivity-lost';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class ApiConnectionError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('No se pudo conectar con la API');
    this.name = 'ApiConnectionError';
    this.cause = cause;
  }
}

export function isApiErrorWithStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}

export function isApiConnectionError(error: unknown): error is ApiConnectionError {
  return error instanceof ApiConnectionError;
}

export function isForbiddenError(error: unknown): boolean {
  return isApiErrorWithStatus(error, 403);
}

export function isUnauthorizedError(error: unknown): boolean {
  return isApiErrorWithStatus(error, 401);
}

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function authHeaders(): Record<string, string> {
  return _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {};
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders() };
}

function isFetchConnectivityError(error: unknown): boolean {
  // A request cancelled by navigation/unmount/remount throws an AbortError, not a real
  // connectivity failure — never count it towards the connectivity-lost signal or consume a
  // retry. AbortError is a DOMException, not a TypeError, so it already falls through the
  // instanceof check below; this guard makes that exclusion explicit rather than incidental.
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  if (!(error instanceof TypeError)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emitConnectivityLost(error: ApiConnectionError) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(API_CONNECTIVITY_LOST_EVENT, { detail: { error } }));
  }
}

// Raw fetch, normalized to ApiConnectionError on a real connectivity failure, but without
// emitting API_CONNECTIVITY_LOST_EVENT itself — callers decide when a failure is final
// (immediately for mutations, only after retries are exhausted for get()).
async function fetchOrConnectionError(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (!isFetchConnectivityError(error)) throw error;
    throw new ApiConnectionError(error);
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetchOrConnectionError(input, init);
  } catch (error) {
    if (isApiConnectionError(error)) emitConnectivityLost(error);
    throw error;
  }
}

// 500ms / 1s / 2s backoff, get() only: a transient blip (brief mobile network switch, a
// one-off SW/CORS hiccup) shouldn't show the connectivity-lost splash if it resolves on its
// own. post/put/del deliberately don't retry (see get()'s doc comment) — they fail on the
// first attempt and surface the normal error toast instead.
const GET_RETRY_DELAYS_MS = [500, 1000, 2000];

async function getWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOrConnectionError(input, init);
    } catch (error) {
      const isLastAttempt = attempt >= GET_RETRY_DELAYS_MS.length;
      if (!isApiConnectionError(error) || isLastAttempt) {
        if (isApiConnectionError(error)) emitConnectivityLost(error);
        throw error;
      }
      await delay(GET_RETRY_DELAYS_MS[attempt]);
    }
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'Request failed';

    const error = new ApiError(response.status, message, body);

    if (response.status === 403 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(API_FORBIDDEN_EVENT, { detail: { error } }));
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT, { detail: { error } }));
    }

    throw error;
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// Retries on transient connectivity failures (see GET_RETRY_DELAYS_MS) — safe because GET is
// idempotent. post/put/del below deliberately don't: retrying a non-idempotent mutation whose
// response we never saw risks duplicating the action server-side, so they fail on the first
// attempt and let the caller's normal error handling (toast) take over.
export async function get<T>(path: string): Promise<T> {
  const response = await getWithRetry(`${API_BASE}${path}`, { headers: authHeaders() });
  return handleResponse<T>(response);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiFetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function del<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiFetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: body !== undefined ? jsonHeaders() : authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}
