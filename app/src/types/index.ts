import { getRelativeTime } from '@/app/utils/timeUtils';
import type { components } from '@/api/generated/schema';

type ApiSchemas = components['schemas'];
type RawBaulDto = ApiSchemas['BaulDto'];
type BaulDto = Omit<RawBaulDto, 'coverCropX' | 'coverCropY' | 'coverCropScale'> &
  Partial<Pick<RawBaulDto, 'coverCropX' | 'coverCropY' | 'coverCropScale'>>;
type BaulInviteLinkDto = ApiSchemas['BaulInviteLinkDto'];
type BaulInviteLinkPreviewDto = ApiSchemas['BaulInviteLinkPreviewDto'];
type ClaimablePersonaDto = ApiSchemas['ClaimablePersonaDto'];
type RawChapterDto = ApiSchemas['ChapterDto'];
type ChapterDto = Omit<RawChapterDto, 'coverCropX' | 'coverCropY' | 'coverCropScale'> &
  Partial<Pick<RawChapterDto, 'coverCropX' | 'coverCropY' | 'coverCropScale'>>;
type ChatMessageDto = ApiSchemas['ChatMessageDto'];
type RawPersonaDto = ApiSchemas['PersonaDto'];
type PersonaDto = Omit<RawPersonaDto, 'avatarCropX' | 'avatarCropY' | 'avatarCropScale'> &
  Partial<Pick<RawPersonaDto, 'avatarCropX' | 'avatarCropY' | 'avatarCropScale'>>;
type PhotoDto = ApiSchemas['PhotoDto'];
type RecuerdoDto = ApiSchemas['RecuerdoDto'];
type PhotoBatchDto = ApiSchemas['PhotoBatchDto'];
type ChapterCreatedFeedDto = ApiSchemas['ChapterCreatedFeedDto'];
type FeedItemDto = ApiSchemas['FeedItemDto'];
type RemovalRequestDto = ApiSchemas['RemovalRequestDto'];
type UserProfileDto = ApiSchemas['UserProfileDto'];

// Custodio isn't a role — it's the baúl's singular legal-custody relationship, carried
// separately as `isCustodio` on Baul/Persona (see roleUtils.ts). A BaulRole value is always an
// assignable permission tier.
export type BaulRole = 'administrador' | 'colaborador' | 'sin_acceso';

export type SupportCategory = 'Support' | 'Bug' | 'Suggestion' | 'BaulDeletion';

export interface PhotoDate {
  year: number;
  month?: number;
  day?: number;
}

// A user-chosen focal point (x/y, fraction of the source image) plus zoom (scale) — how a
// persona's avatar or a chapter/baúl's cover photo should be framed. Lives here (not
// api/publicTypes.ts) so design-system components (e.g. PhotoCropStep) can depend on it without
// depending on the api layer — see docs/architecture/frontend.md's design-system boundary.
export interface PhotoCrop {
  x: number;
  y: number;
  scale: number;
}

function photoDateFrom(year?: number | null, month?: number | null, day?: number | null): PhotoDate | undefined {
  if (!year) return undefined;
  return { year, month: month ?? undefined, day: day ?? undefined };
}

export class Persona {
  id: string;
  baulId: string;
  email?: string;
  name?: string;
  nickname: string;
  status: 'active' | 'pending' | 'sin_acceso';
  role: BaulRole;
  isCustodio: boolean;
  invitedDate: string;
  avatarUrl?: string;
  avatarPhotoId?: string;
  avatarCropX?: number;
  avatarCropY?: number;
  avatarCropScale?: number;
  canEdit?: boolean;
  biografia?: string;

  constructor(data: PersonaDto) {
    this.id = data.id;
    this.baulId = data.baulId;
    this.email = data.email ?? undefined;
    this.name = data.name ?? undefined;
    this.nickname = data.nickname;
    this.status = data.status as 'active' | 'pending' | 'sin_acceso';
    this.role = data.role as BaulRole;
    this.isCustodio = data.isCustodio;
    this.invitedDate = getRelativeTime(new Date(data.invitedDate));
    this.avatarUrl = data.avatarUrl ?? undefined;
    this.avatarPhotoId = data.avatarPhotoId ?? undefined;
    this.avatarCropX = data.avatarCropX ?? 0.5;
    this.avatarCropY = data.avatarCropY ?? 0.5;
    this.avatarCropScale = data.avatarCropScale ?? 1;
    this.canEdit = data.canEdit;
    this.biografia = data.biografia ?? undefined;
  }
}

// Display-only shape for the personas tagged in a photo — fetched separately (keyed by
// photoId), never embedded in Photo itself.
export interface TaggedPersona {
  id: string;
  nickname: string;
  name?: string;
  avatarUrl?: string;
}

export class Baul {
  id: string;
  name: string;
  description?: string;
  chapterCount: number;
  coverPhotoUrl?: string;
  coverCropX?: number;
  coverCropY?: number;
  coverCropScale?: number;
  lastUpdated: string;
  role?: BaulRole;
  isCustodio?: boolean;
  memberCount?: number;

