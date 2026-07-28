import { Baul, Chapter, Photo, Recuerdo, Persona, RemovalRequest, BaulPreview, UserProfile, PhotoDate, SupportCategory, ChatMessage, TaggedPersona } from './types';
import { getEnv } from './runtimeConfig';
import type { components } from './api/generated/schema';

type ApiSchemas = components['schemas'];
type AppConfigResponse = ApiSchemas['AppConfigResponse'];
type BaulDto = ApiSchemas['BaulDto'];
type BaulPreviewDto = ApiSchemas['BaulPreviewDto'];
type ChapterDto = ApiSchemas['ChapterDto'];
type ChatMessageDto = ApiSchemas['ChatMessageDto'];
type PersonaDto = ApiSchemas['PersonaDto'];
type PhotoDto = ApiSchemas['PhotoDto'];
type PhotoPageDto = ApiSchemas['PhotoPageDto'];
type RecuerdoDto = ApiSchemas['RecuerdoDto'];
type RemovalRequestDto = ApiSchemas['RemovalRequestDto'];
type SuccessResponse = ApiSchemas['SuccessResponse'];
type TaggedPersonaDto = ApiSchemas['TaggedPersonaDto'];
type UserProfileDto = ApiSchemas['UserProfileDto'];

export const API_BASE = getEnv('VITE_API_URL');

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

function toTaggedPersona(data: TaggedPersonaDto): TaggedPersona {
  return {
    id: data.id,
    nickname: data.nickname,
    name: data.name ?? undefined,
    avatarUrl: data.avatarUrl ?? undefined,
  };
}

