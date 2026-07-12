export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Baul {
  id: string;
  name: string;
  description?: string;
  custodioId: string;
  albumCount: number;
  createdAt: string;
  updatedAt: string;
  isCustodio?: boolean;
  role?: string;
}

export interface Album {
  id: string;
  baulId: string;
  name: string;
  description?: string;
  photoCount: number;
  coverPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  albumId: string;
  baulId: string;
  url: string;
  caption?: string;
  date: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Recuerdo {
  id: string;
  photoId: string;
  userId: string;
  text: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  isOwn?: boolean;
}

export interface Activity {
  id: string;
  type:
    | "new-photos"
    | "role-changed"
    | "access-request"
    | "access-granted"
    | "photo-removal-request";
  baulId: string;
  baulName: string;
  timestamp: string;
  isActionable: boolean;
  photoCount?: number;
  requesterEmail?: string;
  accessRequestId?: string;
  removalRequestId?: string;
}

export interface SharedUser {
  id: string;
  userId?: string;
  email: string;
  name?: string;
  role: "miembro" | "colaborador" | "custodio";
  status: "pending" | "active";
  invitedDate: string;
  baulId: string;
}

export interface AccessRequest {
  id: string;
  email: string;
  name?: string;
  message?: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected";
  baulId: string;
}

export interface BaulPreview {
  id: string;
  name: string;
  description?: string;
  previewPhotos: string[];
}

export interface RemovalRequest {
  id: string;
  photoId: string;
  photoUrl: string;
  photoCaption?: string;
  requesterName: string;
  requesterEmail: string;
  reason?: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected";
  baulId: string;
}
