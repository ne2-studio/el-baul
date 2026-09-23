import { Capacitor, registerPlugin } from '@capacitor/core';
import type { GalleryPhoto, PhotoDate } from '@/types';

// "En este dispositivo" — Android-only (see docs/architecture/native-android.md): the device's
// photo library is a native MediaStore concept, and this app only ships an Android build (iOS
// is out of scope for this slice, same reasoning as isPushNotificationsSupported). Gated on both
// isNativePlatform() and the platform name, not just plugin availability, for the same reason
// isPushNotificationsSupported is: a stale iOS build that happened to have this plugin
// registered shouldn't attempt it too.
export function isDevicePhotosSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export interface DevicePhotoDto {
  id: string;
  /** Absolute file:// path to a cached, already-downsized thumbnail — never the original full
   * resolution asset. Feed it through Capacitor.convertFileSrc() before use in an <img src>,
   * same convention as ShareReceiver's SharedFile.path (see features/sharing/useCases). */
  uri: string;
  /** Epoch milliseconds — MediaStore's DATE_TAKEN (falls back to DATE_ADDED when a photo has no
   * EXIF capture date), never a full EXIF extraction — see DevicePhotosPlugin.java. */
  takenAt: number;
  width: number;
  height: number;
}

interface GetPhotosResult {
  photos: DevicePhotoDto[];
  /** Opaque — pass back verbatim as the next call's cursor. Absent once there's nothing left. */
  nextCursor?: string;
}

export interface DeviceAlbumDto {
  /** MediaStore's BUCKET_ID — the folder a photo's file lives in, not an El Baúl concept. */
  albumId: string;
  displayName: string;
  count: number;
  /** Same cached-thumbnail convention as DevicePhotoDto.uri — its most recently taken photo. */
  coverPhotoUri: string;
}

interface GetAlbumsResult {
  albums: DeviceAlbumDto[];
}

export interface DeletePhotosResult {
  /** Whether the Android system's own consent dialog (unavoidable, see DevicePhotosPlugin.java's
   * deletePhotos — the app's ConfirmActionModal shown before calling this is a separate, earlier
   * confirmation) was granted. False on API 30+ means nothing was deleted (that path is
   * all-or-nothing); on the pre-30 fallback it means the chain stopped at the first denied item,
   * so `deletedIds` may still be non-empty for ids processed before that point. */
  granted: boolean;
  /** Ids actually removed from MediaStore — always check this rather than assuming `granted`
   * implies every requested id was deleted. */
  deletedIds: string[];
}

interface DevicePhotosPlugin {
  checkPermissions(): Promise<{ granted: boolean }>;
  requestPermissions(): Promise<{ granted: boolean }>;
  getPhotos(options: { cursor?: string; limit: number; albumId?: string }): Promise<GetPhotosResult>;
  getAlbums(): Promise<GetAlbumsResult>;
  /** Batch-capable from the start (GitHub issue #86's own single-photo "···" menu always passes
   * one id; #88's multi-select batch delete reuses this same method verbatim) — see
   * DevicePhotosPlugin.java's deletePhotos for what happens on each Android version. */
  deletePhotos(options: { ids: string[] }): Promise<DeletePhotosResult>;
}

export const DevicePhotos = registerPlugin<DevicePhotosPlugin>('DevicePhotos');

function dateFromTakenAt(takenAtMs: number): PhotoDate | undefined {
  if (!takenAtMs) return undefined;
  const d = new Date(takenAtMs);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

// "En este dispositivo"'s own GalleryPhoto — a read-only projection of a MediaStore row, not a
// domain entity (see this feature's top-of-file boundary note in EnEsteDispositivoRoute.tsx).
// thumbnailUrl and fullUrl deliberately point at the exact same cached file: the native side
// only ever decodes one grid-sized thumbnail per photo (see DevicePhotosPlugin.java), so opening
// PhotoViewer on a device photo shows that same thumbnail rather than fetching the full-
// resolution original — acceptable for this validation slice, which never claims to be a
// pixel-perfect viewer.
export class DevicePhoto implements GalleryPhoto {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  date?: PhotoDate;
  width: number;
  height: number;

  constructor(data: DevicePhotoDto) {
    this.id = data.id;
    this.thumbnailUrl = Capacitor.convertFileSrc(data.uri);
    this.fullUrl = this.thumbnailUrl;
    this.date = dateFromTakenAt(data.takenAt);
    this.width = data.width;
    this.height = data.height;
  }
}

// One MediaStore folder/bucket — the "carpetas" view a user sees before drilling into
// DevicePhoto results scoped to albumId (see getPhotos' albumId option above).
export class DeviceAlbum {
  albumId: string;
  displayName: string;
  count: number;
  coverImageUrl: string;

  constructor(data: DeviceAlbumDto) {
    this.albumId = data.albumId;
    this.displayName = data.displayName;
    this.count = data.count;
    this.coverImageUrl = Capacitor.convertFileSrc(data.coverPhotoUri);
  }
}
