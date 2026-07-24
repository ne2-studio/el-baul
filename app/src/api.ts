import { Baul, Chapter, Photo, Recuerdo, Persona, RemovalRequest, BaulPreview, UserProfile, PhotoDate, SupportCategory, ChatMessage } from './types';

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

    getPersonas: async (baulId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/personas`)).map((u) => new Persona(u)),
    createPersona: async (baulId: string, nickname: string) =>
      new Persona(await post<any>(`/api/baules/${baulId}/personas`, { nickname })),
    getPersona: async (baulId: string, personaId: string) =>
      new Persona(await get<any>(`/api/baules/${baulId}/personas/${personaId}`)),
    updatePersona: async (baulId: string, personaId: string, name: string, nickname: string) =>
      new Persona(await put<any>(`/api/baules/${baulId}/personas/${personaId}`, { name, nickname })),
    uploadPersonaAvatar: async (baulId: string, personaId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/baules/${baulId}/personas/${personaId}/avatar`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new Persona(await handleResponse<any>(response));
    },
    updatePersonaRole: (baulId: string, personaId: string, role: string) =>
      put<void>(`/api/baules/${baulId}/personas/${personaId}/role`, { role }),
    revokeAccess: (baulId: string, personaId: string) =>
      del<{ success: boolean }>(`/api/baules/${baulId}/personas/${personaId}`),

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

  chapters: {
    getAll: async (baulId: string) => (await get<any[]>(`/api/baules/${baulId}/chapters`)).map((a) => new Chapter(a)),
    create: async (baulId: string, name: string) =>
      new Chapter(await post<any>(`/api/baules/${baulId}/chapters`, { name })),
    setCover: async (baulId: string, chapterId: string, photoId: string) =>
      new Chapter(await put<any>(`/api/baules/${baulId}/chapters/${chapterId}/cover`, { photoId })),
    update: async (baulId: string, chapterId: string, name: string) =>
      new Chapter(await put<any>(`/api/baules/${baulId}/chapters/${chapterId}`, { name })),
    delete: (baulId: string, chapterId: string) =>
      del<void>(`/api/baules/${baulId}/chapters/${chapterId}`),
  },

  photos: {
    getAll: async (chapterId: string) => (await get<any[]>(`/api/chapters/${chapterId}/photos`)).map((p) => new Photo(p)),
    upload: async (chapterId: string, file: File, clientUploadId: string, date?: PhotoDate) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientUploadId', clientUploadId);
      if (date) {
        formData.append('dateYear', String(date.year));
        if (date.month) formData.append('dateMonth', String(date.month));
        if (date.day) formData.append('dateDay', String(date.day));
      }

      const response = await fetch(`${API_BASE}/api/chapters/${chapterId}/photos`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new Photo(await handleResponse<any>(response));
    },
    move: async (photoId: string, chapterId: string) =>
      new Photo(await put<any>(`/api/photos/${photoId}/chapter`, { chapterId })),
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
    getAllByChapter: async (baulId: string, chapterId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/chapters/${chapterId}/recuerdos`)).map((r) => new Recuerdo(r)),
    createForChapter: async (baulId: string, chapterId: string, text: string) =>
      new Recuerdo(await post<any>(`/api/baules/${baulId}/chapters/${chapterId}/recuerdos`, { text })),
    getAllByBaul: async (baulId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/recuerdos`)).map((r) => new Recuerdo(r)),
    createStandalone: async (baulId: string, text: string) =>
      new Recuerdo(await post<any>(`/api/baules/${baulId}/recuerdos`, { text })),
  },

  personas: {
    getInvitePreview: async (personaId: string) =>
      new BaulPreview(await get<any>(`/api/personas/${personaId}/invite-preview`)),
    acceptPersonalInvite: async (personaId: string) =>
      new Persona(await post<any>(`/api/personas/${personaId}/accept-invite`)),
  },

  users: {
    getProfile: async () => new UserProfile(await get<any>('/api/users/me')),
    updateNotificationPreferences: async (weeklyDigestEnabled: boolean) =>
      new UserProfile(await put<any>('/api/users/me/notification-preferences', { weeklyDigestEnabled })),
  },

  appConfig: {
    get: () =>
      get<{ features: { monetization: boolean; chatEnabled: boolean }; helpCenterUrl: string; appUrl: string }>(
        '/api/app-config'
      ),
  },

  support: {
    submit: async (category: SupportCategory, message: string) => {
      await post<{ success: boolean }>('/api/support', { category, message });
    },
  },

  chat: {
    getMessages: async (baulId: string) =>
      (await get<any[]>(`/api/baules/${baulId}/chat`)).map((m) => new ChatMessage(m)),
    sendMessage: async (baulId: string, text: string) =>
      new ChatMessage(await post<any>(`/api/baules/${baulId}/chat`, { text })),
  },
};
