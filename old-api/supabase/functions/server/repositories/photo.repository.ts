import { Photo } from "../types.ts";

export interface IPhotoRepository {
  getById(id: string): Promise<Photo | null>;
  getByAlbumId(albumId: string): Promise<Photo[]>;
  getPreviewPhotos(baulId: string, limit: number): Promise<Photo[]>;
  create(photo: Photo): Promise<void>;
  delete(id: string): Promise<void>;
}
