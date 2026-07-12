export type BaulRole = 'custodio' | 'colaborador' | 'miembro';

export interface SharedUser {
  id: string;
  email: string;
  name?: string;
  status: 'active' | 'pending';
  role: BaulRole;
  invitedDate: string;
}

export interface AccessRequest {
  id: string;
  email: string;
  name?: string;
  message?: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Baul {
  id: string;
  name: string;
  description?: string;
  albumCount: number;
  lastUpdated: string;
  isCustodio?: boolean;
  sharedCount?: number;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  photoCount: number;
  coverPhotoUrl?: string;
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
  date?: string;
}

export interface Recuerdo {
  id: string;
  text: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  isOwn?: boolean;
}

export interface RemovalRequest {
  id: string;
  baulId: string;
  photoId: string;
  photoUrl: string;
  photoCaption?: string;
  requestedBy: string;
  reason: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type PlanType = 'gratuito' | 'familiar' | 'premium';

export interface Subscription {
  currentPlan: PlanType;
  baulesUsed: number;
  baulesLimit: number;
  storagePerBaulGB: number;
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'comment' | 'shared' | 'access_request' | 'removal_request';
  user: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  isActionable?: boolean;
  baulId?: string;
}

export interface BaulPreview {
  id: string;
  name: string;
  description?: string;
  previewPhotos: string[];
}
