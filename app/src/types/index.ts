import { formatRelativeTime } from '@/utils/timeUtils';

export type BaulRole = 'custodio' | 'colaborador' | 'miembro';

export interface PhotoDate {
  year: number;
  month?: number;
  day?: number;
}

function photoDateFrom(year?: number, month?: number, day?: number): PhotoDate | undefined {
  if (!year) return undefined;
  return { year, month: month ?? undefined, day: day ?? undefined };
}

export class SharedUser {
  id: string;
  email: string;
  name?: string;
  status: 'active' | 'pending';
  role: BaulRole;
  invitedDate: string;

  constructor(data: any) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.status = data.status;
    this.role = data.role;
    this.invitedDate = formatRelativeTime(data.invitedDate);
  }
}

export class Baul {
  id: string;
  name: string;
  description?: string;
  albumCount: number;
  coverPhotoUrl?: string;
  lastUpdated: string;
  isCustodio?: boolean;
  role?: BaulRole;
  sharedCount?: number;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.albumCount = data.albumCount;
    this.coverPhotoUrl = data.coverPhotoUrl;
    this.lastUpdated = formatRelativeTime(data.updatedAt);
    this.isCustodio = data.isCustodio;
    this.role = data.role;
    this.sharedCount = data.sharedCount ?? 0;
  }
}

export class Album {
  id: string;
  name: string;
  description?: string;
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

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.photoCount = data.photoCount;
    this.coverPhotoUrl = data.coverPhotoUrl;
    this.featuredCoverPhotoUrl = data.featuredCoverPhotoUrl;
    this.lastUpdated = formatRelativeTime(data.updatedAt);
    this.recuerdoCount = data.recuerdoCount ?? 0;
    this.latestRecuerdoText = data.latestRecuerdoText;
    this.latestRecuerdoAuthor = data.latestRecuerdoAuthor;
    this.minDate = photoDateFrom(data.minDateYear, data.minDateMonth, data.minDateDay);
    this.maxDate = photoDateFrom(data.maxDateYear, data.maxDateMonth, data.maxDateDay);
    this.undatedPhotoCount = data.undatedPhotoCount ?? 0;
  }
}

export class Photo {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  caption?: string;
  date?: PhotoDate;
  recuerdoCount: number;

  constructor(data: any) {
    this.id = data.id;
    this.thumbnailUrl = data.thumbnailUrl;
    this.fullUrl = data.fullUrl;
    this.caption = data.caption;
    this.date = photoDateFrom(data.dateYear, data.dateMonth, data.dateDay);
    this.recuerdoCount = data.recuerdoCount ?? 0;
  }
}

export class Recuerdo {
  id: string;
  text: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  isOwn?: boolean;
  photoId?: string;
  photoThumbnailUrl?: string;

  constructor(data: any) {
    this.id = data.id;
    this.text = data.text;
    this.userName = data.userName;
    this.userAvatar = data.userAvatar;
    this.createdAt = data.createdAt;
    this.isOwn = data.isOwn;
    this.photoId = data.photoId ?? undefined;
    this.photoThumbnailUrl = data.photoThumbnailUrl ?? undefined;
  }
}

export class RemovalRequest {
  id: string;
  baulId: string;
  photoId: string;
  photoUrl: string;
  photoCaption?: string;
  requesterName: string;
  requesterEmail: string;
  reason: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';

  constructor(data: any) {
    this.id = data.id;
    this.baulId = data.baulId;
    this.photoId = data.photoId;
    this.photoUrl = data.photoUrl;
    this.photoCaption = data.photoCaption;
    this.requesterName = data.requesterName;
    this.requesterEmail = data.requesterEmail;
    this.reason = data.reason ?? '';
    this.requestDate = formatRelativeTime(data.requestDate);
    this.status = data.status;
  }
}

export class BaulPreview {
  id: string;
  name: string;
  description?: string;
  previewPhotos: string[];

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.previewPhotos = data.previewPhotos ?? [];
  }
}

export class UserProfile {
  id: string;
  email: string;
  name?: string;
  photoUrl: string;

  constructor(data: any) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.photoUrl = '';
  }
}

export type PlanType = 'gratuito' | 'familiar' | 'premium';

export interface Subscription {
  currentPlan: PlanType;
  baulesUsed: number;
  baulesLimit: number;
  storagePerBaulGB: number;
}
