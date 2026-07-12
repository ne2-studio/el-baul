import { IAlbumRepository } from "../repositories/album.repository.ts";
import { IBaulRepository } from "../repositories/baul.repository.ts";
import { IFileStorage } from "../repositories/file-storage.interface.ts";

export class AlbumUseCases {
  constructor(
    private albumRepo: IAlbumRepository,
    private baulRepo: IBaulRepository,
    private fileStorage: IFileStorage,
  ) {}

  async getSignedUrl(path: string): Promise<string> {
    return await this.fileStorage.getSignedUrl(path);
  }

  async getAlbumsByBaulId(userId: string, baulId: string) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");

    const hasAccess = baul.custodioId === userId ||
      await this.baulRepo.getUserSharedAccess(userId, baulId);

    if (!hasAccess) throw new Error("Access denied");

    const albums = await this.albumRepo.getByBaulId(baulId);

    // Generate signed URLs for each album cover
    const albumsWithUrls = await Promise.all(albums.map(async (album) => {
      if (album.coverPhotoUrl && !album.coverPhotoUrl.startsWith("http")) {
        album.coverPhotoUrl = await this.getSignedUrl(album.coverPhotoUrl);
      }
      return album;
    }));

    return albumsWithUrls;
  }

  async createAlbum(
    userId: string,
    baulId: string,
    name: string,
    description?: string,
  ) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");

    const isCustodio = baul.custodioId === userId;
    const sharedAccess = await this.baulRepo.getUserSharedAccess(
      userId,
      baulId,
    );
    const canEdit = isCustodio || (sharedAccess?.role === "colaborador");

    if (!canEdit) throw new Error("Access denied");

    const albumId = crypto.randomUUID();
    const now = new Date().toISOString();

    const album = {
      id: albumId,
      baulId,
      name,
      description,
      photoCount: 0,
      coverPhotoUrl: "",
      createdAt: now,
      updatedAt: now,
    };

    await this.albumRepo.create(album);

    // Update baul album count
    baul.albumCount = (baul.albumCount || 0) + 1;
    baul.updatedAt = now;
    await this.baulRepo.update(baul);

    return album;
  }
}
