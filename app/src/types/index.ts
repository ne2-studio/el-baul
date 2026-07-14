import { formatRelativeTime } from '@/utils/timeUtils';

export type BaulRole = 'custodio' | 'colaborador' | 'miembro';

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

export class AccessRequest {
  id: string;
  email: string;
  name?: string;
  message?: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';

  constructor(data: any) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.message = data.message;
    this.requestDate = formatRelativeTime(data.requestDate);
    this.status = data.status;
  }
}

export class Baul {
  id: string;
  name: string;
  description?: string;
  albumCount: number;
  lastUpdated: string;
  isCustodio?: boolean;
  sharedCount?: number;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.albumCount = data.albumCount;
    this.lastUpdated = formatRelativeTime(data.updatedAt);
    this.isCustodio = data.isCustodio;
    this.sharedCount = data.sharedCount ?? 0;
  }
}

export class Album {
  id: string;
  name: string;
  description?: string;
  photoCount: number;
  coverPhotoUrl?: string;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.photoCount = data.photoCount;
    this.coverPhotoUrl = data.coverPhotoUrl;
  }
}

export class Photo {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  caption?: string;
  date?: string;

  constructor(data: any) {
    this.id = data.id;
    this.thumbnailUrl = data.thumbnailUrl;
    this.fullUrl = data.fullUrl;
    this.caption = data.caption;
    this.date = data.date;
  }
}

export class Recuerdo {
  id: string;
  text: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  isOwn?: boolean;

  constructor(data: any) {
    this.id = data.id;
    this.text = data.text;
    this.userName = data.userName;
    this.userAvatar = data.userAvatar;
    this.createdAt = data.createdAt;
    this.isOwn = data.isOwn;
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

// Kept structurally compatible with the local ActivityItem type ActivityCenter.tsx
// declares for itself (the real, backend-accurate one — the type strings match the
// backend's ActivityType enum, kebab-cased).
export class Activity {
  id: string;
  type: 'photo-removal-request' | 'access-request' | 'new-photos' | 'access-granted' | 'role-changed';
  baulId: string;
  baulName: string;
  timestamp: string;
  isActionable: boolean;
  requesterEmail?: string;
  photoCount?: number;
  accessRequestId?: string;
  removalRequestId?: string;

  constructor(data: any) {
    this.id = data.id;
    this.type = data.type;
    this.baulId = data.baulId;
    this.baulName = data.baulName;
    this.timestamp = data.timestamp;
    this.isActionable = data.isActionable;
    this.requesterEmail = data.requesterEmail;
    this.photoCount = data.photoCount;
    this.accessRequestId = data.accessRequestId;
    this.removalRequestId = data.removalRequestId;
  }
}

export type PlanType = 'gratuito' | 'familiar' | 'premium';

export interface Subscription {
  currentPlan: PlanType;
  baulesUsed: number;
  baulesLimit: number;
  storagePerBaulGB: number;
}