  constructor(data: BaulDto) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description ?? undefined;
    this.chapterCount = data.chapterCount;
    this.coverPhotoUrl = data.coverPhotoUrl ?? undefined;
    this.coverCropX = data.coverCropX ?? 0.5;
    this.coverCropY = data.coverCropY ?? 0.5;
    this.coverCropScale = data.coverCropScale ?? 1;
    this.lastUpdated = getRelativeTime(new Date(data.updatedAt));
    this.role = data.role as BaulRole;
    this.isCustodio = data.isCustodio;
    this.memberCount = data.memberCount;
  }
}

export class Chapter {
  id: string;
  name: string;
  photoCount: number;
  coverPhotoUrl?: string;
  featuredCoverPhotoUrl?: string;
  coverCropX?: number;
  coverCropY?: number;
  coverCropScale?: number;
  lastUpdated: string;
  recuerdoCount: number;
  latestRecuerdoText?: string;
  latestRecuerdoAuthor?: string;
  minDate?: PhotoDate;
  maxDate?: PhotoDate;
  undatedPhotoCount: number;

  constructor(data: ChapterDto) {
    this.id = data.id;
    this.name = data.name;
    this.photoCount = data.photoCount;
    this.coverPhotoUrl = data.coverPhotoUrl ?? undefined;
    this.featuredCoverPhotoUrl = data.featuredCoverPhotoUrl ?? undefined;
    this.coverCropX = data.coverCropX ?? 0.5;
    this.coverCropY = data.coverCropY ?? 0.5;
    this.coverCropScale = data.coverCropScale ?? 1;
    this.lastUpdated = getRelativeTime(new Date(data.updatedAt));
    this.recuerdoCount = data.recuerdoCount;
    this.latestRecuerdoText = data.latestRecuerdoText ?? undefined;
    this.latestRecuerdoAuthor = data.latestRecuerdoAuthor ?? undefined;
    this.minDate = photoDateFrom(data.minDateYear, data.minDateMonth, data.minDateDay);
    this.maxDate = photoDateFrom(data.maxDateYear, data.maxDateMonth, data.maxDateDay);
    this.undatedPhotoCount = data.undatedPhotoCount;
  }
}

export class Photo {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  date?: PhotoDate;
  recuerdoCount: number;
  /** undefined = fotos sueltas. Presente en todo PhotoDto ya sea que la foto llegue por su
   * capítulo, sus fotos sueltas, o (como el visor de un lote de subida) escapada de ambos
   * contextos — ver PhotoBatchViewerRoute, el único caller que lo necesita para saber a qué
   * capítulo pertenece una foto sin que la ruta se lo diga. */
  chapterId?: string;
  /** Backend-computed, mutually exclusive: nunca ambos true. El backend es quien decide si el
   * llamante es admin, es el autor de la foto y sigue dentro de la ventana de gracia — ver
   * docs/API-CONVENTIONS.md. El frontend nunca debe re-derivar esta regla, solo pintar el botón
   * que corresponda. */
  canDelete: boolean;
  canRequestRemoval: boolean;

  constructor(data: PhotoDto) {
    this.id = data.id;
    this.thumbnailUrl = data.thumbnailUrl;
    this.fullUrl = data.fullUrl;
    this.date = photoDateFrom(data.dateYear, data.dateMonth, data.dateDay);
    this.recuerdoCount = data.recuerdoCount;
    this.chapterId = data.chapterId ?? undefined;
    this.canDelete = data.canDelete;
    this.canRequestRemoval = data.canRequestRemoval;
  }
}

export class Recuerdo {
  id: string;
  text: string;
  personaId?: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  isOwn?: boolean;
  photoId?: string;
  photoThumbnailUrl?: string;
  chapterId?: string;
  chapterName?: string;

  constructor(data: RecuerdoDto) {
    this.id = data.id;
    this.text = data.text;
    this.personaId = data.personaId ?? undefined;
    this.userName = data.userName;
    this.userAvatar = data.userAvatar ?? undefined;
    this.createdAt = data.createdAt;
    this.isOwn = data.isOwn;
    this.photoId = data.photoId ?? undefined;
    this.photoThumbnailUrl = data.photoThumbnailUrl ?? undefined;
    this.chapterId = data.chapterId ?? undefined;
    this.chapterName = data.chapterName ?? undefined;
  }
}

// One card in the baúl feed for a single upload action — every photo sharing the same
// UploadBatchId. Mirrors Recuerdo's authorship shape (Persona nickname/avatar, never the
// account name — see docs/API-CONVENTIONS.md's "Display names").
export class PhotoBatch {
  batchId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  personaId?: string;
  photoCount: number;
  chapterId?: string;
  chapterName?: string;
  createdAt: string;
  previewPhotos: Photo[];

