import { Baul, Chapter, Photo, Recuerdo, Persona, RemovalRequest, BaulInviteLink, BaulInviteLinkPreview, ClaimablePersona, UserProfile, PhotoDate, SupportCategory, ChatMessage, TaggedPersona, FeedItem, feedItemFrom } from './types';
import { getEnv } from './runtimeConfig';
import type { components } from './api/generated/schema';

type ApiSchemas = components['schemas'];
type AppConfigResponse = ApiSchemas['AppConfigResponse'];
type BaulDto = ApiSchemas['BaulDto'];
type BaulInviteLinkDto = ApiSchemas['BaulInviteLinkDto'];
type BaulInviteLinkPreviewDto = ApiSchemas['BaulInviteLinkPreviewDto'];
type ClaimablePersonaDto = ApiSchemas['ClaimablePersonaDto'];
type ChapterDto = ApiSchemas['ChapterDto'];
type ChatMessageDto = ApiSchemas['ChatMessageDto'];
type PersonaDto = ApiSchemas['PersonaDto'];
type PhotoDto = ApiSchemas['PhotoDto'];
type PhotoPageDto = ApiSchemas['PhotoPageDto'];
type RecuerdoDto = ApiSchemas['RecuerdoDto'];
type FeedPageDto = ApiSchemas['FeedPageDto'];
type RemovalRequestDto = ApiSchemas['RemovalRequestDto'];
type SuccessResponse = ApiSchemas['SuccessResponse'];
type TaggedPersonaDto = ApiSchemas['TaggedPersonaDto'];
type UserProfileDto = ApiSchemas['UserProfileDto'];

export interface AvatarCrop {
  x: number;
  y: number;
  scale: number;
}

interface SharedLinkResponse {
  url: string;
  token: string;
}

export const API_BASE = getEnv('VITE_API_URL');
export const API_FORBIDDEN_EVENT = 'elbaul:api-forbidden';
export const API_UNAUTHORIZED_EVENT = 'elbaul:api-unauthorized';

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

export function isApiErrorWithStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}

export function isForbiddenError(error: unknown): boolean {
  return isApiErrorWithStatus(error, 403);
}