export const api = {
  baules: {
    getAll: async () => (await get<BaulDto[]>('/api/baules')).map((b) => new Baul(b)),
    create: async (name: string, description?: string) =>
      new Baul(await post<BaulDto>('/api/baules', { name, description })),
    getById: async (id: string) => new Baul(await get<BaulDto>(`/api/baules/${id}`)),
    setCover: async (baulId: string, photoId: string) =>
      new Baul(await put<BaulDto>(`/api/baules/${baulId}/cover`, { photoId })),
    update: async (baulId: string, name: string, description?: string) =>
      new Baul(await put<BaulDto>(`/api/baules/${baulId}`, { name, description })),

    getPersonas: async (baulId: string) =>
      (await get<PersonaDto[]>(`/api/baules/${baulId}/personas`)).map((u) => new Persona(u)),
    createPersona: async (baulId: string, nickname: string) =>
      new Persona(await post<PersonaDto>(`/api/baules/${baulId}/personas`, { nickname })),
    getPersona: async (baulId: string, personaId: string) =>
      new Persona(await get<PersonaDto>(`/api/baules/${baulId}/personas/${personaId}`)),
    updatePersona: async (baulId: string, personaId: string, name: string, nickname: string, biografia: string) =>
      new Persona(await put<PersonaDto>(`/api/baules/${baulId}/personas/${personaId}`, { name, nickname, biografia })),
    uploadPersonaAvatar: async (baulId: string, personaId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/baules/${baulId}/personas/${personaId}/avatar`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new Persona(await handleResponse<PersonaDto>(response));
    },
    updatePersonaRole: (baulId: string, personaId: string, role: string) =>
      put<void>(`/api/baules/${baulId}/personas/${personaId}/role`, { role }),
    revokeAccess: (baulId: string, personaId: string) =>
      del<SuccessResponse>(`/api/baules/${baulId}/personas/${personaId}`),

    getLoosePhotos: async (baulId: string) =>
      (await get<PhotoDto[]>(`/api/baules/${baulId}/photos/sueltas`)).map((p) => new Photo(p)),
    // Every photo tagged with this persona, ordered chronologically (oldest first) —
    // powers the "ficha de persona" photo gallery.
    getPersonaPhotos: async (baulId: string, personaId: string) =>
      (await get<PhotoDto[]>(`/api/baules/${baulId}/personas/${personaId}/photos`)).map((p) => new Photo(p)),

    getRemovalRequests: async (baulId: string) =>
      (await get<RemovalRequestDto[]>(`/api/baules/${baulId}/removal-requests`)).map((r) => new RemovalRequest(r)),
    submitRemovalRequest: async (baulId: string, photoId: string, reason?: string) =>
      new RemovalRequest(await post<RemovalRequestDto>(`/api/baules/${baulId}/removal-requests`, { photoId, reason })),
    approveRemovalRequest: (baulId: string, requestId: string) =>
      post<SuccessResponse>(`/api/baules/${baulId}/removal-requests/${requestId}/approve`),
    rejectRemovalRequest: (baulId: string, requestId: string) =>
      post<SuccessResponse>(`/api/baules/${baulId}/removal-requests/${requestId}/reject`),
  },

  chapters: {
    getAll: async (baulId: string) => (await get<ChapterDto[]>(`/api/baules/${baulId}/chapters`)).map((a) => new Chapter(a)),
    create: async (baulId: string, name: string) =>
      new Chapter(await post<ChapterDto>(`/api/baules/${baulId}/chapters`, { name })),
    setCover: async (baulId: string, chapterId: string, photoId: string) =>
      new Chapter(await put<ChapterDto>(`/api/baules/${baulId}/chapters/${chapterId}/cover`, { photoId })),
    update: async (baulId: string, chapterId: string, name: string) =>
      new Chapter(await put<ChapterDto>(`/api/baules/${baulId}/chapters/${chapterId}`, { name })),
    delete: (baulId: string, chapterId: string) =>
      del<void>(`/api/baules/${baulId}/chapters/${chapterId}`),
  },

  photos: {
    getAll: async (chapterId: string) => (await get<PhotoDto[]>(`/api/chapters/${chapterId}/photos`)).map((p) => new Photo(p)),
    // Paginated, chronologically-ascending listing used by the cover photo picker — omit
    // chapterId for every photo in the baúl (all chapters + loose), or pass it to scope to
    // just that chapter.
    getPage: async (baulId: string, options: { chapterId?: string; skip?: number; take?: number } = {}) => {
      const params = new URLSearchParams();
      if (options.chapterId) params.set('chapterId', options.chapterId);
      params.set('skip', String(options.skip ?? 0));
      params.set('take', String(options.take ?? 60));
      const result = await get<PhotoPageDto>(`/api/baules/${baulId}/photos?${params}`);
      return { photos: result.items.map((p) => new Photo(p)), hasMore: result.hasMore };
    },
    // chapterId null uploads into the baúl's "fotos sueltas" (loose photos) instead of a
    // real chapter — see useBaulesStore's nullable chapterId convention.
    upload: async (baulId: string, chapterId: string | null, file: File, clientUploadId: string, date?: PhotoDate) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientUploadId', clientUploadId);
      if (date) {
        formData.append('dateYear', String(date.year));
        if (date.month) formData.append('dateMonth', String(date.month));
        if (date.day) formData.append('dateDay', String(date.day));
      }

      const path = chapterId ? `/api/chapters/${chapterId}/photos` : `/api/baules/${baulId}/photos/sueltas`;
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new Photo(await handleResponse<PhotoDto>(response));
    },
    move: async (photoId: string, chapterId: string) =>
      new Photo(await put<PhotoDto>(`/api/photos/${photoId}/chapter`, { chapterId })),
    delete: (photoId: string, reason?: string) =>
      del<SuccessResponse>(`/api/photos/${photoId}`, { reason }),
    changeDate: async (photoId: string, date: PhotoDate) =>
      new Photo(await put<PhotoDto>(`/api/photos/${photoId}/date`, date)),
    changeDateBatch: async (photoIds: string[], date: PhotoDate) =>
      (await put<PhotoDto[]>('/api/photos/date-batch', { photoIds, ...date })).map((p) => new Photo(p)),
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
    getTaggedPersonas: async (photoId: string) =>
      (await get<TaggedPersonaDto[]>(`/api/photos/${photoId}/personas`)).map(toTaggedPersona),
    setTaggedPersonas: (photoId: string, personaIds: string[]) =>
      put<TaggedPersonaDto[]>(`/api/photos/${photoId}/personas`, { personaIds }).then((personas) =>
        personas.map(toTaggedPersona)
      ),
    // Añade (no reemplaza) las personas dadas a las etiquetas ya existentes de cada foto —
    // acción en lote desde la selección múltiple, a diferencia de setTaggedPersonas que
    // sustituye el conjunto completo desde el visor de una sola foto.
    addTaggedPersonasBatch: (baulId: string, photoIds: string[], personaIds: string[]) =>
      put<string[]>('/api/photos/tag-batch', { baulId, photoIds, personaIds }),
  },

  recuerdos: {
    getAll: async (photoId: string) =>
      (await get<RecuerdoDto[]>(`/api/photos/${photoId}/recuerdos`)).map((r) => new Recuerdo(r)),
    create: async (photoId: string, text: string) =>
      new Recuerdo(await post<RecuerdoDto>(`/api/photos/${photoId}/recuerdos`, { text })),
    getAllByChapter: async (baulId: string, chapterId: string) =>
      (await get<RecuerdoDto[]>(`/api/baules/${baulId}/chapters/${chapterId}/recuerdos`)).map((r) => new Recuerdo(r)),
    createForChapter: async (baulId: string, chapterId: string, text: string) =>
      new Recuerdo(await post<RecuerdoDto>(`/api/baules/${baulId}/chapters/${chapterId}/recuerdos`, { text })),
    getAllByBaul: async (baulId: string) =>
      (await get<RecuerdoDto[]>(`/api/baules/${baulId}/recuerdos`)).map((r) => new Recuerdo(r)),
    createStandalone: async (baulId: string, text: string) =>
      new Recuerdo(await post<RecuerdoDto>(`/api/baules/${baulId}/recuerdos`, { text })),
  },

  personas: {
    getInvitePreview: async (personaId: string) =>
      new BaulPreview(await get<BaulPreviewDto>(`/api/personas/${personaId}/invite-preview`)),
    acceptPersonalInvite: async (personaId: string) =>
      new Persona(await post<PersonaDto>(`/api/personas/${personaId}/accept-invite`)),
  },

  users: {
    getProfile: async () => new UserProfile(await get<UserProfileDto>('/api/users/me')),
    updateNotificationPreferences: async (weeklyDigestEnabled: boolean) =>
      new UserProfile(await put<UserProfileDto>('/api/users/me/notification-preferences', { weeklyDigestEnabled })),
  },

  appConfig: {
    get: () => get<AppConfigResponse>('/api/app-config'),
  },

  support: {
    submit: async (category: SupportCategory, message: string) => {
      await post<SuccessResponse>('/api/support', { category, message });
    },
  },

  chat: {
    getMessages: async (baulId: string) =>
      (await get<ChatMessageDto[]>(`/api/baules/${baulId}/chat`)).map((m) => new ChatMessage(m)),
    sendMessage: async (baulId: string, text: string) =>
      new ChatMessage(await post<ChatMessageDto>(`/api/baules/${baulId}/chat`, { text })),
    getSuggestedQuestions: (baulId: string) => get<string[]>(`/api/baules/${baulId}/chat/suggestions`),
  },
};
