import { IPhotoRepository } from "../../repositories/photo.repository.ts";
import { Photo } from "../../types.ts";

export class FakePhotoRepository implements IPhotoRepository {
  private photos: Map<string, Photo> = new Map();

  getById(id: string): Promise<Photo | null> {
    return Promise.resolve(this.photos.get(id) || null);
  }

  getByAlbumId(albumId: string): Promise<Photo[]> {
    return Promise.resolve(
      Array.from(this.photos.values()).filter((p) => p.albumId === albumId),
    );
  }

  getPreviewPhotos(baulId: string, limit: number): Promise<Photo[]> {
    return Promise.resolve(
      Array.from(this.photos.values())
        .filter((p) => p.baulId === baulId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    );
  }

  create(photo: Photo): Promise<void> {
    this.photos.set(photo.id, photo);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.photos.delete(id);
    return Promise.resolve();
  }
}