export function isUnauthorizedError(error: unknown): boolean {
  return isApiErrorWithStatus(error, 401);
}

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
    updatePersona: async (baulId: string, personaId: string, name: string, nickname: string) =>
      new Persona(await put<PersonaDto>(`/api/baules/${baulId}/personas/${personaId}`, { name, nickname })),
    updatePersonaBiografia: async (baulId: string, personaId: string, biografia: string) =>
      new Persona(await put<PersonaDto>(`/api/baules/${baulId}/personas/${personaId}/biografia`, { biografia })),
    uploadPersonaAvatar: async (baulId: string, personaId: string, file: File, crop: AvatarCrop) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cropX', String(crop.x));
      formData.append('cropY', String(crop.y));
      formData.append('cropScale', String(crop.scale));
      formData.append('clientUploadId', crypto.randomUUID());

      const response = await fetch(`${API_BASE}/api/baules/${baulId}/personas/${personaId}/avatar`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      return new Persona(await handleResponse<PersonaDto>(response));
    },
    setPersonaAvatarPhoto: async (baulId: string, personaId: string, photoId: string, crop: AvatarCrop) =>
      new Persona(await put<PersonaDto>(`/api/baules/${baulId}/personas/${personaId}/avatar`, {
        photoId,
        cropX: crop.x,
        cropY: crop.y,
        cropScale: crop.scale,
      })),
    updatePersonaRole: (baulId: string, personaId: string, role: string) =>
      put<void>(`/api/baules/${baulId}/personas/${personaId}/role`, { role }),
    revokeAccess: (baulId: string, personaId: string) =>
      del<SuccessResponse>(`/api/baules/${baulId}/personas/${personaId}`),

    getLoosePhotos: async (baulId: string) =>
      (await get<PhotoDto[]>(`/api/baules/${baulId}/photos/sueltas`)).map((p) => new Photo(p)),
    // Paginated recuerdos + photo-upload-batch cards, newest first — the baúl's feed tab
    // behind Features:BaulFeedEnabled. See useAppConfigStore's baulFeedEnabled. Same
    // skip/take/hasMore shape as photos.getPage.
    getFeed: async (baulId: string, options: { skip?: number; take?: number } = {}): Promise<{ feedItems: FeedItem[]; hasMore: boolean }> => {
      const params = new URLSearchParams();
      params.set('skip', String(options.skip ?? 0));
      params.set('take', String(options.take ?? 20));
      const result = await get<FeedPageDto>(`/api/baules/${baulId}/feed?${params}`);
      return { feedItems: result.items.map(feedItemFrom), hasMore: result.hasMore };
    },
    // Every photo tagged with this persona, ordered chronologically (oldest first) —
    // powers the "ficha de persona" photo gallery.
    getPersonaPhotos: async (baulId: string, personaId: string) =>
      (await get<PhotoDto[]>(`/api/baules/${baulId}/personas/${personaId}/photos`)).map((p) => new Photo(p)),

    getInviteLink: async (baulId: string) =>
      new BaulInviteLink(await get<BaulInviteLinkDto>(`/api/baules/${baulId}/invite-link`)),
    regenerateInviteLink: async (baulId: string) =>
      new BaulInviteLink(await post<BaulInviteLinkDto>(`/api/baules/${baulId}/invite-link/regenerate`)),

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
    upload: async (
      baulId: string, chapterId: string | null, file: File, clientUploadId: string, date?: PhotoDate,
      uploadBatchId?: string
    ) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientUploadId', clientUploadId);
      if (uploadBatchId) formData.append('uploadBatchId', uploadBatchId);
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
        await handleResponse<never>(response);
      }

      const disposition = response.headers.get('Content-Disposition') || '';
      const fileNameMatch = disposition.match(/filename="?([^";]+)"?/);
      const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : 'foto.jpg';

      return { blob: await response.blob(), fileName };
    },
    createShareLink: (photoId: string) =>
      post<SharedLinkResponse>(`/api/photos/${photoId}/share`),
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
    // Foto pendiente de etiquetar que respalda la recomendación de contribución al entrar en
    // el feed del baúl — null cuando no queda ninguna foto sin etiquetar.
    getUntaggedSuggestion: async (baulId: string) => {
      const dto = await get<PhotoDto | null>(`/api/baules/${baulId}/photos/untagged-suggestion`);
      return dto ? new Photo(dto) : null;
    },
  },

  // One upload batch's own photos (chronologically ascending) — the feed card's "grid"/gallery
  // scoped view reached from a photo_batch feed item.
  photoBatches: {
    getPhotos: async (baulId: string, batchId: string) =>
      (await get<PhotoDto[]>(`/api/baules/${baulId}/photo-batches/${batchId}/photos`)).map((p) => new Photo(p)),
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
    update: async (recuerdoId: string, text: string) =>
      new Recuerdo(await put<RecuerdoDto>(`/api/recuerdos/${recuerdoId}`, { text })),
    createShareLink: (recuerdoId: string) =>
      post<SharedLinkResponse>(`/api/recuerdos/${recuerdoId}/share`),
  },

  sharedLinks: {
    revoke: (token: string) => del<void>(`/api/shared-links/${encodeURIComponent(token)}`),
  },

  baulInvites: {
    getPreview: async (token: string) =>
      new BaulInviteLinkPreview(await get<BaulInviteLinkPreviewDto>(`/api/baul-invites/${encodeURIComponent(token)}/preview`)),
    getClaimablePersonas: async (token: string) =>
      (await get<ClaimablePersonaDto[]>(`/api/baul-invites/${encodeURIComponent(token)}/claimable-personas`))
        .map((dto) => new ClaimablePersona(dto)),
    accept: async (token: string, personaId?: string) =>
      new Persona(await post<PersonaDto>(`/api/baul-invites/${encodeURIComponent(token)}/accept`, { personaId: personaId ?? null })),
  },

  users: {
    getProfile: async () => new UserProfile(await get<UserProfileDto>('/api/users/me')),
    updateNotificationPreferences: async (weeklyDigestEnabled: boolean) =>
      new UserProfile(await put<UserProfileDto>('/api/users/me/notification-preferences', { weeklyDigestEnabled })),
    markOnboardingSeen: async () => new UserProfile(await post<UserProfileDto>('/api/users/me/onboarding-seen')),
  },

  pushNotifications: {
    register: (token: string, platform: string) =>
      post<void>('/api/users/me/push-tokens', { token, platform }),
    unregister: (token: string) =>
      post<void>('/api/users/me/push-tokens/unregister', { token }),
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
