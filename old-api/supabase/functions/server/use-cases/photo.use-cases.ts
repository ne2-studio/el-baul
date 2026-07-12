import { IPhotoRepository } from "../repositories/photo.repository.ts";
import { IAlbumRepository } from "../repositories/album.repository.ts";
import { IBaulRepository } from "../repositories/baul.repository.ts";
import { IActivityRepository } from "../repositories/activity.repository.ts";
import { IFileStorage } from "../repositories/file-storage.interface.ts";
import { IRecuerdoRepository } from "../repositories/recuerdo.repository.ts";
import { IUserRepository } from "../repositories/user.repository.ts";
import { Recuerdo } from "../types.ts";

export class PhotoUseCases {
  constructor(
    private photoRepo: IPhotoRepository,
    private albumRepo: IAlbumRepository,
    private baulRepo: IBaulRepository,
    private activityRepo: IActivityRepository,
    private fileStorage: IFileStorage,
    private recuerdoRepo: IRecuerdoRepository,
    private userRepo: IUserRepository,
  ) {}

  async getSignedUrl(path: string): Promise<string> {
    return await this.fileStorage.getSignedUrl(path);
  }

  async uploadPhoto(
    userId: string,
    file: Uint8Array,
    fileName: string,
    contentType: string,
  ) {
    const bucketName = "el-baul-prod-photos";

    // Check if bucket exists
    const buckets = await this.fileStorage.listBuckets();
    const bucketExists = buckets.includes(bucketName);

    if (!bucketExists) {
      await this.fileStorage.createBucket(bucketName);
    }

    const filePath = `${userId}/${crypto.randomUUID()}-${fileName}`;
    await this.fileStorage.uploadFile(filePath, file, contentType);

    const signedUrl = await this.getSignedUrl(filePath);

    return {
      filePath,
      signedUrl,
    };
  }

  async getPhotosByAlbumId(userId: string, albumId: string) {
    const album = await this.albumRepo.getById(albumId);
    if (!album) throw new Error("Album not found");

    const baul = await this.baulRepo.getById(album.baulId);
    if (!baul) throw new Error("Baul not found");

    const hasAccess = baul.custodioId === userId ||
      await this.baulRepo.getUserSharedAccess(userId, album.baulId);

    if (!hasAccess) throw new Error("Access denied");

    const photos = await this.photoRepo.getByAlbumId(albumId);

    // Generate signed URLs for each photo
    const photosWithUrls = await Promise.all(photos.map(async (photo) => {
      if (photo.url && !photo.url.startsWith("http")) {
        photo.url = await this.getSignedUrl(photo.url);
      }
      return photo;
    }));

    return photosWithUrls;
  }

  async addPhoto(
    userId: string,
    albumId: string,
    storageUrl: string,
    caption?: string,
    date?: string,
  ) {
    const album = await this.albumRepo.getById(albumId);
    if (!album) throw new Error("Album not found");

    const baul = await this.baulRepo.getById(album.baulId);
    if (!baul) throw new Error("Baul not found");

    const isCustodio = baul.custodioId === userId;
    const sharedAccess = await this.baulRepo.getUserSharedAccess(
      userId,
      album.baulId,
    );
    const canEdit = isCustodio || (sharedAccess?.role === "colaborador");

    if (!canEdit) throw new Error("Access denied");

    const photoId = crypto.randomUUID();
    const now = new Date().toISOString();

    const photo = {
      id: photoId,
      albumId,
      baulId: album.baulId,
      url: storageUrl,
      caption,
      date: date || now,
      uploadedBy: userId,
      createdAt: now,
    };

    await this.photoRepo.create(photo);

    // Update album photo count
    album.photoCount = (album.photoCount || 0) + 1;
    if (!album.coverPhotoUrl) {
      album.coverPhotoUrl = storageUrl;
    }
    album.updatedAt = now;
    await this.albumRepo.update(album);

    // Update baul updated time
    baul.updatedAt = now;
    await this.baulRepo.update(baul);

    // Create activity
    await this.activityRepo.create({
      id: crypto.randomUUID(),
      type: "new-photos",
      baulId: album.baulId,
      baulName: baul.name,
      timestamp: now,
      isActionable: false,
      photoCount: 1,
    });

    return photo;
  }

  async getRecuerdosByPhotoId(userId: string, photoId: string) {
    const photo = await this.photoRepo.getById(photoId);
    if (!photo) throw new Error("Photo not found");

    const baul = await this.baulRepo.getById(photo.baulId);
    if (!baul) throw new Error("Baul not found");

    const hasAccess = baul.custodioId === userId ||
      await this.baulRepo.getUserSharedAccess(userId, photo.baulId);

    if (!hasAccess) throw new Error("Access denied");

    const recuerdos = await this.recuerdoRepo.getByPhotoId(photoId);

    return recuerdos.map((r) => ({
      ...r,
      isOwn: r.userId === userId,
    }));
  }

  async createRecuerdo(userId: string, photoId: string, text: string) {
    const photo = await this.photoRepo.getById(photoId);
    if (!photo) throw new Error("Photo not found");

    const baul = await this.baulRepo.getById(photo.baulId);
    if (!baul) throw new Error("Baul not found");

    const hasAccess = baul.custodioId === userId ||
      await this.baulRepo.getUserSharedAccess(userId, photo.baulId);

    if (!hasAccess) throw new Error("Access denied");

    const user = await this.userRepo.getById(userId);
    const userName = user?.name || "Usuario";

    const recuerdo: Recuerdo = {
      id: crypto.randomUUID(),
      photoId,
      userId,
      text,
      userName,
      createdAt: new Date().toISOString(),
      isOwn: true,
    };

    await this.recuerdoRepo.create(recuerdo);
    return recuerdo;
  }
}
