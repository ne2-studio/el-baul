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
  if (!(error instanceof TypeError)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  );
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (!isFetchConnectivityError(error)) throw error;

    const connectionError = new ApiConnectionError(error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(API_CONNECTIVITY_LOST_EVENT, { detail: { error: connectionError } }));
    }

    throw connectionError;
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

export async function get<T>(path: string): Promise<T> {
  const response = await apiFetch(`${API_BASE}${path}`, { headers: authHeaders() });
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
