import { formatRelativeTime } from '@/utils/timeUtils';
import type { components } from '@/api/generated/schema';

type ApiSchemas = components['schemas'];
type BaulDto = ApiSchemas['BaulDto'];
type BaulInviteLinkDto = ApiSchemas['BaulInviteLinkDto'];
type BaulInviteLinkPreviewDto = ApiSchemas['BaulInviteLinkPreviewDto'];
type ClaimablePersonaDto = ApiSchemas['ClaimablePersonaDto'];
type ChapterDto = ApiSchemas['ChapterDto'];
type ChatMessageDto = ApiSchemas['ChatMessageDto'];
type RawPersonaDto = ApiSchemas['PersonaDto'];
type PersonaDto = Omit<RawPersonaDto, 'avatarCropX' | 'avatarCropY' | 'avatarCropScale'> &
  Partial<Pick<RawPersonaDto, 'avatarCropX' | 'avatarCropY' | 'avatarCropScale'>>;
type PhotoDto = ApiSchemas['PhotoDto'];
type RecuerdoDto = ApiSchemas['RecuerdoDto'];
type PhotoBatchDto = ApiSchemas['PhotoBatchDto'];
type FeedItemDto = ApiSchemas['FeedItemDto'];
type RemovalRequestDto = ApiSchemas['RemovalRequestDto'];
type UserProfileDto = ApiSchemas['UserProfileDto'];

export type BaulRole = 'custodio' | 'administrador' | 'colaborador' | 'sin_acceso';

export type SupportCategory = 'Support' | 'Bug' | 'Suggestion' | 'BaulDeletion';

export interface PhotoDate {
  year: number;
  month?: number;
  day?: number;
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
    this.invitedDate = formatRelativeTime(data.invitedDate);
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
  lastUpdated: string;
  isCustodio?: boolean;
  role?: BaulRole;
  memberCount?: number;

  constructor(data: BaulDto) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description ?? undefined;
    this.chapterCount = data.chapterCount;
    this.coverPhotoUrl = data.coverPhotoUrl ?? undefined;
    this.lastUpdated = formatRelativeTime(data.updatedAt);
    this.isCustodio = data.isCustodio;
    this.role = data.role as BaulRole;
    this.memberCount = data.memberCount;
  }
}

export class Chapter {
  id: string;
  name: string;
  photoCount: number;
  coverPhotoUrl?: string;
  featuredCoverPhotoUrl?: string;
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
    this.lastUpdated = formatRelativeTime(data.updatedAt);
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

  constructor(data: PhotoDto) {
    this.id = data.id;
    this.thumbnailUrl = data.thumbnailUrl;
    this.fullUrl = data.fullUrl;
    this.date = photoDateFrom(data.dateYear, data.dateMonth, data.dateDay);
    this.recuerdoCount = data.recuerdoCount;
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

// One entry in the baúl feed — either a Recuerdo or a photo-upload batch, never both. Mirrors
// FeedItemDto's discriminated shape so callers can switch on `type` instead of checking which
// nested field is set.
export type FeedItem =
  | { type: 'recuerdo'; createdAt: string; recuerdo: Recuerdo }
  | { type: 'photo_batch'; createdAt: string; photoBatch: PhotoBatch };

export function feedItemFrom(data: FeedItemDto): FeedItem {
  if (data.type === 'photo_batch' && data.photoBatch) {
    return { type: 'photo_batch', createdAt: data.createdAt, photoBatch: new PhotoBatch(data.photoBatch) };
  }
  // Defaults to 'recuerdo' for any unrecognized type too, matching the backend's only two
  // real values — an unknown Type would otherwise have no Recuerdo to render.
  return { type: 'recuerdo', createdAt: data.createdAt, recuerdo: new Recuerdo(data.recuerdo!) };
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
    this.requestDate = formatRelativeTime(data.requestDate);
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

export type PlanType = 'gratuito' | 'familiar' | 'premium';

export interface Subscription {
  currentPlan: PlanType;
  baulesUsed: number;
  baulesLimit: number;
  storagePerBaulGB: number;
}
