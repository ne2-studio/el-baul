import { Baul, Album, Photo, Recuerdo, SharedUser, RemovalRequest, BaulPreview, UserProfile, PhotoDate, SupportCategory } from './types';

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

async function del<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: body !== undefined ? jsonHeaders() : authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export const api = {
  baules: {
    getAll: async () => (await get<any[]>('/api/baules')).map((b) => new Baul(b)),
    create: async (name: string, description?: string) =>
      new Baul(await post<any>('/api/baules', { name, description })),
    getById: async (id: string) => new Baul(await get<any>(`/api/baules/${id}`)),
    setCover: async (baulId: string, photoId: string) =>
      new Baul(await put<any>(`/api/baules/${baulId}/cover`, { photoId })),
    update: async (baulId: string, name: string, description?: string) =>
      new Baul(await put<any>(`/api/baules/${baulId}`, { name, description })),

    getSharedUsers: async (baulId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/shared-users`)).map((u) => new SharedUser(u)),
    createPersona: async (baulId: string, nickname: string) =>
      new SharedUser(await post<any>(`/api/baules/${baulId}/personas`, { nickname })),
    getPersona: async (baulId: string, sharedUserId: string) =>
      new SharedUser(await get<any>(`/api/baules/${baulId}/shared-users/${sharedUserId}`)),
    updatePersona: async (baulId: string, sharedUserId: string, name: string, nickname: string) =>
      new SharedUser(await put<any>(`/api/baules/${baulId}/shared-users/${sharedUserId}`, { name, nickname })),
    uploadPersonaAvatar: async (baulId: string, sharedUserId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/baules/${baulId}/shared-users/${sharedUserId}/avatar`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new SharedUser(await handleResponse<any>(response));
    },
    updateSharedUserRole: (baulId: string, sharedUserId: string, role: string) =>
      put<void>(`/api/baules/${baulId}/shared-users/${sharedUserId}/role`, { role }),
    revokeAccess: (baulId: string, sharedUserId: string) =>
      del<{ success: boolean }>(`/api/baules/${baulId}/shared-users/${sharedUserId}`),

    getLoosePhotos: async (baulId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/photos/sueltas`)).map((p) => new Photo(p)),
    uploadPhoto: async (baulId: string, file: File, clientUploadId: string, date?: PhotoDate) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientUploadId', clientUploadId);
      if (date) {
        formData.append('dateYear', String(date.year));
        if (date.month) formData.append('dateMonth', String(date.month));
        if (date.day) formData.append('dateDay', String(date.day));
      }

      const response = await fetch(`${API_BASE}/api/baules/${baulId}/photos/sueltas`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new Photo(await handleResponse<any>(response));
    },

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
    setCover: async (baulId: string, albumId: string, photoId: string) =>
      new Album(await put<any>(`/api/baules/${baulId}/albums/${albumId}/cover`, { photoId })),
    update: async (baulId: string, albumId: string, name: string, description?: string) =>
      new Album(await put<any>(`/api/baules/${baulId}/albums/${albumId}`, { name, description })),
    delete: (baulId: string, albumId: string) =>
      del<void>(`/api/baules/${baulId}/albums/${albumId}`),
  },

  photos: {
    getAll: async (albumId: string) => (await get<any[]>(`/api/albums/${albumId}/photos`)).map((p) => new Photo(p)),
    upload: async (albumId: string, file: File, clientUploadId: string, date?: PhotoDate) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientUploadId', clientUploadId);
      if (date) {
        formData.append('dateYear', String(date.year));
        if (date.month) formData.append('dateMonth', String(date.month));
        if (date.day) formData.append('dateDay', String(date.day));
      }

      const response = await fetch(`${API_BASE}/api/albums/${albumId}/photos`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new Photo(await handleResponse<any>(response));
    },
    move: async (photoId: string, albumId: string) =>
      new Photo(await put<any>(`/api/photos/${photoId}/album`, { albumId })),
    delete: (photoId: string, reason?: string) =>
      del<{ success: boolean }>(`/api/photos/${photoId}`, { reason }),
    changeDate: async (photoId: string, date: PhotoDate) =>
      new Photo(await put<any>(`/api/photos/${photoId}/date`, date)),
    changeDateBatch: async (photoIds: string[], date: PhotoDate) =>
      (await put<any[]>('/api/photos/date-batch', { photoIds, ...date })).map((p) => new Photo(p)),
    download: async (photoId: string): Promise<{ blob: Blob; fileName: string }> => {
      const response = await fetch(`${API_BASE}/api/photos/${photoId}/download`, { headers: authHeaders() });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(body.error || 'Request failed');
      }

      const disposition = response.headers.get('Content-Disposition') || '';
      const fileNameMatch = disposition.match(/filename="?([^";]+)"?/);
      const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : 'foto.jpg';

      return { blob: await response.blob(), fileName };
    },
  },

  recuerdos: {
    getAll: async (photoId: string) =>
      (await get<any[]>(`/api/photos/${photoId}/recuerdos`)).map((r) => new Recuerdo(r)),
    create: async (photoId: string, text: string) =>
      new Recuerdo(await post<any>(`/api/photos/${photoId}/recuerdos`, { text })),
    getAllByAlbum: async (baulId: string, albumId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/albums/${albumId}/recuerdos`)).map((r) => new Recuerdo(r)),
    createForAlbum: async (baulId: string, albumId: string, text: string) =>
      new Recuerdo(await post<any>(`/api/baules/${baulId}/albums/${albumId}/recuerdos`, { text })),
    getAllByBaul: async (baulId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/recuerdos`)).map((r) => new Recuerdo(r)),
    createStandalone: async (baulId: string, text: string) =>
      new Recuerdo(await post<any>(`/api/baules/${baulId}/recuerdos`, { text })),
  },

  sharedUsers: {
    getInvitePreview: async (sharedUserId: string) =>
      new BaulPreview(await get<any>(`/api/shared-users/${sharedUserId}/invite-preview`)),
    acceptPersonalInvite: async (sharedUserId: string) =>
      new SharedUser(await post<any>(`/api/shared-users/${sharedUserId}/accept-invite`)),
  },

  users: {
    getProfile: async () => new UserProfile(await get<any>('/api/users/me')),
    updateNotificationPreferences: async (weeklyDigestEnabled: boolean) =>
      new UserProfile(await put<any>('/api/users/me/notification-preferences', { weeklyDigestEnabled })),
  },

  appConfig: {
    get: () => get<{ features: { monetization: boolean }; helpCenterUrl: string; appUrl: string }>('/api/app-config'),
  },

  support: {
    submit: async (category: SupportCategory, message: string) => {
      await post<{ success: boolean }>('/api/support', { category, message });
    },
  },
};
