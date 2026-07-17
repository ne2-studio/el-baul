import { Baul, Album, Photo, Recuerdo, SharedUser, RemovalRequest, BaulPreview, UserProfile } from './types';

export const API_BASE = import.meta.env.VITE_API_URL as string;

// Module-level auth token, pushed in from App.tsx whenever the OIDC user changes —
// api.ts never reads auth state itself.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

function authHeaders(): Record<string, string> {
  return _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {};
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders() };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error || 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  return handleResponse<T>(response);
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

async function del<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
  return handleResponse<T>(response);
}

export const api = {
  baules: {
    getAll: async () => (await get<any[]>('/api/baules')).map((b) => new Baul(b)),
    create: async (name: string, description?: string) =>
      new Baul(await post<any>('/api/baules', { name, description })),
    getById: async (id: string) => new Baul(await get<any>(`/api/baules/${id}`)),
    getPreview: async (id: string) => new BaulPreview(await get<any>(`/api/baules/${id}/preview`)),
    acceptInvite: (id: string) => post<{ success: boolean }>(`/api/baules/${id}/accept-invite`),
    setCover: async (baulId: string, photoId: string) =>
      new Baul(await put<any>(`/api/baules/${baulId}/cover`, { photoId })),

    getSharedUsers: async (baulId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/shared-users`)).map((u) => new SharedUser(u)),
    share: async (baulId: string, email: string, role: string) =>
      new SharedUser(await post<any>(`/api/baules/${baulId}/share`, { email, role })),
    updateSharedUserRole: (baulId: string, sharedUserId: string, role: string) =>
      put<void>(`/api/baules/${baulId}/shared-users/${sharedUserId}/role`, { role }),
    revokeAccess: (baulId: string, email: string) =>
      del<{ success: boolean }>(`/api/baules/${baulId}/shared-users/${encodeURIComponent(email)}`),

    getRemovalRequests: async (baulId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/removal-requests`)).map((r) => new RemovalRequest(r)),
    submitRemovalRequest: async (baulId: string, photoId: string, reason?: string) =>
      new RemovalRequest(await post<any>(`/api/baules/${baulId}/removal-requests`, { photoId, reason })),
    approveRemovalRequest: (baulId: string, requestId: string) =>
      post<{ success: boolean }>(`/api/baules/${baulId}/removal-requests/${requestId}/approve`),
    rejectRemovalRequest: (baulId: string, requestId: string) =>
      post<{ success: boolean }>(`/api/baules/${baulId}/removal-requests/${requestId}/reject`),
  },

  albums: {
    getAll: async (baulId: string) => (await get<any[]>(`/api/baules/${baulId}/albums`)).map((a) => new Album(a)),
    create: async (baulId: string, name: string, description?: string) =>
      new Album(await post<any>(`/api/baules/${baulId}/albums`, { name, description })),
  },

  photos: {
    getAll: async (albumId: string) => (await get<any[]>(`/api/albums/${albumId}/photos`)).map((p) => new Photo(p)),
    upload: async (albumId: string, file: File, caption?: string, date?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);
      if (date) formData.append('date', date);

      const response = await fetch(`${API_BASE}/api/albums/${albumId}/photos`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new Photo(await handleResponse<any>(response));
    },
  },

  recuerdos: {
    getAll: async (photoId: string) =>
      (await get<any[]>(`/api/photos/${photoId}/recuerdos`)).map((r) => new Recuerdo(r)),
    create: async (photoId: string, text: string) =>
      new Recuerdo(await post<any>(`/api/photos/${photoId}/recuerdos`, { text })),
  },

  users: {
    getProfile: async () => new UserProfile(await get<any>('/api/users/me')),
  },

  appConfig: {
    get: () => get<{ features: { monetization: boolean } }>('/api/app-config'),
  },
};