  constructor(data: PhotoBatchDto) {
    this.batchId = data.batchId;
    this.userId = data.userId;
    this.userName = data.userName;
    this.userAvatar = data.userAvatar ?? undefined;
    this.personaId = data.personaId ?? undefined;
    this.photoCount = data.photoCount;
    this.chapterId = data.chapterId ?? undefined;
    this.chapterName = data.chapterName ?? undefined;
    this.createdAt = data.createdAt;
    this.previewPhotos = data.previewPhotos.map((p) => new Photo(p));
  }
}

// One card in the baúl feed announcing a chapter's creation. Mirrors PhotoBatch's authorship
// shape (Persona nickname/avatar, never the account name).
export class ChapterCreatedFeed {
  chapterId: string;
  name: string;
  coverPhotoUrl?: string;
  createdAt: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  personaId?: string;

  constructor(data: ChapterCreatedFeedDto) {
    this.chapterId = data.chapterId;
    this.name = data.name;
    this.coverPhotoUrl = data.coverPhotoUrl ?? undefined;
    this.createdAt = data.createdAt;
    this.userId = data.userId;
    this.userName = data.userName;
    this.userAvatar = data.userAvatar ?? undefined;
    this.personaId = data.personaId ?? undefined;
  }
}

// One entry in the baúl feed — a Recuerdo, a photo-upload batch or a chapter-created event,
// never more than one. Mirrors FeedItemDto's discriminated shape so callers can switch on
// `type` instead of checking which nested field is set. isNew marks activity since the
// caller's last visit to this baúl — see BaulFeedManager.GetFeedAsync's doc comment.
export type FeedItem =
  | { type: 'recuerdo'; createdAt: string; isNew: boolean; recuerdo: Recuerdo }
  | { type: 'photo_batch'; createdAt: string; isNew: boolean; photoBatch: PhotoBatch }
  | { type: 'chapter_created'; createdAt: string; isNew: boolean; chapterCreated: ChapterCreatedFeed };

export function feedItemFrom(data: FeedItemDto): FeedItem {
  const isNew = data.isNew ?? false;
  if (data.type === 'photo_batch' && data.photoBatch) {
    return { type: 'photo_batch', createdAt: data.createdAt, isNew, photoBatch: new PhotoBatch(data.photoBatch) };
  }
  if (data.type === 'chapter_created' && data.chapterCreated) {
    return { type: 'chapter_created', createdAt: data.createdAt, isNew, chapterCreated: new ChapterCreatedFeed(data.chapterCreated) };
  }
  // Defaults to 'recuerdo' for any unrecognized type too, matching the backend's fallback
  // shape — an unknown Type would otherwise have no Recuerdo to render.
  return { type: 'recuerdo', createdAt: data.createdAt, isNew, recuerdo: new Recuerdo(data.recuerdo!) };
}

export class ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;

  constructor(data: ChatMessageDto) {
    this.id = data.id;
    this.role = data.role as 'user' | 'assistant';
    this.content = data.content;
    this.createdAt = data.createdAt;
  }
}

export class RemovalRequest {
  id: string;
  baulId: string;
  photoId: string;
  photoUrl: string;
  requesterName: string;
  requesterEmail: string;
  reason: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';

  constructor(data: RemovalRequestDto) {
    this.id = data.id;
    this.baulId = data.baulId;
    this.photoId = data.photoId;
    this.photoUrl = data.photoUrl;
    this.requesterName = data.requesterName;
    this.requesterEmail = data.requesterEmail;
    this.reason = data.reason ?? '';
    this.requestDate = getRelativeTime(new Date(data.requestDate));
    this.status = data.status as 'pending' | 'approved' | 'rejected';
  }
}

export class BaulInviteLink {
  token: string;
  url: string;
  createdAt: string;

  constructor(data: BaulInviteLinkDto) {
    this.token = data.token;
    this.url = data.url;
    this.createdAt = data.createdAt;
  }
}

export class BaulInviteLinkPreview {
  baulId: string;
  name: string;
  description?: string;
  previewPhotos: string[];
  coverPhotoUrl?: string;
  personaAvatarUrls: string[];

  constructor(data: BaulInviteLinkPreviewDto) {
    this.baulId = data.baulId;
    this.name = data.name;
    this.description = data.description ?? undefined;
    this.previewPhotos = data.previewPhotos;
    this.coverPhotoUrl = data.coverPhotoUrl ?? undefined;
    this.personaAvatarUrls = data.personaAvatarUrls;
  }
}

export class ClaimablePersona {
  id: string;
  nickname: string;
  name?: string;
  avatarUrl?: string;

  constructor(data: ClaimablePersonaDto) {
    this.id = data.id;
    this.nickname = data.nickname;
    this.name = data.name ?? undefined;
    this.avatarUrl = data.avatarUrl ?? undefined;
  }
}

export class UserProfile {
  id: string;
  email: string;
  name?: string;
  photoUrl: string;
  weeklyDigestEnabled: boolean;
  hasSeenOnboarding: boolean;

  constructor(data: UserProfileDto) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name ?? undefined;
    this.photoUrl = '';
    this.weeklyDigestEnabled = data.weeklyDigestEnabled;
    this.hasSeenOnboarding = data.hasSeenOnboarding;
  }
}
